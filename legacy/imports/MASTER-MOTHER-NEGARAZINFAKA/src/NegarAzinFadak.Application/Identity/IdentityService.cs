using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using NegarAzinFadak.Application.Auditing;
using NegarAzinFadak.Application.Options;
using NegarAzinFadak.Application.Tenancy;
using NegarAzinFadak.Core;
using NegarAzinFadak.Core.Paging;
using NegarAzinFadak.Core.Persistence;
using NegarAzinFadak.Core.Primitives;
using NegarAzinFadak.Core.Results;
using NegarAzinFadak.Core.Security;
using NegarAzinFadak.Core.Tenancy;
using NegarAzinFadak.Core.Time;
using NegarAzinFadak.Identity.Domain;
using NegarAzinFadak.Identity.Domain.Users;
using NegarAzinFadak.Organization.Domain.Roles;

namespace NegarAzinFadak.Application.Identity;

/// <summary>What an operator submits to create a central identity on someone's behalf.</summary>
/// <param name="Mobile">Anchor mobile number of the person, in any accepted spelling.</param>
/// <param name="DisplayName">Name shown before the master profile is complete.</param>
/// <param name="Password">
/// Optional password credential. Left null, the identity signs in by one-time code only, which is the
/// normal state for a person who registered on their own phone.
/// </param>
/// <param name="PreferredLocale">BCP-47 locale of the person's interface; defaults to Persian.</param>
public sealed record RegisterIdentityCommand(
    string Mobile,
    string DisplayName,
    string? Password = null,
    string? PreferredLocale = null);

/// <summary>One row of the identity directory.</summary>
/// <param name="Id">Identifier of the identity.</param>
/// <param name="DisplayName">Name shown in list contexts.</param>
/// <param name="FullName">Confirmed profile name, or an empty string while the profile is incomplete.</param>
/// <param name="MobileMasked">Anchor mobile number, masked. A directory is a screen, not a contact list.</param>
/// <param name="Status">Lifecycle status of the identity.</param>
/// <param name="Source">How the identity entered the platform.</param>
/// <param name="VerificationStatus">State of the master identity profile.</param>
/// <param name="IsIdentityVerified">True when strong identity verification completed.</param>
/// <param name="HasPasswordCredential">Whether the identity can sign in with a password.</param>
/// <param name="RoleCount">How many role assignments are currently in force.</param>
/// <param name="CreatedAt">When the identity was registered.</param>
/// <param name="LastLoginAt">When the identity last signed in, or null if it never has.</param>
public sealed record IdentitySummary(
    Guid Id,
    string DisplayName,
    string FullName,
    string MobileMasked,
    UserStatus Status,
    UserSource Source,
    IdentityVerificationStatus VerificationStatus,
    bool IsIdentityVerified,
    bool HasPasswordCredential,
    int RoleCount,
    DateTimeOffset CreatedAt,
    DateTimeOffset? LastLoginAt)
{
    /// <summary>Projects an identity onto a directory row.</summary>
    public static IdentitySummary From(User user)
    {
        ArgumentNullException.ThrowIfNull(user);

        return new IdentitySummary(
            user.Id,
            user.DisplayName,
            user.Profile?.FullName ?? string.Empty,
            user.Mobile.Masked,
            user.Status,
            user.Source,
            user.Profile?.VerificationStatus ?? IdentityVerificationStatus.Unverified,
            user.IsIdentityVerified,
            user.HasPasswordCredential,
            user.Roles.Count(assignment => !assignment.IsRevoked),
            user.CreatedAt,
            user.LastLoginAt);
    }
}

/// <summary>A role assignment held by an identity, as an administrator sees it.</summary>
/// <param name="RoleCode">Code of the role, resolved against the tenant's own role table.</param>
/// <param name="IsRevoked">Whether the assignment has been withdrawn.</param>
/// <param name="GrantedAt">When it was granted.</param>
/// <param name="RevokedAt">When it was withdrawn, or null while it is in force.</param>
public sealed record IdentityRoleGrant(string RoleCode, bool IsRevoked, DateTimeOffset GrantedAt, DateTimeOffset? RevokedAt);

