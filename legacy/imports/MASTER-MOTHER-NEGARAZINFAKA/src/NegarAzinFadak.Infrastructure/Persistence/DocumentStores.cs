using Microsoft.EntityFrameworkCore;
using NegarAzinFadak.Application.Documents;
using NegarAzinFadak.Core;
using NegarAzinFadak.Core.Paging;
using NegarAzinFadak.Core.Tenancy;
using NegarAzinFadak.Identity.Domain.Documents;
using DigitalFolderEntity = NegarAzinFadak.Identity.Domain.Folders.DigitalFolder;

namespace NegarAzinFadak.Infrastructure.Persistence;

/// <summary>
/// Read side of the identity document store.
/// </summary>
/// <remarks>
/// <para>
/// The scope is applied as an explicit predicate on the isolation column and the global filter is ignored,
/// for the reason documented on <see cref="EfCoreIdentityDirectory"/>: a port that was handed a scope to
/// answer for must not depend on the ambient session.
/// </para>
/// <para>
/// <see cref="ListAsync"/> takes the current date as a parameter so the "currently valid" filter is decided
/// by the caller's clock and can be tested, rather than by the database's <c>DATE('now')</c> which would make
/// an expiry boundary untestable and would disagree with the domain on the day a document lapses. The
/// predicate is spelled out in the query instead of calling <see cref="IdentityDocument.IsCurrentlyValid"/>,
/// because that method is ordinary C# and does not translate.
/// </para>
/// </remarks>
public sealed class EfCoreDocumentDirectory(NegarAzinFadakDbContext context) : IDocumentDirectory
{
    private readonly NegarAzinFadakDbContext _context = Guard.AgainstNull(context);

    /// <inheritdoc />
    public async Task<PagedResult<IdentityDocument>> ListAsync(
        TenantScope scope,
        DocumentQuery query,
        PageRequest page,
        DateOnly today,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(query);
        ArgumentNullException.ThrowIfNull(page);

        var documents = OfTenant(scope);

        if (query.Status is { } status)
        {
            documents = documents.Where(document => document.Status == status);
        }

        if (query.DocumentTypeCode is { } documentTypeCode)
        {
            // Documents store the type's identifier, so filtering by code is a subquery against the
            // catalogue rather than a comparison on the row. Expressed as a subquery rather than as a join
            // so a code this deployment does not have yields an empty page instead of a type row that then
            // produces no documents — the two are the same answer to a caller, and this one needs no second
            // lookup to discover.
            var normalizedCode = documentTypeCode.Trim().ToUpperInvariant();
            documents = documents.Where(document =>
                _context.DocumentTypes
                    .Where(type => type.Code == normalizedCode)
                    .Select(type => type.Id)
                    .Contains(document.DocumentTypeId));
        }

        if (query.UserId is { } userId)
        {
            documents = documents.Where(document => document.UserId == userId);
        }

        if (query.OnlyCurrentlyValid is { } currentlyValid)
        {
            documents = currentlyValid
                ? documents.Where(document =>
                    document.Status == DocumentStatus.Verified
                    && (!document.ExpiresOn.HasValue || document.ExpiresOn.Value >= today))
                : documents.Where(document =>
                    document.Status != DocumentStatus.Verified
                    || (document.ExpiresOn.HasValue && document.ExpiresOn.Value < today));
        }

        var total = await documents.LongCountAsync(cancellationToken).ConfigureAwait(false);
        var items = await documents
            .AsNoTracking()
            .Include(document => document.Pages)
            // Newest first, then by identifier for a stable order across pages. See EfCoreIdentityDirectory
            // for why a directory without a tiebreaker cannot be paged.
            .OrderByDescending(document => document.CreatedAt)
            .ThenBy(document => document.Id)
            .Skip(page.Skip)
            .Take(page.PageSize)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        return new PagedResult<IdentityDocument>(items, page.PageNumber, page.PageSize, total);
    }

    /// <inheritdoc />
    public Task<IdentityDocument?> FindByIdAsync(
        TenantScope scope,
        Guid documentId,
        CancellationToken cancellationToken = default)
        => Readable(OfTenant(scope).Where(document => document.Id == documentId))
            .FirstOrDefaultAsync(cancellationToken);

    /// <inheritdoc />
    public Task<IdentityDocument?> FindTrackedByIdAsync(
        TenantScope scope,
        Guid documentId,
        CancellationToken cancellationToken = default)
        => OfTenant(scope)
            .Include(document => document.Pages)
            .FirstOrDefaultAsync(document => document.Id == documentId, cancellationToken);

