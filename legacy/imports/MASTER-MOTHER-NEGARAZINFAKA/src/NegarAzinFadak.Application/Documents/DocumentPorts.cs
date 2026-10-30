using NegarAzinFadak.Core.Paging;
using NegarAzinFadak.Core.Tenancy;
using NegarAzinFadak.Identity.Domain.Documents;
using NegarAzinFadak.Identity.Domain.Folders;

namespace NegarAzinFadak.Application.Documents;

/// <summary>
/// Optional filters accepted by the identity document directory.
/// </summary>
/// <remarks>
/// As on the identity directory, there is deliberately no filter for the tenant. A caller narrows by
/// status, by document type, by owner or by free text; which documents exist at all is decided by the
/// organization the session belongs to, and a filter that could widen it would turn a query string into a
/// tenant selector.
/// </remarks>
/// <param name="Status">Restrict to one verification state.</param>
/// <param name="DocumentTypeCode">Restrict to one configured document type, by its code.</param>
/// <param name="UserId">Restrict to the documents of one central identity.</param>
/// <param name="OnlyCurrentlyValid">Restrict to documents verified and not past their expiry date.</param>
public sealed record DocumentQuery(
    DocumentStatus? Status = null,
    string? DocumentTypeCode = null,
    Guid? UserId = null,
    bool? OnlyCurrentlyValid = null)
{
    /// <summary>A query with no restrictions, listing every document of the caller's tenant.</summary>
    public static DocumentQuery All { get; } = new();

    /// <summary>True when no filter is set, so a caller can report a full listing as such.</summary>
    public bool IsUnfiltered =>
        Status is null && DocumentTypeCode is null && UserId is null && OnlyCurrentlyValid is null;
}

/// <summary>
/// One captured page together with the document it belongs to, resolved from a private storage key.
/// </summary>
/// <remarks>
/// This is the only shape in the platform that reaches a document <em>by its storage key</em>, and it
/// exists solely so that the content endpoint can answer "is this caller allowed to read these bytes"
/// before a single byte is streamed. The key arrives from the caller in the route, which means it cannot
/// be trusted on its own: it is opaque and non-guessable, not secret, and every property that decides
/// access is re-derived here from the database.
/// </remarks>
/// <param name="Document">The document that owns the page.</param>
/// <param name="Page">The page itself, carrying the stored content type.</param>
public sealed record StoredPageLocation(IdentityDocument Document, DocumentPage Page);

