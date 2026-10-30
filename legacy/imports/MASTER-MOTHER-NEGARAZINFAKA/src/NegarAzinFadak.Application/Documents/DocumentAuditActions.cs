namespace NegarAzinFadak.Application.Documents;

/// <summary>
/// Audit action codes of the document, document-type and folder use cases.
/// </summary>
/// <remarks>
/// Written down once, for the same reason <c>IdentityAuditActions</c> is: a trail whose action names are
/// improvised at each call site cannot be filtered afterwards. Document access carries its own weight here.
/// A document is a scanned national identity card, so downloading one is an event with an actor and a
/// subject even when nothing changed, and <c>identity.document.download</c> is the line a compliance
/// reviewer searches for when they need to know who opened a person's passport.
/// </remarks>
public static class DocumentAuditActions
{
    public const string TypeList = "identity.document.type_list";
    public const string TypeRead = "identity.document.type_read";
    public const string TypeDefine = "identity.document.type_define";
    public const string TypeActivate = "identity.document.type_activate";
    public const string TypeDeactivate = "identity.document.type_deactivate";

    public const string List = "identity.document.list";
    public const string Read = "identity.document.read";
    public const string Attach = "identity.document.attach";
    public const string AddPage = "identity.document.add_page";
    public const string SetValidity = "identity.document.set_validity";
    public const string CreateLink = "identity.document.create_link";
    public const string Download = "identity.document.download";

    public const string FolderRead = "identity.folder.read";
    public const string FolderEnsure = "identity.folder.ensure";
    public const string FolderAddEntry = "identity.folder.add_entry";
    public const string FolderApproveEntry = "identity.folder.approve_entry";
    public const string FolderRejectEntry = "identity.folder.reject_entry";
}