    /// <inheritdoc />
    public async Task<StoredPageLocation?> FindPageByStorageKeyAsync(
        TenantScope scope,
        string storageKey,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(storageKey);

        var key = storageKey.Trim();
        if (key.Length is 0)
        {
            return null;
        }

        // Routed from the document outwards, so the tenant predicate is part of the same query that produces
        // the page and a key belonging to another organization matches nothing at all. Selecting pages first
        // and filtering their owner afterwards would still be correct here, but it would read as though a page
        // were resolvable without its document, which is exactly the assumption the content endpoint must not
        // make. The match inside the document is then finished on the client, over the pages already loaded,
        // rather than projected into a shape that is not the aggregate.
        var document = await OfTenant(scope)
            .AsNoTracking()
            .Include(candidate => candidate.Pages)
            .FirstOrDefaultAsync(candidate => candidate.Pages.Any(page => page.StorageKey == key), cancellationToken)
            .ConfigureAwait(false);

        if (document is null)
        {
            return null;
        }

        var page = document.Pages.FirstOrDefault(candidate => candidate.StorageKey == key);
        return page is null ? null : new StoredPageLocation(document, page);
    }

    /// <inheritdoc />
    public void Add(IdentityDocument document)
    {
        ArgumentNullException.ThrowIfNull(document);
        _context.IdentityDocuments.Add(document);
    }

    /// <summary>
    /// The documents of one organization, filtered on the shadow <c>OrganizationId</c> column.
    /// </summary>
    /// <remarks>
    /// An empty scope answers with an impossible key rather than an exception, so a misresolved principal
    /// yields an empty directory instead of a cross-tenant read.
    /// </remarks>
    private IQueryable<IdentityDocument> OfTenant(TenantScope scope)
    {
        ArgumentNullException.ThrowIfNull(scope);

        if (scope.IsEmpty)
        {
            return _context.IdentityDocuments
                .IgnoreQueryFilters()
                .Where(document => document.Id == Guid.Empty);
        }

        return _context.IdentityDocuments
            .IgnoreQueryFilters()
            .Where(document =>
                EF.Property<Guid>(document, NegarAzinFadakDbContext.OrganizationIdColumn) == scope.OrganizationId);
    }

    /// <summary>
    /// The navigations a document read needs.
    /// </summary>
    /// <remarks>
    /// Pages and extractions, because a detail screen renders what was captured and what was read. Verifications
    /// are left out of the general list shape deliberately only where they are not needed for the projection.
    /// </remarks>
    private static IQueryable<IdentityDocument> Readable(IQueryable<IdentityDocument> documents) => documents
        .Include(document => document.Pages)
        .Include(document => document.Extractions)
        .Include(document => document.Verifications);
}

/// <summary>
/// Read side of a person's digital folder.
/// </summary>
/// <remarks>
/// <see cref="ExistsForUserAsync"/> is unscoped on purpose and says why on the interface. The unique index on
/// <see cref="DigitalFolderEntity.UserId"/> is global rather than per tenant, which follows from a person
/// having exactly one folder in the whole platform: a second folder for the same identity in another
/// organization would be a second place to look for the same person's documents.
/// <para>
/// That is also why it has to see through the global filter. An identity whose folder belongs to one
/// organization is registered from another — a branch registering a person, the head office holding the folder
/// — and a filtered lookup would report the folder as missing and create a second one for the same person.
/// </para>
/// </remarks>
public sealed class EfCoreDigitalFolderDirectory(NegarAzinFadakDbContext context) : IDigitalFolderDirectory
{
    private readonly NegarAzinFadakDbContext _context = Guard.AgainstNull(context);

    /// <inheritdoc />
    public Task<DigitalFolderEntity?> FindByUserAsync(
        TenantScope scope,
        Guid userId,
        CancellationToken cancellationToken = default)
        => Readable(OfTenant(scope).Where(folder => folder.UserId == userId))
            .FirstOrDefaultAsync(cancellationToken);

    /// <inheritdoc />
    public Task<DigitalFolderEntity?> FindTrackedByUserAsync(
        TenantScope scope,
        Guid userId,
        CancellationToken cancellationToken = default)
        => Readable(OfTenant(scope).Where(folder => folder.UserId == userId))
            .FirstOrDefaultAsync(cancellationToken);

    /// <inheritdoc />
    public Task<bool> ExistsForUserAsync(Guid userId, CancellationToken cancellationToken = default)
        => _context.DigitalFolders
            .AsNoTracking()
            .IgnoreQueryFilters()
            .AnyAsync(folder => folder.UserId == userId, cancellationToken);