/// <summary>A contact point on the identity.</summary>
/// <param name="Kind">Whether it is a mobile number, an email address or another channel.</param>
/// <param name="Value">The contact value. Only returned for the detail read, never for the list.</param>
/// <param name="IsPrimary">Whether it is the identity's preferred channel of this kind.</param>
/// <param name="VerifiedAt">When the platform proved the caller owns it, or null.</param>
public sealed record IdentityContact(ContactKind Kind, string Value, bool IsPrimary, DateTimeOffset? VerifiedAt);

/// <summary>A postal address on the identity.</summary>
public sealed record IdentityAddress(
    AddressKind Kind,
    string CountryCode,
    string? Province,
    string? City,
    string? PostalCode,
    string? Line1,
    string? Line2);

/// <summary>Provenance of one identity attribute, so a reader knows whether a value is trusted.</summary>
/// <param name="Field">Which attribute.</param>
/// <param name="Provenance">How the current value got there.</param>
public sealed record IdentityFieldProvenance(string Field, string Provenance);

/// <summary>The master identity profile, with the provenance of every field that has a value.</summary>
/// <remarks>
/// Provenance travels with the data on purpose. A review screen that shows a name without showing whether
/// it came from OCR, from the user, or from a reviewer cannot do its job, and the whole point of storing
/// provenance next to the value is that a reader has to be given it.
/// </remarks>
public sealed record IdentityProfileView(
    string? FirstName,
    string? LastName,
    string? FatherName,
    string? MotherName,
    string? NationalId,
    string? DateOfBirth,
    string Gender,
    string? PlaceOfBirth,
    string? Occupation,
    string? NationalityCode,
    string VerificationStatus,
    bool IsComplete,
    bool HasConfirmedCoreFields,
    DateTimeOffset? VerifiedAt,
    string? VerificationMethod,
    IReadOnlyList<IdentityFieldProvenance> Fields)
{
    /// <summary>Projects the master profile onto the wire shape.</summary>
    public static IdentityProfileView From(IdentityProfile profile)
    {
        ArgumentNullException.ThrowIfNull(profile);

        var fields = Enum.GetValues<IdentityField>()
            .Select(field => new IdentityFieldProvenance(field.ToString(), profile.GetProvenance(field).ToString()))
            .ToArray();

        return new IdentityProfileView(
            profile.FirstName,
            profile.LastName,
            profile.FatherName,
            profile.MotherName,
            profile.NationalId?.Value,
            profile.DateOfBirth?.ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture),
            profile.Gender.ToString(),
            profile.PlaceOfBirth,
            profile.Occupation,
            profile.NationalityCode,
            profile.VerificationStatus.ToString(),
            profile.IsComplete,
            profile.HasConfirmedCoreFields,
            profile.VerifiedAt,
            profile.VerificationMethod,
            fields);
    }
}

