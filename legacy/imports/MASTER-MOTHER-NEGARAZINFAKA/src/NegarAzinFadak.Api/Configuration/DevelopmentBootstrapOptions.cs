namespace NegarAzinFadak.Api.Configuration;

/// <summary>
/// Settings for the development administrator bootstrap, bound from the <c>DevelopmentBootstrap</c>
/// configuration section.
/// </summary>
/// <remarks>
/// <para>
/// The bootstrap exists because the platform is genuinely unusable until one identity can authenticate and
/// hold <c>platform.access.administer</c>, and tenant provisioning requires exactly that permission. There
/// is no first user, so this is the only honest way to create one.
/// </para>
/// <para>
/// Nothing here is a production setting. The section is read only when the environment is Development, and
/// the hosted service is registered only there, so the mechanism cannot be reached by misconfiguring a
/// value — only by choosing the Development environment.
/// </para>
/// </remarks>
internal sealed class DevelopmentBootstrapOptions
{
    /// <summary>Configuration section name.</summary>
    internal const string SectionName = "DevelopmentBootstrap";

    /// <summary>Set to false to skip the bootstrap even in Development.</summary>
    public bool Enabled { get; set; } = true;

    /// <summary>Code of the organization to provision for the developer.</summary>
    public string OrganizationCode { get; set; } = "platform-dev";

    /// <summary>Display name of that organization.</summary>
    public string OrganizationName { get; set; } = "Platform Development";

    /// <summary>ISO 4217 currency of the development tenant.</summary>
    public string CurrencyCode { get; set; } = "IRR";

    /// <summary>
    /// Mobile number of the bootstrap administrator, in E.164 form. It is the account identifier the
    /// platform signs in with, so it is configuration rather than a constant.
    /// </summary>
    public string AdministratorMobile { get; set; } = string.Empty;

    /// <summary>Display name of the bootstrap administrator.</summary>
    public string AdministratorDisplayName { get; set; } = "Platform Administrator";

    /// <summary>
    /// Password for the bootstrap administrator, supplied through user-secrets or the environment.
    /// </summary>
    /// <remarks>
    /// Never committed and never logged. The bootstrap logs whether a password was present, never its value,
    /// and refuses to invent one: a default password in source would be a published credential for any
    /// deployment that enabled Development.
    /// </remarks>
    public string? AdministratorPassword { get; set; }

    /// <summary>Role the administrator is granted, taken from the configured role templates.</summary>
    public string AdministratorRoleCode { get; set; } = "tenant_admin";
}
