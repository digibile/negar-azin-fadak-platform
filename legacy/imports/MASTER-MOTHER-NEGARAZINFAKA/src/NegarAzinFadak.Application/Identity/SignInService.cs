using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using NegarAzinFadak.Application.Options;
using NegarAzinFadak.Core;
using NegarAzinFadak.Core.Persistence;
using NegarAzinFadak.Core.Primitives;
using NegarAzinFadak.Core.Results;
using NegarAzinFadak.Core.Security;
using NegarAzinFadak.Core.Tenancy;
using NegarAzinFadak.Core.Time;
using NegarAzinFadak.Identity.Domain;
using NegarAzinFadak.Identity.Domain.Users;

namespace NegarAzinFadak.Application.Identity;

/// <summary>What a caller submits to sign in.</summary>
/// <param name="Mobile">Anchor mobile number of the central identity, in E.164 form.</param>
/// <param name="Password">Plain password, verified against the stored hash and never persisted.</param>
/// <remarks>
/// The platform identifies a person by mobile number and has no username concept, so the mobile number is
/// the account identifier here too. Inventing a username column would add a second identifier for one
/// identity, which is precisely the ambiguity the central-identity rule exists to prevent.
/// </remarks>
public sealed record SignInCommand(string Mobile, string Password);

/// <summary>
/// A verified caller, resolved from the real RBAC graph. Minting the access token is the HTTP host's job;
/// this is the use case that decides who the caller is.
/// </summary>
/// <param name="UserId">Central identity identifier.</param>
/// <param name="Scope">Organizational coordinates the session acts in.</param>
/// <param name="Roles">Role codes currently held and not revoked.</param>
/// <param name="Permissions">Effective permission codes, resolved through those roles.</param>
/// <param name="DisplayName">Display name for the session, never a credential.</param>
/// <param name="LastLoginAt">When the identity last signed in successfully.</param>
public sealed record SignedInIdentity(
    Guid UserId,
    TenantScope Scope,
    IReadOnlyCollection<string> Roles,
    IReadOnlyCollection<string> Permissions,
    string DisplayName,
    DateTimeOffset? LastLoginAt);

/// <summary>
/// Authenticates a caller with a password and resolves the permissions their roles actually grant.
/// </summary>
/// <remarks>
/// <para>
/// This is the sign-in use case that <c>JwtAccessTokenIssuer</c> refers to: it is the only place where an
/// identity, a credential and an access token meet. It resolves nothing the caller asserts — the mobile
/// number identifies the identity, the role assignments on the identity decide the roles, and the grants
/// on those roles decide the permissions. There is no request field that names a role or a permission.
/// </para>
/// <para>
/// An unknown mobile number and a wrong password produce the same error, so the endpoint cannot be used to
/// enumerate which mobile numbers are registered. The distinction is kept in the log, where an operator
/// investigating a lockout needs it, and kept out of the response, where an attacker would.
/// </para>
/// <para>
/// Every attempt, successful or not, is recorded. A successful sign-in resets the failure counter, and
/// reaching the configured threshold suspends the identity through the aggregate rather than through a
/// counter kept beside it.
/// </para>
/// </remarks>
public sealed class SignInService
{
    private readonly IIdentitySignInDirectory _directory;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IClock _clock;
    private readonly SignInOptions _options;
    private readonly ILogger<SignInService> _logger;

    public SignInService(
        IIdentitySignInDirectory directory,
        IPasswordHasher passwordHasher,
        IUnitOfWork unitOfWork,
        IClock clock,
        IOptions<SignInOptions> options,
        ILogger<SignInService> logger)
    {
        _directory = Guard.AgainstNull(directory);
        _passwordHasher = Guard.AgainstNull(passwordHasher);
        _unitOfWork = Guard.AgainstNull(unitOfWork);
        _clock = Guard.AgainstNull(clock);
        _options = Guard.AgainstNull(options).Value;
        _logger = Guard.AgainstNull(logger);
    }