/// <summary>The full record of one central identity, for the detail screen.</summary>
/// <param name="Id">Identifier of the identity.</param>
/// <param name="DisplayName">Name shown before the master profile is complete.</param>
/// <param name="Mobile">The anchor mobile number in full. Returned here and not in the directory row.</param>
/// <param name="MobileMasked">The same number, masked, for contexts that must not carry it in full.</param>
/// <param name="Status">Lifecycle status of the identity.</param>
/// <param name="Source">How the identity entered the platform.</param>
/// <param name="PreferredLocale">BCP-47 locale of the person's interface.</param>
/// <param name="HasPasswordCredential">Whether the identity can sign in with a password as well as by code.</param>
/// <param name="IsIdentityVerified">True when strong identity verification completed.</param>
/// <param name="IdentityVerifiedAt">When strong verification completed, or null.</param>
/// <param name="MobileVerifiedAt">When ownership of the anchor mobile number was proven, or null.</param>
/// <param name="LastLoginAt">When the identity last signed in, or null if it never has.</param>
/// <param name="FailedLoginAttempts">Consecutive failed sign-in attempts since the last success.</param>
/// <param name="CreatedAt">When the identity was registered.</param>
/// <param name="ModifiedAt">When the record was last changed, or null.</param>
/// <param name="Profile">The master identity profile with per-field provenance, never null for a real identity.</param>
/// <param name="Roles">Role assignments on this identity, revoked ones included as history.</param>
/// <param name="Contacts">Contact points, in the order the identity declared them.</param>
/// <param name="Addresses">Postal addresses attached to the identity.</param>
/// <remarks>
/// The distinction between this and <see cref="IdentitySummary"/> is deliberate. A list of forty people is
/// the shape of data that ends up in a screenshot, a printed report or a support ticket, and a masked number
/// identifies a person to the operator who needs to recognise them without publishing their contact
/// details. The detail screen is opened deliberately by someone acting on one specific person, and an
/// operator who cannot read the number they are calling cannot do the job. The permission that reaches this
/// record is therefore the sensitive one, and the list is not a way around it: it carries no more.
/// </remarks>
public sealed record IdentityDetails(
    Guid Id,
    string DisplayName,
    string Mobile,
    string MobileMasked,
    UserStatus Status,
    UserSource Source,
    string PreferredLocale,
    bool HasPasswordCredential,
    bool IsIdentityVerified,
    DateTimeOffset? IdentityVerifiedAt,
    DateTimeOffset? MobileVerifiedAt,
    DateTimeOffset? LastLoginAt,
    int FailedLoginAttempts,
    DateTimeOffset CreatedAt,
    DateTimeOffset? ModifiedAt,
    IdentityProfileView? Profile,
    IReadOnlyList<IdentityRoleGrant> Roles,
    IReadOnlyList<IdentityContact> Contacts,
    IReadOnlyList<IdentityAddress> Addresses)
{
    /// <summary>Projects an identity and everything hanging off it onto the wire shape.</summary>
    public static IdentityDetails From(User user)
    {
        ArgumentNullException.ThrowIfNull(user);

        return new IdentityDetails(
            user.Id,
            user.DisplayName,
            user.Mobile.Value,
            user.Mobile.Masked,
            user.Status,
            user.Source,
            user.PreferredLocale,
            user.HasPasswordCredential,
            user.IsIdentityVerified,
            user.IdentityVerifiedAt,
            user.MobileVerifiedAt,
            user.LastLoginAt,
            user.FailedLoginAttempts,
            user.CreatedAt,
            user.ModifiedAt,
            user.Profile is null ? null : IdentityProfileView.From(user.Profile),
            [.. user.Roles.Select(assignment => new IdentityRoleGrant(
                assignment.RoleCode,
                assignment.IsRevoked,
                assignment.GrantedAt,
                assignment.RevokedAt))],
            [.. user.Contacts.Select(contact => new IdentityContact(
                contact.Kind,
                contact.Value,
                contact.IsPrimary,
                contact.VerifiedAt))],
            [.. user.Addresses.Select(address => new IdentityAddress(
                address.Kind,
                address.CountryCode,
                address.Province,
                address.City,
                address.PostalCode,
                address.Line1,
                address.Line2))]);
    }
}

/// <summary>What creating a central identity produced.</summary>
/// <param name="Identity">The new identity, in the same shape the detail read returns.</param>
public sealed record IdentityRegistration(IdentityDetails Identity);

/// <summary>
/// Administering the central identity registry inside one tenant.
/// </summary>
/// <remarks>
/// <para>
/// This is the use case that makes the identity sections of the platform's menu reachable. Until it
/// existed, the <c>User</c> aggregate was persisted, verified and signed in with, but no operator could
/// list, read, create or suspend an identity — the registry could be filled by registration flows and
/// nothing else, and an administrator had no way to answer "who is in my tenant".
/// </para>
/// <para>
/// Every read takes its tenant from the ambient principal and passes it to the directory explicitly. There
/// is no method parameter that names a tenant, so no request body, route or query string can widen the
/// scope, and an identity belonging to another organization is reported as not found rather than returned
/// with a 403 that would confirm it exists.
/// </para>
/// <para>
/// Reads are audited as well as writes. Identity data is the platform's most sensitive content, so who
/// looked at which person is itself a fact an auditor must be able to find. A read therefore commits one
/// audit line, which is one row per request rather than one row per identity, so the trail stays
/// queryable instead of drowning.
/// </para>
/// </remarks>
public sealed class IdentityService
{
    private readonly IIdentityDirectory _directory;
    private readonly IRepository<User> _users;
    private readonly IRoleDirectory _roles;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IUnitOfWork _unitOfWork;
    private readonly AuditTrailWriter _audit;
    private readonly IClock _clock;
    private readonly SignInOptions _signIn;
    private readonly ILogger<IdentityService> _logger;

