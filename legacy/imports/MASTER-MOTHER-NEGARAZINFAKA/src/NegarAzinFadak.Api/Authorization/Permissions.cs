namespace NegarAzinFadak.Api.Authorization;

/// <summary>
/// The platform's well-known permission codes.
/// </summary>
/// <remarks>
/// Permission codes are data, not behaviour: they are resolved against the role table at authorization
/// time and a tenant may define its own. These constants exist so the codes the platform itself relies on
/// are written down in one place rather than scattered as string literals across endpoints, where a typo
/// would silently deny access.
/// <para>
/// Authorization fails closed. A permission code that is misspelled is rejected, not granted, so adding a
/// code here is only ever needed for readability, never for correctness.
/// </para>
/// </remarks>
public static class Permissions
{
    /// <summary>Read the caller's own identity record.</summary>
    public const string IdentitySelfRead = "identity.self.read";

    /// <summary>Read any identity record within the caller's scope.</summary>
    public const string IdentityRead = "identity.user.read";

    /// <summary>Create identity records within the caller's scope.</summary>
    public const string IdentityWrite = "identity.user.write";

    /// <summary>Verify an identity document belonging to another identity.</summary>
    public const string IdentityVerify = "identity.document.verify";

    /// <summary>Read private documents. Access is audited and authorised per request.</summary>
    public const string DocumentRead = "identity.document.read";

    /// <summary>Upload and replace identity documents.</summary>
    public const string DocumentWrite = "identity.document.write";

    /// <summary>Administer roles, permissions and tenants inside the caller's scope.</summary>
    public const string PlatformAdminister = "platform.access.administer";

    /// <summary>Read the organizational hierarchy.</summary>
    public const string OrganizationRead = "organization.unit.read";

    /// <summary>Create, rename, activate, suspend and close organizational units.</summary>
    public const string OrganizationWrite = "organization.unit.write";

    /// <summary>Read the roles of the caller's tenant.</summary>
    public const string RoleRead = "authorization.role.read";

    /// <summary>Define, rename, retire and reactivate roles, and change their grants.</summary>
    public const string RoleWrite = "authorization.role.write";

    /// <summary>Read the platform-wide permission catalog.</summary>
    public const string PermissionCatalogRead = "authorization.permission.read";

    /// <summary>Publish the permission catalog declared in configuration.</summary>
    public const string PermissionCatalogPublish = "authorization.permission.publish";

    /// <summary>Read a tenant's configuration document.</summary>
    public const string TenantConfigurationRead = "tenant.configuration.read";

    /// <summary>Change a tenant's configuration.</summary>
    public const string TenantConfigurationWrite = "tenant.configuration.write";

    /// <summary>Read the audit trail of the caller's tenant.</summary>
    public const string AuditRead = "platform.audit.read";

    /// <summary>
    /// Read the whole navigation structure, including sections the caller's own roles do not open.
    /// </summary>
    /// <remarks>
    /// The effective navigation a caller may see needs no permission of its own — it is filtered by the
    /// permissions they already hold, and a section nobody may open is a section nobody receives. Reading
    /// the <em>whole</em> structure does, because it answers the question an administrator is actually
    /// asking: which section is missing, and which one can no one reach.
    /// </remarks>
    public const string MenuRead = "navigation.menu.read";

    /// <summary>Create, change, move and withdraw menus and their sections.</summary>
    public const string MenuWrite = "navigation.menu.write";

    /// <summary>Publish the configured base navigation structure into the caller's own menu.</summary>
    public const string MenuPublish = "navigation.menu.publish";
}