    /// <summary>Verifies a credential and resolves the caller's effective permissions.</summary>
    public async Task<Result<SignedInIdentity>> SignInAsync(
        SignInCommand command,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(command);

        if (string.IsNullOrWhiteSpace(command.Mobile) || string.IsNullOrWhiteSpace(command.Password))
        {
            return Result<SignedInIdentity>.Failure(IdentityErrors.SignInCredentialsRequired);
        }

        if (!MobileNumber.TryCreate(command.Mobile.Trim(), out var mobile, out _))
        {
            // Malformed input is answered as a wrong credential rather than a validation error, because
            // "that is not a mobile number" and "no such mobile number" would otherwise be two different
            // ways of learning what is registered.
            return Result<SignedInIdentity>.Failure(IdentityErrors.SignInInvalidCredentials);
        }

        var user = await _directory.FindByMobileAsync(mobile!.Value, cancellationToken).ConfigureAwait(false);
        if (user is null)
        {
            _logger.LogWarning("Sign-in failed for an unregistered mobile number.");
            return Result<SignedInIdentity>.Failure(IdentityErrors.SignInInvalidCredentials);
        }

        var verified = user.VerifyPassword(command.Password, _passwordHasher);

        if (verified.IsFailure)
        {
            await ApplyLockoutAsync(user, verified.FirstError, cancellationToken).ConfigureAwait(false);
            return Result<SignedInIdentity>.Failure(IdentityErrors.SignInInvalidCredentials);
        }

        var roles = await ResolveRolesAsync(user, cancellationToken).ConfigureAwait(false);
        var permissions = roles
            .SelectMany(role => role.EffectivePermissions())
            .Distinct(StringComparer.Ordinal)
            .OrderBy(code => code, StringComparer.Ordinal)
            .ToArray();

        // The failed counter and the successful sign-in are written here rather than inside the aggregate,
        // so a rejected sign-in is still recorded even though no session is produced.
        await _unitOfWork.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        _logger.LogInformation(
            "Identity {UserId} signed in with {RoleCount} role(s) and {PermissionCount} permission(s).",
            user.Id,
            roles.Count,
            permissions.Length);

        return Result<SignedInIdentity>.Success(new SignedInIdentity(
            user.Id,
            user.Scope,
            roles.Select(role => role.Code).ToArray(),
            permissions,
            user.DisplayName,
            user.LastLoginAt));
    }

    /// <summary>
    /// Suspends the identity once it has failed the configured number of times in a row.
    /// </summary>
    /// <remarks>
    /// Lockout is applied through <see cref="User.Suspend"/> so the state that blocks sign-in is the same
    /// state an operator sees and reverses. Doing it here rather than in the aggregate is deliberate: the
    /// threshold is deployment policy, and the aggregate must not read configuration.
    /// </remarks>
    private async Task ApplyLockoutAsync(
        User user,
        Error reason,
        CancellationToken cancellationToken)
    {
        _logger.LogWarning(
            "Sign-in failed for identity {UserId}: {ReasonCode}. Consecutive failures: {Failures}.",
            user.Id,
            reason.Code,
            user.FailedLoginAttempts);

        if (user.FailedLoginAttempts < _options.MaxFailedAttempts)
        {
            await _unitOfWork.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
            return;
        }

        var suspension = user.Suspend($"locked after {user.FailedLoginAttempts} failed sign-in attempts");
        if (suspension.IsFailure)
        {
            _logger.LogWarning(
                "Identity {UserId} could not be locked out: {ReasonCode}.",
                user.Id,
                suspension.FirstError.Code);
        }
        else
        {
            _logger.LogWarning("Identity {UserId} suspended after repeated failed sign-in attempts.", user.Id);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
    }

    /// <summary>
    /// Resolves the roles an identity actually holds: the assignment must not be revoked, the role must
    /// still exist, and it must be the role of the very scope the assignment names.
    /// </summary>
    /// <remarks>
    /// A revoked assignment, a role that was deleted and a role belonging to another tenant are all
    /// skipped rather than trusted, because the assignment records what was granted at the time and the
    /// role table records what is still true now. A permission is only ever included when the role
    /// currently grants it, so retiring a role or revoking a grant takes effect on the next sign-in
    /// instead of persisting inside an already-issued token.
    /// </remarks>
    private async Task<IReadOnlyList<Organization.Domain.Roles.Role>> ResolveRolesAsync(
        User user,
        CancellationToken cancellationToken)
    {
        if (user.Scope.IsEmpty)
        {
            _logger.LogWarning("Identity {UserId} has no organizational scope and holds no effective roles.", user.Id);
            return [];
        }

        var assignments = user.Roles
            .Where(assignment => !assignment.IsRevoked)
            .ToArray();

        if (assignments.Length is 0)
        {
            return [];
        }

        var roles = await _directory.ListOrganizationRolesAsync(user.Scope, cancellationToken).ConfigureAwait(false);

        return
        [
            .. assignments
                .Select(assignment => roles.FirstOrDefault(role =>
                    string.Equals(role.Code, assignment.RoleCode, StringComparison.OrdinalIgnoreCase)
                    && role.Scope == assignment.Scope))
                .Where(role => role is not null && role.IsActive)
                .Select(role => role!)
                .GroupBy(role => role.Id)
                .Select(group => group.First())
        ];
    }
}