    public IdentityService(
        IIdentityDirectory directory,
        IRepository<User> users,
        IRoleDirectory roles,
        IPasswordHasher passwordHasher,
        IUnitOfWork unitOfWork,
        AuditTrailWriter audit,
        IClock clock,
        IOptions<SignInOptions> signIn,
        ILogger<IdentityService> logger)
    {
        _directory = Guard.AgainstNull(directory);
        _users = Guard.AgainstNull(users);
        _roles = Guard.AgainstNull(roles);
        _passwordHasher = Guard.AgainstNull(passwordHasher);
        _unitOfWork = Guard.AgainstNull(unitOfWork);
        _audit = Guard.AgainstNull(audit);
        _clock = Guard.AgainstNull(clock);
        _signIn = Guard.AgainstNull(signIn).Value;
        _logger = Guard.AgainstNull(logger);
    }

    /// <summary>One page of the caller's tenant, narrowed by the requested filters.</summary>
    public async Task<Result<PagedResult<IdentitySummary>>> SearchAsync(
        IdentityQuery query,
        PageRequest page,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(query);
        ArgumentNullException.ThrowIfNull(page);

        var scope = _audit.Scope;
        if (scope.IsEmpty)
        {
            return Result<PagedResult<IdentitySummary>>.Failure(IdentityErrors.OutsideTenant);
        }

        var found = await _directory.ListAsync(scope, query, page, cancellationToken).ConfigureAwait(false);
        var projected = found.Map(IdentitySummary.From);

        await _audit.RecordSuccessAsync(
            IdentityAuditActions.UserList,
            ResourceTypes.IdentityUser,
            "directory",
            new Dictionary<string, string?>
            {
                ["returned"] = projected.Count.ToString(System.Globalization.CultureInfo.InvariantCulture),
                ["total"] = projected.TotalCount.ToString(System.Globalization.CultureInfo.InvariantCulture),
                ["filtered"] = (!query.IsUnfiltered).ToString(System.Globalization.CultureInfo.InvariantCulture)
            },
            cancellationToken).ConfigureAwait(false);

        // A read that only ever appended an audit line would leave that line in the change tracker until
        // something else saved it, and the record of an administrator looking at an identity would be lost
        // exactly when the request that motivated it succeeded.
        await _unitOfWork.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        return Result<PagedResult<IdentitySummary>>.Success(projected);
    }

    /// <summary>Reads one identity of the caller's tenant in full.</summary>
    public async Task<Result<IdentityDetails>> ReadAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var loaded = await LoadAsync(userId, cancellationToken).ConfigureAwait(false);
        if (loaded.IsFailure)
        {
            return Result<IdentityDetails>.Failure(loaded.FirstError);
        }

