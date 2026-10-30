namespace NegarAzinFadak.Application.Identity;

/// <summary>
/// Audit action codes of the central identity administration use cases.
/// </summary>
/// <remarks>
/// Written down once, for the same reason <c>TenantAuditActions</c> is: an audit trail whose action names
/// are improvised at each call site cannot be filtered afterwards, and a trail nobody can query is not an
/// audit trail. Identity data is the most sensitive thing the platform holds, so it is read as well as
/// written — an administrator reading a person's national identity number is an event with an actor, a
/// time and a subject, and a reviewer investigating a suspected misuse needs to find it.
/// </remarks>
public static class IdentityAuditActions
{
    public const string UserRegister = "identity.user.register";
    public const string UserList = "identity.user.list";
    public const string UserRead = "identity.user.read";
    public const string UserSetDisplayName = "identity.user.set_display_name";
    public const string UserActivate = "identity.user.activate";
    public const string UserSuspend = "identity.user.suspend";
    public const string UserReactivate = "identity.user.reactivate";
    public const string UserClose = "identity.user.close";
    public const string UserGrantRole = "identity.user.role_grant";
    public const string UserRevokeRole = "identity.user.role_revoke";
}