/// <summary>
/// Read side of the identity document store, as an administrator's screens and the content endpoint use it.
/// </summary>
/// <remarks>
/// Every tenant-owned method takes the caller's <see cref="TenantScope"/> as a parameter rather than
/// reading an ambient one, for the same reason <c>IIdentityDirectory</c> does: a use case cannot forget to
/// apply a scope it was handed, and the answer to "this tenant's documents" does not depend on what the
/// ambient context happens to be, which is what makes the behaviour testable.
/// </remarks>
public interface IDocumentDirectory
{
    /// <summary>One page of the documents of one organization, narrowed by <paramref name="query"/>.</summary>
    Task<PagedResult<IdentityDocument>> ListAsync(
        TenantScope scope,
        DocumentQuery query,
        PageRequest page,
        DateOnly today,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// One document of the organization together with its pages and decisions, untracked. Returns
    /// <see langword="null"/> when the document is not in <paramref name="scope"/>.
    /// </summary>
    Task<IdentityDocument?> FindByIdAsync(
        TenantScope scope,
        Guid documentId,
        CancellationToken cancellationToken = default);

    /// <summary>The same document, tracked, for a use case that is about to change it.</summary>
    Task<IdentityDocument?> FindTrackedByIdAsync(
        TenantScope scope,
        Guid documentId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// The page a private storage key names, together with the document that owns it, or
    /// <see langword="null"/> when the key is unknown to the organization.
    /// </summary>
    /// <remarks>
    /// The lookup runs from the key outwards through the document, never from the page outwards. That is
    /// deliberate: it is the only ordering in which the tenant predicate is applied before anything is
    /// returned, so a key belonging to another organization is reported as not found rather than resolved
    /// and then refused.
    /// </remarks>
    Task<StoredPageLocation?> FindPageByStorageKeyAsync(
        TenantScope scope,
        string storageKey,
        CancellationToken cancellationToken = default);

    /// <summary>Stages a new document in the caller's unit of work.</summary>
    /// <remarks>
    /// The create path lives here rather than behind <c>IRepository&lt;&gt;</c> because attaching a document is
    /// not a bare aggregate insert: the document is only valid next to a type that exists and an owner that is
    /// in the tenant, and a use case that can reach the aggregate without the directory would be able to skip
    /// both checks. Keeping the write behind the same port as the reads is what makes the document store a
    /// boundary rather than a bag of rows.
    /// </remarks>
    void Add(IdentityDocument document);
}

/// <summary>
/// The configurable catalogue of document types.
/// </summary>
/// <remarks>
/// A document type is base structure, not business data: it says which kinds of identity document the
/// platform understands, how many pages each has and whether it expires. There is one catalogue for the
/// whole platform rather than one per tenant, because a document type describes a physical kind of paper
/// that does not belong to an organization, and a tenant inventing its own national ID would let two
/// tenants disagree about what a national ID is. It is therefore deliberately not
/// <see cref="ITenantScoped"/>, and no method here takes a scope.
/// </remarks>
public interface IDocumentTypeCatalog
{
    /// <summary>One page of the catalogue, active entries only unless <paramref name="includeInactive"/>.</summary>
    Task<PagedResult<DocumentType>> ListAsync(
        bool includeInactive,
        string? search,
        PageRequest page,
        CancellationToken cancellationToken = default);

    /// <summary>The active type with this code, or <see langword="null"/>.</summary>
    Task<DocumentType?> FindActiveByCodeAsync(string code, CancellationToken cancellationToken = default);

    /// <summary>The type with this code whatever its active state, or <see langword="null"/>.</summary>
    Task<DocumentType?> FindByCodeAsync(string code, CancellationToken cancellationToken = default);

    /// <summary>The type with this identifier whatever its active state, or <see langword="null"/>.</summary>
    Task<DocumentType?> FindByIdAsync(Guid documentTypeId, CancellationToken cancellationToken = default);

    /// <summary>The type with this identifier, tracked, for a use case that is about to change it.</summary>
    Task<DocumentType?> FindTrackedByIdAsync(Guid documentTypeId, CancellationToken cancellationToken = default);

    /// <summary>
    /// The types among <paramref name="documentTypeIds"/> that exist, keyed by identifier.
    /// </summary>
    /// <remarks>
    /// A bulk lookup rather than a loop of single reads, because a page of documents resolves twenty-five or
    /// two hundred types and doing that one query at a time turns a list screen into a round trip storm.
    /// Identifiers with no matching type are simply absent from the result rather than returned as null, so a
    /// caller projecting a row can tell "this type was retired out from under the document" apart from
    /// "this type does not exist", which is what a placeholder value on the projection has to describe.
    /// </remarks>
    Task<Dictionary<Guid, DocumentType>> LoadByIdsAsync(
        IReadOnlyCollection<Guid> documentTypeIds,
        CancellationToken cancellationToken = default);

    /// <summary>True when any type already holds this code, including a deactivated one.</summary>
    /// <remarks>
    /// Including deactivated types is the point. A code that was retired and later reintroduced must collide
    /// with the retired row, because the code is the identifier documents and their configurations refer to
    /// and a second row under the same code would make the lookup ambiguous rather than restoring anything.
    /// </remarks>
    Task<bool> CodeExistsAsync(string code, CancellationToken cancellationToken = default);

    /// <summary>Adds a type that the catalogue does not have yet.</summary>
    void Add(DocumentType documentType);
}

/// <summary>
/// Read side of a person's digital folder.
/// </summary>
/// <remarks>
/// The folder is tenant-owned, so its methods take the caller's scope, and the unique index on
/// <see cref="DigitalFolder.UserId"/> is what makes one folder per identity a structural property rather
/// than a convention a caller has to remember.
/// </remarks>
public interface IDigitalFolderDirectory
{
    /// <summary>The folder of an identity in the organization, untracked, or <see langword="null"/>.</summary>
    Task<DigitalFolder?> FindByUserAsync(TenantScope scope, Guid userId, CancellationToken cancellationToken = default);

    /// <summary>The same folder, tracked, for a use case that is about to change it.</summary>
    Task<DigitalFolder?> FindTrackedByUserAsync(TenantScope scope, Guid userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// The folder of an identity whatever organization it belongs to, or <see langword="null"/>.
    /// </summary>
    /// <remarks>
    /// The one method on this port that is not scoped, and it answers only "does this person have a folder
    /// yet". Registering an identity and creating its folder is one transaction across two tenants' worth of
    /// state at most — the new identity's own organization — so resolving existence without a scope is
    /// safe, while every read of folder <em>contents</em> stays scoped.
    /// </remarks>
    Task<bool> ExistsForUserAsync(Guid userId, CancellationToken cancellationToken = default);

    /// <summary>Stages a new folder in the caller's unit of work.</summary>
    /// <remarks>
    /// Beside the reads for the same reason the document directory owns its create path: a folder may only be
    /// created for an identity that exists in the caller's tenant, and a use case holding the open repository
    /// could skip that check.
    /// </remarks>
    void Add(DigitalFolder folder);
}