    /// <inheritdoc />
    public void Add(DigitalFolderEntity folder)
    {
        ArgumentNullException.ThrowIfNull(folder);
        _context.DigitalFolders.Add(folder);
    }

    private IQueryable<DigitalFolderEntity> OfTenant(TenantScope scope)
    {
        ArgumentNullException.ThrowIfNull(scope);

        if (scope.IsEmpty)
        {
            return _context.DigitalFolders
                .IgnoreQueryFilters()
                .Where(folder => folder.Id == Guid.Empty);
        }

        return _context.DigitalFolders
            .IgnoreQueryFilters()
            .Where(folder =>
                EF.Property<Guid>(folder, NegarAzinFadakDbContext.OrganizationIdColumn) == scope.OrganizationId);
    }

    private static IQueryable<DigitalFolderEntity> Readable(IQueryable<DigitalFolderEntity> folders) => folders
        .Include(folder => folder.Documents);
}

/// <summary>
/// The platform-wide catalogue of document types.
/// </summary>
/// <remarks>
/// The only store here that does not ignore query filters or take a scope, because
/// <see cref="DocumentType"/> is not <c>ITenantScoped</c>: one catalogue describes the same physical kinds of
/// paper for every organization. Every read still filters on the active flag where the caller asked for active
/// types only, so the code a document carries always resolves to something the platform is willing to accept.
/// </remarks>
public sealed class EfCoreDocumentTypeCatalog(NegarAzinFadakDbContext context) : IDocumentTypeCatalog
{
    private readonly NegarAzinFadakDbContext _context = Guard.AgainstNull(context);

    /// <inheritdoc />
    public async Task<PagedResult<DocumentType>> ListAsync(
        bool includeInactive,
        string? search,
        PageRequest page,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(page);

        var types = _context.DocumentTypes.AsQueryable();
        if (!includeInactive)
        {
            types = types.Where(type => type.IsActive);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var text = search.Trim();
            types = types.Where(type =>
                EF.Functions.Like(type.Code, $"%{text}%")
                || EF.Functions.Like(type.Title, $"%{text}%")
                || EF.Functions.Like(type.TitlePersian, $"%{text}%"));
        }

        var total = await types.LongCountAsync(cancellationToken).ConfigureAwait(false);
        var items = await types
            .AsNoTracking()
            .OrderBy(type => type.Code)
            .Skip(page.Skip)
            .Take(page.PageSize)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        return new PagedResult<DocumentType>(items, page.PageNumber, page.PageSize, total);
    }

    /// <inheritdoc />
    public Task<DocumentType?> FindActiveByCodeAsync(string code, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(code);

        var normalized = code.Trim().ToUpperInvariant();
        return _context.DocumentTypes
            .AsNoTracking()
            .FirstOrDefaultAsync(type => type.Code == normalized && type.IsActive, cancellationToken);
    }

    /// <inheritdoc />
    public Task<DocumentType?> FindByCodeAsync(string code, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(code);

        var normalized = code.Trim().ToUpperInvariant();
        return _context.DocumentTypes
            .AsNoTracking()
            .FirstOrDefaultAsync(type => type.Code == normalized, cancellationToken);
    }

    /// <inheritdoc />
    public Task<DocumentType?> FindByIdAsync(Guid documentTypeId, CancellationToken cancellationToken = default)
        => _context.DocumentTypes
            .AsNoTracking()
            .FirstOrDefaultAsync(type => type.Id == documentTypeId, cancellationToken);

    /// <inheritdoc />
    public Task<DocumentType?> FindTrackedByIdAsync(Guid documentTypeId, CancellationToken cancellationToken = default)
        => _context.DocumentTypes
            .FirstOrDefaultAsync(type => type.Id == documentTypeId, cancellationToken);

    /// <inheritdoc />
    public async Task<Dictionary<Guid, DocumentType>> LoadByIdsAsync(
        IReadOnlyCollection<Guid> documentTypeIds,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(documentTypeIds);

        if (documentTypeIds.Count is 0)
        {
            return [];
        }

        var loaded = await _context.DocumentTypes
            .AsNoTracking()
            .Where(type => documentTypeIds.Contains(type.Id))
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        return loaded.ToDictionary(type => type.Id);
    }

    /// <inheritdoc />
    public Task<bool> CodeExistsAsync(string code, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(code);

        var normalized = code.Trim().ToUpperInvariant();
        return _context.DocumentTypes
            .AsNoTracking()
            .AnyAsync(type => type.Code == normalized, cancellationToken);
    }

    /// <inheritdoc />
    public void Add(DocumentType documentType)
    {
        ArgumentNullException.ThrowIfNull(documentType);
        _context.DocumentTypes.Add(documentType);
    }
}