        await _audit.RecordSuccessAsync(
            IdentityAuditActions.UserRead,
            ResourceTypes.IdentityUser,
            userId.ToString(),
            cancellationToken: cancellationToken).ConfigureAwait(false);
        await _unitOfWork.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        return Result<IdentityDetails>.Success(IdentityDetails.From(loaded.Value));
    }

    /// <summary>
    /// Creates a central identity for someone who cannot complete self-registration, and activates it.
    /// </summary>
    /// <remarks>
    /// The whole operation is one transaction: the identity, its audit line and its first role grant either
    /// all exist or none do. A half-registered operator account is worse than none, because the next
    /// attempt sees a mobile number already taken and reports a conflict the caller cannot explain.
    /// </remarks>
    public async Task<Result<IdentityRegistration>> RegisterAsync(
        RegisterIdentityCommand command,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(command);

        var scope = _audit.Scope;
        if (scope.IsEmpty)
        {
            return Result<IdentityRegistration>.Failure(IdentityErrors.OutsideTenant);
        }

        // The aggregate refuses an operator action with no operator behind it, because the activation
        // records who confirmed ownership of the number. Refusing it here means the refusal is a problem
        // document naming the real cause rather than a 422 from inside the aggregate.
        if (_audit.ActorId is not { } operatorId)
        {
            return await _audit.AuditDenialAsync(
                IdentityAuditActions.UserRegister,
                ResourceTypes.IdentityUser,
                "new",
                Result<IdentityRegistration>.Failure(IdentityErrors.OperatorRequired),
                cancellationToken: cancellationToken).ConfigureAwait(false);
        }

        if (!MobileNumber.TryCreate(command.Mobile, out var mobile, out var mobileError))
        {
            return await _audit.AuditDenialAsync(
                IdentityAuditActions.UserRegister,
                ResourceTypes.IdentityUser,
                "new",
                Result<IdentityRegistration>.Failure(IdentityErrors.MobileInvalid(mobileError)),
                cancellationToken: cancellationToken).ConfigureAwait(false);
        }

        // Checked here rather than left to the unique index on the mobile column, for the same reason role
        // definitions are checked before they are written: a repeated registration is an expected outcome,
        // and the caller has to be told in the platform's vocabulary instead of receiving a 500 from the
        // database. The check is cross-tenant, so the refusal deliberately does not say whose identity it
        // is — that question is answered by an operator who already holds the identity, not by a 409.
        if (await _directory.MobileExistsAsync(mobile!.Value, cancellationToken).ConfigureAwait(false))
        {
            _logger.LogInformation(
                "Registration refused for mobile {Mobile}: the number is already registered in the central registry.",
                mobile.Masked);

            return await _audit.AuditDenialAsync(
                IdentityAuditActions.UserRegister,
                ResourceTypes.IdentityUser,
                "new",
                Result<IdentityRegistration>.Failure(IdentityErrors.DuplicateMergeRequired),
                cancellationToken: cancellationToken).ConfigureAwait(false);
        }

        if (!string.IsNullOrWhiteSpace(command.Password) && command.Password.Length < _signIn.MinimumPasswordLength)
        {
            // Reported as a property of the submitted input. The length policy is configuration, so this
            // use case is not the place to restate a number as a constant.
            return await _audit.AuditDenialAsync(
                IdentityAuditActions.UserRegister,
                ResourceTypes.IdentityUser,
                "new",
                Result<IdentityRegistration>.Failure(IdentityErrors.CredentialTooWeak(
                    $"A password must be at least {_signIn.MinimumPasswordLength} characters.")),
                cancellationToken: cancellationToken).ConfigureAwait(false);
        }

        // Nothing is attached to the change tracker before this point, so every refusal above committed
        // only its audit line and can never flush a half-built identity alongside it.
        var identity = User.Register(Guid.NewGuid(), scope, mobile!, UserSource.OperatorAssisted, command.PreferredLocale);

        var named = identity.SetDisplayName(command.DisplayName);
        if (named.IsFailure)
        {
            return await _audit.AuditDenialAsync(
                IdentityAuditActions.UserRegister,
                ResourceTypes.IdentityUser,
                identity.Id.ToString(),
                Result<IdentityRegistration>.Failure(named.FirstError),
                cancellationToken: cancellationToken).ConfigureAwait(false);
        }

        if (!string.IsNullOrWhiteSpace(command.Password))
        {
            // The plain password goes to the hasher and nowhere else. It is not an audit attribute, not a
            // log field, and not part of any view this use case returns.
            var credential = identity.SetPassword(_passwordHasher.Hash(command.Password));
            if (credential.IsFailure)
            {
                return await _audit.AuditDenialAsync(
                    IdentityAuditActions.UserRegister,
                    ResourceTypes.IdentityUser,
                    identity.Id.ToString(),
                    Result<IdentityRegistration>.Failure(credential.FirstError),
                    cancellationToken: cancellationToken).ConfigureAwait(false);
            }
        }

        var activated = identity.ActivateByOperator(_clock.UtcNow, operatorId);
        if (activated.IsFailure)
        {
            return await _audit.AuditDenialAsync(
                IdentityAuditActions.UserRegister,
                ResourceTypes.IdentityUser,
                identity.Id.ToString(),
                Result<IdentityRegistration>.Failure(activated.FirstError),
                cancellationToken: cancellationToken).ConfigureAwait(false);
        }

        _users.Add(identity);

        await _audit.RecordSuccessAsync(
            IdentityAuditActions.UserRegister,
            ResourceTypes.IdentityUser,
            identity.Id.ToString(),
            new Dictionary<string, string?>
            {
                ["source"] = identity.Source.ToString(),
                ["hasPasswordCredential"] = identity.HasPasswordCredential.ToString()
            },
            cancellationToken).ConfigureAwait(false);
        await _unitOfWork.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        _logger.LogInformation(
            "Central identity {UserId} created by operator {OperatorId} in organization {OrganizationId}.",
            identity.Id,
            operatorId,
            scope.OrganizationId);

        return Result<IdentityRegistration>.Success(new IdentityRegistration(IdentityDetails.From(identity)));
    }

    /// <summary>Sets the display name shown before the master profile is complete.</summary>
    public async Task<Result> SetDisplayNameAsync(
        Guid userId,
        string displayName,
        CancellationToken cancellationToken = default)
    {
        var loaded = await LoadTrackedAsync(userId, cancellationToken).ConfigureAwait(false);
        if (loaded.IsFailure)
        {
            return Result.Failure(loaded.FirstError);
        }

        var renamed = loaded.Value.SetDisplayName(displayName);
        if (renamed.IsFailure)
        {
            return await _audit.AuditDenialAsync(
                IdentityAuditActions.UserSetDisplayName, ResourceTypes.IdentityUser, userId.ToString(), renamed,
                cancellationToken: cancellationToken).ConfigureAwait(false);
        }

        return await CommitAsync(
            IdentityAuditActions.UserSetDisplayName, userId, cancellationToken: cancellationToken).ConfigureAwait(false);
    }

    /// <summary>Activates an identity an operator provisioned, once ownership of the number is proven.</summary>
    public async Task<Result> ActivateAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var loaded = await LoadTrackedAsync(userId, cancellationToken).ConfigureAwait(false);
        if (loaded.IsFailure)
        {
            return Result.Failure(loaded.FirstError);
        }

        if (_audit.ActorId is not { } operatorId)
        {
            return await _audit.AuditDenialAsync(
                IdentityAuditActions.UserActivate, ResourceTypes.IdentityUser, userId.ToString(),
                Result.Failure(IdentityErrors.OperatorRequired),
                cancellationToken: cancellationToken).ConfigureAwait(false);
        }

        var identity = loaded.Value;
        var previous = identity.Status;
        var activated = identity.ActivateByOperator(_clock.UtcNow, operatorId);
        if (activated.IsFailure)
        {
            return await _audit.AuditDenialAsync(
                IdentityAuditActions.UserActivate, ResourceTypes.IdentityUser, userId.ToString(), activated,
                cancellationToken: cancellationToken).ConfigureAwait(false);
        }

        return await CommitAsync(
            IdentityAuditActions.UserActivate,
            userId,
            new Dictionary<string, string?> { ["from"] = previous.ToString(), ["to"] = identity.Status.ToString() },
            cancellationToken).ConfigureAwait(false);
    }

    /// <summary>Suspends the identity. The reason is required, because an unexplained hold is indistinguishable from a defect.</summary>
    public async Task<Result> SuspendAsync(
        Guid userId,
        string reason,
        CancellationToken cancellationToken = default)
    {
        var loaded = await LoadTrackedAsync(userId, cancellationToken).ConfigureAwait(false);
        if (loaded.IsFailure)
        {
            return Result.Failure(loaded.FirstError);
        }

        var trimmed = (reason ?? string.Empty).Trim();
        if (trimmed.Length is 0)
        {
            return await _audit.AuditDenialAsync(
                IdentityAuditActions.UserSuspend, ResourceTypes.IdentityUser, userId.ToString(),
                Result.Failure(IdentityErrors.SuspensionReasonRequired),
                cancellationToken: cancellationToken).ConfigureAwait(false);
        }

        var identity = loaded.Value;
        var previous = identity.Status;
        var suspended = identity.Suspend(trimmed);
        if (suspended.IsFailure)
        {
            return await _audit.AuditDenialAsync(
                IdentityAuditActions.UserSuspend, ResourceTypes.IdentityUser, userId.ToString(), suspended,
                cancellationToken: cancellationToken).ConfigureAwait(false);
        }

        return await CommitAsync(
            IdentityAuditActions.UserSuspend,
            userId,
            new Dictionary<string, string?> { ["from"] = previous.ToString(), ["reason"] = trimmed },
            cancellationToken).ConfigureAwait(false);
    }

    /// <summary>Restores a suspended identity, re-granting no role automatically.</summary>
    public async Task<Result> ReactivateAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var loaded = await LoadTrackedAsync(userId, cancellationToken).ConfigureAwait(false);
        if (loaded.IsFailure)
        {
            return Result.Failure(loaded.FirstError);
        }

        var identity = loaded.Value;
        var previous = identity.Status;
        var reactivated = identity.Reactivate();
        if (reactivated.IsFailure)
        {
            return await _audit.AuditDenialAsync(
                IdentityAuditActions.UserReactivate, ResourceTypes.IdentityUser, userId.ToString(), reactivated,
                cancellationToken: cancellationToken).ConfigureAwait(false);
        }

        return await CommitAsync(
            IdentityAuditActions.UserReactivate,
            userId,
            new Dictionary<string, string?> { ["from"] = previous.ToString(), ["to"] = identity.Status.ToString() },
            cancellationToken).ConfigureAwait(false);
    }

    /// <summary>Closes the identity. The record and its documents are retained for legal obligations.</summary>
    public async Task<Result> CloseAsync(
        Guid userId,
        string? reason,
        CancellationToken cancellationToken = default)
    {
        var loaded = await LoadTrackedAsync(userId, cancellationToken).ConfigureAwait(false);
        if (loaded.IsFailure)
        {
            return Result.Failure(loaded.FirstError);
        }

        var identity = loaded.Value;
        var previous = identity.Status;
        var closed = identity.Close(reason);
        if (closed.IsFailure)
        {
            return await _audit.AuditDenialAsync(
                IdentityAuditActions.UserClose, ResourceTypes.IdentityUser, userId.ToString(), closed,
                cancellationToken: cancellationToken).ConfigureAwait(false);
        }

        // The aggregate revokes every role as part of closing, so the trail has to say so: otherwise the
        // grants a reviewer can no longer see look like they were never made.
        return await CommitAsync(
            IdentityAuditActions.UserClose,
            userId,
            new Dictionary<string, string?>
            {
                ["from"] = previous.ToString(),
                ["rolesRevoked"] = identity.Roles.Count(assignment => !assignment.IsRevoked)
                    .ToString(System.Globalization.CultureInfo.InvariantCulture)
            },
            cancellationToken).ConfigureAwait(false);
    }

    /// <summary>Grants one of the caller's tenant's roles to an identity.</summary>
    public async Task<Result> GrantRoleAsync(
        Guid userId,
        string roleCode,
        CancellationToken cancellationToken = default)
    {
        var loaded = await LoadTrackedAsync(userId, cancellationToken).ConfigureAwait(false);
        if (loaded.IsFailure)
        {
            return Result.Failure(loaded.FirstError);
        }

        var code = (roleCode ?? string.Empty).Trim();
        if (code.Length is 0)
        {
            return await _audit.AuditDenialAsync(
                IdentityAuditActions.UserGrantRole, ResourceTypes.IdentityUser, userId.ToString(),
                Result.Failure(AuthorizationErrors.PermissionCodeInvalid),
                cancellationToken: cancellationToken).ConfigureAwait(false);
        }

        // The role is resolved against the tenant's own table and must be assignable. Granting a code that
        // no role defines would produce an identity that holds a role and therefore no permissions at all,
        // which reads in the UI as a broken account rather than as a bad grant.
        var role = await _roles.FindByCodeAsync(_audit.Scope, code, cancellationToken).ConfigureAwait(false);
        if (role is null)
        {
            return await _audit.AuditDenialAsync(
                IdentityAuditActions.UserGrantRole, ResourceTypes.IdentityUser, userId.ToString(),
                Result.Failure(AuthorizationErrors.RoleNotFound(code)),
                cancellationToken: cancellationToken).ConfigureAwait(false);
        }

        if (!role.IsActive)
        {
            return await _audit.AuditDenialAsync(
                IdentityAuditActions.UserGrantRole, ResourceTypes.IdentityUser, userId.ToString(),
                Result.Failure(AuthorizationErrors.NotAssignable),
                cancellationToken: cancellationToken).ConfigureAwait(false);
        }

        var granted = loaded.Value.GrantRole(role.Code, _audit.Scope, _clock.UtcNow);
        if (granted.IsFailure)
        {
            return await _audit.AuditDenialAsync(
                IdentityAuditActions.UserGrantRole, ResourceTypes.IdentityUser, userId.ToString(), granted,
                cancellationToken: cancellationToken).ConfigureAwait(false);
        }

        return await CommitAsync(
            IdentityAuditActions.UserGrantRole,
            userId,
            new Dictionary<string, string?> { ["role"] = role.Code },
            cancellationToken).ConfigureAwait(false);
    }

    /// <summary>Withdraws a role from an identity. The assignment is kept as history rather than deleted.</summary>
    public async Task<Result> RevokeRoleAsync(
        Guid userId,
        string roleCode,
        CancellationToken cancellationToken = default)
    {
        var loaded = await LoadTrackedAsync(userId, cancellationToken).ConfigureAwait(false);
        if (loaded.IsFailure)
        {
            return Result.Failure(loaded.FirstError);
        }

        var code = (roleCode ?? string.Empty).Trim();
        var revoked = loaded.Value.RevokeRole(code, _audit.Scope, _clock.UtcNow);
        if (revoked.IsFailure)
        {
            return await _audit.AuditDenialAsync(
                IdentityAuditActions.UserRevokeRole, ResourceTypes.IdentityUser, userId.ToString(), revoked,
                cancellationToken: cancellationToken).ConfigureAwait(false);
        }

        return await CommitAsync(
            IdentityAuditActions.UserRevokeRole,
            userId,
            new Dictionary<string, string?> { ["role"] = code },
            cancellationToken).ConfigureAwait(false);
    }

    /// <summary>
    /// Loads an identity of the caller's tenant for reading, or reports that it is not there.
    /// </summary>
    /// <remarks>
    /// The not-found answer covers an identity of another organization as well. Distinguishing the two
    /// would turn a 404 into an oracle: a caller who could tell "no such person" from "not yours" could
    /// probe for the existence of identities in tenants they do not administer.
    /// </remarks>
    private async Task<Result<User>> LoadAsync(Guid userId, CancellationToken cancellationToken)
    {
        var scope = _audit.Scope;
        if (scope.IsEmpty)
        {
            return Result<User>.Failure(IdentityErrors.OutsideTenant);
        }

        var user = await _directory.FindByIdAsync(scope, userId, cancellationToken).ConfigureAwait(false);
        return user is null
            ? Result<User>.Failure(IdentityErrors.UserNotFound())
            : Result<User>.Success(user);
    }

    private async Task<Result<User>> LoadTrackedAsync(Guid userId, CancellationToken cancellationToken)
    {
        var scope = _audit.Scope;
        if (scope.IsEmpty)
        {
            return Result<User>.Failure(IdentityErrors.OutsideTenant);
        }

        var user = await _directory.FindTrackedByIdAsync(scope, userId, cancellationToken).ConfigureAwait(false);
        return user is null
            ? Result<User>.Failure(IdentityErrors.UserNotFound())
            : Result<User>.Success(user);
    }

    /// <summary>Records the successful change and commits it with the change it describes.</summary>
    private async Task<Result> CommitAsync(
        string action,
        Guid userId,
        IReadOnlyDictionary<string, string?>? attributes = null,
        CancellationToken cancellationToken = default)
    {
        await _audit.RecordSuccessAsync(
            action,
            ResourceTypes.IdentityUser,
            userId.ToString(),
            attributes,
            cancellationToken).ConfigureAwait(false);
        await _unitOfWork.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return Result.Success();
    }
}
