using Microsoft.Extensions.Options;
using NegarAzinFadak.Api.Configuration;
using NegarAzinFadak.Application.Identity;
using NegarAzinFadak.Application.Options;
using NegarAzinFadak.Application.Tenancy;
using NegarAzinFadak.Core;
using NegarAzinFadak.Core.Primitives;
using NegarAzinFadak.Core.Results;
using NegarAzinFadak.Core.Security;
using NegarAzinFadak.Core.Tenancy;
using NegarAzinFadak.Core.Time;
using NegarAzinFadak.Identity.Domain.Users;
using NegarAzinFadak.Organization.Domain.Roles;

namespace NegarAzinFadak.Api.Configuration;

/// <summary>
/// Creates the first development administrator, so that a developer can obtain a legitimate access token
/// and reach every permission-gated endpoint the platform really serves.
/// </summary>
/// <remarks>
/// <para>
/// <b>Why this is needed.</b> Tenant provisioning requires <c>platform.access.administer</c>. An empty
/// database therefore has no way to reach its own first permission: there is no user, so no user can hold
/// the permission, so no user can create a tenant. A bootstrap is the only honest resolution, and it must
/// create a real identity with a real hash and a real role — anything less would be a back door, and a back
/// door is how a platform ends up with an endpoint that skips authorization.
/// </para>
/// <para>
/// <b>Why it is safe.</b> It is registered only when the host environment is Development, and it checks
/// that again before doing anything, so neither a misconfigured value nor a wrong deployment can reach it.
/// The password is supplied by configuration, is never defaulted in source, and is never logged: the logs
/// say whether one was present, never what it was. Production has no code path here at all, which is why
/// this cannot be a production seeding feature by accident.
/// </para>
/// <para>
/// <b>Why it is idempotent.</b> Everything is keyed on natural identifiers — the mobile number for the
/// identity, the organization code for the tenant, the role code for the grant — and each is looked up
/// before it is created. Restarting the host, running the bootstrap twice, or recovering from a run that
/// failed after provisioning converges on the same state instead of creating a second tenant, a second
/// administrator or a duplicate grant. Determinism matters here for the same reason: a developer who
/// restarts the API must still be able to sign in with the credentials they were given.
/// </para>
/// <para>
/// <b>What it will not do.</b> It does not bypass the permission catalog, mint a token, or grant a
/// permission the configured role template does not already declare. The administrator receives exactly the
/// permissions the deployment declared for <c>tenant_admin</c>, through the same RBAC path an operator
/// would use.
/// </para>
/// </remarks>
internal sealed class DevelopmentAdministratorInitializer(
    IServiceScopeFactory scopeFactory,
    IHostEnvironment environment,
    IOptions<DevelopmentBootstrapOptions> options,
    ILogger<DevelopmentAdministratorInitializer> logger) : IHostedService
{
    private readonly IServiceScopeFactory _scopeFactory = Guard.AgainstNull(scopeFactory);
    private readonly IHostEnvironment _environment = Guard.AgainstNull(environment);
    private readonly DevelopmentBootstrapOptions _options = Guard.AgainstNull(options).Value;
    private readonly ILogger<DevelopmentAdministratorInitializer> _logger = Guard.AgainstNull(logger);

    /// <inheritdoc />
    public async Task StartAsync(CancellationToken cancellationToken)
    {
        // Belt and braces. The service is only registered for Development, and this refuses to act in any
        // other environment even if that registration is ever changed by mistake.
        if (!_environment.IsDevelopment())
        {
            return;
        }

        if (!_options.Enabled)
        {
            _logger.LogInformation(
                "Development bootstrap is disabled by '{Section}:Enabled'.",
                DevelopmentBootstrapOptions.SectionName);
            return;
        }

        if (!TryReadCredentials(out var mobile, out var password))
        {
            return;
        }

        await using var scope = _scopeFactory.CreateAsyncScope();
        var provider = scope.ServiceProvider;

        var signInDirectory = provider.GetRequiredService<IIdentitySignInDirectory>();
        var organizations = provider.GetRequiredService<IOrganizationDirectory>();
        var provisioning = provider.GetRequiredService<TenantProvisioningService>();
        var hasher = provider.GetRequiredService<IPasswordHasher>();
        var unitOfWork = provider.GetRequiredService<Core.Persistence.IUnitOfWork>();
        var roles = provider.GetRequiredService<IRoleDirectory>();
        var clock = provider.GetRequiredService<IClock>();
        var signInOptions = provider.GetRequiredService<IOptions<SignInOptions>>().Value;

        var organizationCode = _options.OrganizationCode.Trim();
        var organization = await organizations
            .FindOrganizationByCodeAsync(organizationCode, cancellationToken)
            .ConfigureAwait(false);

        if (organization is null)
        {
            var provisioned = await provisioning
                .ProvisionAsync(
                    new ProvisionTenantCommand(
                        organizationCode,
                        _options.OrganizationName.Trim(),
                        null,
                        _options.CurrencyCode.Trim(),
                        null,
                        null),
                    cancellationToken)
                .ConfigureAwait(false);

            if (provisioned.IsFailure)
            {
                _logger.LogError(
                    "Development bootstrap could not provision tenant '{Code}': {ReasonCode}.",
                    organizationCode,
                    provisioned.FirstError.Code);
                return;
            }

            organization = await organizations
                .FindOrganizationByCodeAsync(organizationCode, cancellationToken)
                .ConfigureAwait(false);

            if (organization is null)
            {
                _logger.LogError(
                    "Development bootstrap provisioned tenant '{Code}' but could not read it back.",
                    organizationCode);
                return;
            }
        }

        var scopeOfTenant = new TenantScope(organization.Id);
        var existing = await signInDirectory
            .FindByMobileAsync(mobile.Value, cancellationToken)
            .ConfigureAwait(false);

        if (existing is not null)
        {
            await EnsureRoleAsync(existing, scopeOfTenant, roles, unitOfWork, cancellationToken).ConfigureAwait(false);

            _logger.LogInformation(
                "Development administrator already exists in tenant '{Code}'; bootstrap made no changes.",
                organizationCode);
            return;
        }

        var administrator = User.Register(
            Guid.NewGuid(),
            scopeOfTenant,
            mobile,
            UserSource.OperatorAssisted);

        var named = administrator.SetDisplayName(_options.AdministratorDisplayName);
        if (named.IsFailure)
        {
            _logger.LogError(
                "Development bootstrap could not name the administrator: {ReasonCode}.",
                named.FirstError.Code);
            return;
        }


        var credential = administrator.SetPassword(hasher.Hash(password));
        if (credential.IsFailure)
        {
            _logger.LogError(
                "Development bootstrap could not set the administrator credential: {ReasonCode}.",
                credential.FirstError.Code);
            return;
        }

        var activation = administrator.ActivateByOperator(clock.UtcNow, organization.Id);
        if (activation.IsFailure)
        {
            _logger.LogError(
                "Development bootstrap could not activate the administrator: {ReasonCode}.",
                activation.FirstError.Code);
            return;
        }

        var granted = await EnsureRoleAsync(administrator, scopeOfTenant, roles, unitOfWork, cancellationToken)
            .ConfigureAwait(false);

        if (granted is false)
        {
            return;
        }

        provider.GetRequiredService<Core.Persistence.IRepository<User>>().Add(administrator);
        await unitOfWork.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        // The mobile number is logged because it is an account identifier the developer must be able to type,
        // and it is already known to anyone holding the database. The password never is.
        _logger.LogInformation(
            "Development administrator created in tenant '{Code}' for mobile {Mobile}, holding role '{Role}'. "
            + "Sign in at POST /api/v1/auth/token with the password from "
            + "'DevelopmentBootstrap:AdministratorPassword' (policy minimum {Minimum} characters).",
            organizationCode,
            mobile.Masked,
            _options.AdministratorRoleCode.Trim(),
            signInOptions.MinimumPasswordLength);
    }

    /// <inheritdoc />
    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;

    /// <summary>
    /// Validates the configured bootstrap inputs without ever putting the password in a message.
    /// </summary>
    private bool TryReadCredentials(out MobileNumber mobile, out string password)
    {
        mobile = null!;
        password = string.Empty;

        if (string.IsNullOrWhiteSpace(_options.AdministratorPassword))
        {
            _logger.LogWarning(
                "Development bootstrap skipped: '{Section}:AdministratorPassword' is not configured. "
                + "Set it through user-secrets or the environment to create the first administrator. "
                + "No password is defaulted in source.",
                DevelopmentBootstrapOptions.SectionName);
            return false;
        }

        if (!MobileNumber.TryCreate(_options.AdministratorMobile, out var parsed, out _))
        {
            _logger.LogError(
                "Development bootstrap skipped: '{Section}:AdministratorMobile' is not a valid E.164 mobile number.",
                DevelopmentBootstrapOptions.SectionName);
            return false;
        }

        var signInOptions = new SignInOptions();
        var minimum = signInOptions.MinimumPasswordLength;

        if (_options.AdministratorPassword.Length < minimum)
        {
            // The length is reported because it is a property of the input, not a disclosure of the value.
            _logger.LogError(
                "Development bootstrap skipped: '{Section}:AdministratorPassword' is {Actual} characters, "
                + "below the {Minimum}-character policy. The value is not logged.",
                DevelopmentBootstrapOptions.SectionName,
                _options.AdministratorPassword.Length,
                minimum);
            return false;
        }

        mobile = parsed!;
        password = _options.AdministratorPassword;
        return true;
    }

    /// <summary>
    /// Grants the configured role when the identity does not already hold it, so a rerun after a partial
    /// failure completes the grant instead of reporting a conflict.
    /// </summary>
    private async Task<bool> EnsureRoleAsync(
        User user,
        TenantScope scopeOfTenant,
        IRoleDirectory roles,
        Core.Persistence.IUnitOfWork unitOfWork,
        CancellationToken cancellationToken)
    {
        var roleCode = _options.AdministratorRoleCode.Trim();

        if (user.HasRole(roleCode))
        {
            return true;
        }

        var role = await roles.FindByCodeAsync(scopeOfTenant, roleCode, cancellationToken).ConfigureAwait(false);
        if (role is null || !role.IsActive)
        {
            _logger.LogError(
                "Development bootstrap cannot grant role '{RoleCode}': it is not defined in the configured role "
                + "templates. Add it to '{Section}:RoleTemplates' or set "
                + "'DevelopmentBootstrap:AdministratorRoleCode' to a role that exists.",
                roleCode,
                PlatformAuthorizationOptions.SectionName);
            return false;
        }

        var granted = user.GrantRole(role.Code, scopeOfTenant);
        if (granted.IsFailure)
        {
            _logger.LogError(
                "Development bootstrap could not grant role '{RoleCode}': {ReasonCode}.",
                roleCode,
                granted.FirstError.Code);
            return false;
        }

        await unitOfWork.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return true;
    }
}
