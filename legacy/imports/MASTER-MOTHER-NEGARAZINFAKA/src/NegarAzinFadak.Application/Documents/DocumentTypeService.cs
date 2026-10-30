using Microsoft.Extensions.Logging;
using NegarAzinFadak.Application.Auditing;
using NegarAzinFadak.Application.Options;
using NegarAzinFadak.Application.Tenancy;
using NegarAzinFadak.Core;
using NegarAzinFadak.Core.Paging;
using NegarAzinFadak.Core.Persistence;
using NegarAzinFadak.Core.Results;
using NegarAzinFadak.Identity.Domain;
using NegarAzinFadak.Identity.Domain.Documents;

namespace NegarAzinFadak.Application.Documents;

/// <summary>A configured document type, as an administrator sees it.</summary>
/// <param name="Id">Identifier of the type.</param>
/// <param name="Code">Stable data-driven code, e.g. <c>national_id</c>.</param>
/// <param name="Title">English title.</param>
/// <param name="TitlePersian">Persian title, which is what the Persian-first client renders.</param>
/// <param name="Category">Folder category a document of this type belongs to.</param>
/// <param name="RequiresBackSide">Whether both sides must be captured before the document can be verified.</param>
/// <param name="DefaultValidityDays">Validity applied when the document is issued, or null when it never expires.</param>
/// <param name="IsIdentityDocument">Whether a document of this type may back an identity verification.</param>
/// <param name="ProviderTemplate">Template hint for the OCR provider, or null.</param>
/// <param name="MaxPages">How many pages a document of this type may hold.</param>
/// <param name="IsActive">Whether new documents may still be created against this type.</param>
public sealed record DocumentTypeView(
    Guid Id,
    string Code,
    string Title,
    string TitlePersian,
    string Category,
    bool RequiresBackSide,
    int? DefaultValidityDays,
    bool IsIdentityDocument,
    string? ProviderTemplate,
    int MaxPages,
    bool IsActive)
{
    /// <summary>Projects a configured type onto the wire shape.</summary>
    public static DocumentTypeView From(DocumentType type)
    {
        ArgumentNullException.ThrowIfNull(type);

        return new DocumentTypeView(
            type.Id,
            type.Code,
            type.Title,
            type.TitlePersian,
            type.Category.ToString(),
            type.RequiresBackSide,
            type.DefaultValidityDays,
            type.IsIdentityDocument,
            type.ProviderTemplate,
            type.MaxPages,
            type.IsActive);
    }
}

/// <summary>
/// Administering the catalogue of identity document types.
/// </summary>
/// <remarks>
/// <para>
/// This is base structure, and it is the only thing in the identity module the platform seeds. A document
/// type says which kinds of paper the platform understands and how many pages each has; it is not a
/// person's document, a customer, a balance or a transaction, so publishing it creates no business data of
/// any kind. What the platform will not do is invent the shapes themselves: the catalogue is reconciled
/// from the <c>Identity:DocumentTypes</c> configuration section, and a deployment that declares none starts
/// with an empty catalogue and an operator who builds it.
/// </para>
/// <para>
/// There is no tenant scope on any method, and that is a deliberate design decision rather than an
/// oversight, documented on <see cref="IDocumentTypeCatalog"/>. A national ID card is the same physical
/// document in every organization, so the catalogue is platform-wide; what is tenant-specific is whether a
/// given organization is allowed to accept one, and that is a question about workflows, not about what a
/// national ID is.
/// </para>
/// </remarks>
public sealed class DocumentTypeService
{
    private readonly IDocumentTypeCatalog _catalog;
    private readonly IUnitOfWork _unitOfWork;
    private readonly AuditTrailWriter _audit;
    private readonly ILogger<DocumentTypeService> _logger;

    public DocumentTypeService(
        IDocumentTypeCatalog catalog,
        IUnitOfWork unitOfWork,
        AuditTrailWriter audit,
        ILogger<DocumentTypeService> logger)
    {
        _catalog = Guard.AgainstNull(catalog);
        _unitOfWork = Guard.AgainstNull(unitOfWork);
        _audit = Guard.AgainstNull(audit);
        _logger = Guard.AgainstNull(logger);
    }

    /// <summary>One page of the catalogue.</summary>
    public async Task<Result<PagedResult<DocumentTypeView>>> SearchAsync(
        bool includeInactive,
        string? search,
        PageRequest page,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(page);

        var found = await _catalog.ListAsync(includeInactive, search, page, cancellationToken).ConfigureAwait(false);
        var projected = found.Map(DocumentTypeView.From);

        await _audit.RecordSuccessAsync(
            DocumentAuditActions.TypeList,
            ResourceTypes.DocumentType,
            "catalog",
            new Dictionary<string, string?>
            {
                ["returned"] = projected.Count.ToString(System.Globalization.CultureInfo.InvariantCulture),
                ["total"] = projected.TotalCount.ToString(System.Globalization.CultureInfo.InvariantCulture),
                ["includeInactive"] = includeInactive.ToString()
            },
            cancellationToken).ConfigureAwait(false);

        // The read appends an audit line and nothing else, so without an explicit commit the record of who
        // looked at the catalogue would sit in the change tracker until some later write flushed it.
        await _unitOfWork.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        return Result<PagedResult<DocumentTypeView>>.Success(projected);
    }

    /// <summary>Reads one configured document type by its code.</summary>
    public async Task<Result<DocumentTypeView>> ReadAsync(string code, CancellationToken cancellationToken = default)
    {
        var normalized = DocumentTypeRules.NormalizeCode(code);
        if (normalized.IsFailure)
        {
            return Result<DocumentTypeView>.Failure(normalized.FirstError);
        }

        var type = await _catalog.FindByCodeAsync(normalized.Value, cancellationToken).ConfigureAwait(false);
        if (type is null)
        {
            return Result<DocumentTypeView>.Failure(IdentityErrors.DocumentTypeNotFound);
        }

        await _audit.RecordSuccessAsync(
            DocumentAuditActions.TypeRead,
            ResourceTypes.DocumentType,
            type.Code,
            cancellationToken: cancellationToken).ConfigureAwait(false);
        await _unitOfWork.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        return Result<DocumentTypeView>.Success(DocumentTypeView.From(type));
    }

    /// <summary>Defines a document type the catalogue does not hold yet.</summary>
    public async Task<Result<DocumentTypeView>> DefineAsync(
        string code,
        string title,
        string titlePersian,
        DocumentCategory category,
        bool requiresBackSide,
        int? defaultValidityDays,
        bool isIdentityDocument,
        string? providerTemplate,
        int maxPages,
        CancellationToken cancellationToken = default)
    {
        var normalized = DocumentTypeRules.NormalizeCode(code);
        if (normalized.IsFailure)
        {
            return Result<DocumentTypeView>.Failure(normalized.FirstError);
        }

        var problem = DocumentTypeRules.ValidateDefinition(title, titlePersian, defaultValidityDays, providerTemplate, maxPages);
        if (problem is not null)
        {
            return Result<DocumentTypeView>.Failure(problem);
        }

        // Checked here rather than left to the unique index, for the same reason roles are: defining a
        // document type twice is an expected operator mistake and deserves the platform's own vocabulary
        // instead of a 500 from the database.
        if (await _catalog.CodeExistsAsync(normalized.Value, cancellationToken).ConfigureAwait(false))
        {
            return await _audit.AuditDenialAsync(
                DocumentAuditActions.TypeDefine,
                ResourceTypes.DocumentType,
                normalized.Value,
                Result<DocumentTypeView>.Failure(IdentityErrors.DocumentTypeCodeExists(normalized.Value)),
                cancellationToken: cancellationToken).ConfigureAwait(false);
        }

        var created = new DocumentType(
            Guid.NewGuid(),
            normalized.Value,
            title.Trim(),
            titlePersian.Trim(),
            category,
            requiresBackSide,
            defaultValidityDays,
            isIdentityDocument,
            providerTemplate,
            maxPages);

        _catalog.Add(created);

        await _audit.RecordSuccessAsync(
            DocumentAuditActions.TypeDefine,
            ResourceTypes.DocumentType,
            created.Code,
            new Dictionary<string, string?>
            {
                ["category"] = created.Category.ToString(),
                ["requiresBackSide"] = created.RequiresBackSide.ToString(),
                ["isIdentityDocument"] = created.IsIdentityDocument.ToString()
            },
            cancellationToken).ConfigureAwait(false);
        await _unitOfWork.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        _logger.LogInformation("Document type {Code} defined.", created.Code);

        return Result<DocumentTypeView>.Success(DocumentTypeView.From(created));
    }

    /// <summary>
    /// Reactivates a document type, so new documents may be created against it again.
    /// </summary>
    /// <remarks>
    /// Reactivation never rewrites documents that already exist. A type withdrawn because the platform had
    /// it configured wrongly may safely come back; the documents captured under it were judged against the
    /// rules of their own time and re-deciding them here would be a change nobody asked for.
    /// </remarks>
    public Task<Result> ActivateAsync(string code, CancellationToken cancellationToken = default)
        => SetActiveAsync(code, isActive: true, DocumentAuditActions.TypeActivate, cancellationToken);

    /// <summary>Deactivates a document type. Documents already captured keep their state.</summary>
    public Task<Result> DeactivateAsync(string code, CancellationToken cancellationToken = default)
        => SetActiveAsync(code, isActive: false, DocumentAuditActions.TypeDeactivate, cancellationToken);

    /// <summary>
    /// Reconciles the configured base catalogue into the database, adding only what is missing.
    /// </summary>
    /// <param name="definitions">The catalogue declared in configuration.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>How many types this run added, and how many the catalogue holds in total.</returns>
    /// <remarks>
    /// Add-only, and that asymmetry is the whole design. Adding the missing entries makes a deployment that
    /// extends the base catalogue converge by restarting, which is the property an operator expects. Never
    /// updating an existing entry and never deactivating one that configuration has dropped keeps an
    /// operator's local adjustment from being silently reverted on the next restart, and it keeps documents
    /// that already reference a withdrawn type resolvable rather than dangling. A type that is no longer
    /// wanted is deactivated through the administration surface, which records who did it.
    /// </remarks>
    public async Task<Result<(int Added, int Total)>> InstallAsync(
        IReadOnlyList<DocumentTypeDefinition> definitions,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(definitions);

        if (definitions.Count is 0)
        {
            _logger.LogWarning(
                "No document types are declared in configuration. The catalogue stays empty and no document can be submitted until an operator defines one.");

            return Result<(int, int)>.Success((0, 0));
        }

        var added = 0;
        foreach (var definition in definitions)
        {
            var normalized = DocumentTypeRules.NormalizeCode(definition.Code);
            if (normalized.IsFailure)
            {
                return Result<(int, int)>.Failure(normalized.FirstError);
            }

            var problem = DocumentTypeRules.ValidateDefinition(
                definition.Title,
                definition.TitlePersian,
                definition.DefaultValidityDays,
                definition.ProviderTemplate,
                definition.MaxPages);
            if (problem is not null)
            {
                // A malformed declaration is a deployment fault. It stops the run rather than being skipped,
                // because a catalogue missing a silently-rejected type produces a document nobody can submit.
                return Result<(int, int)>.Failure(problem);
            }

            var category = DocumentCategoryParser.Parse(definition.Category);
            if (category.IsFailure)
            {
                return Result<(int, int)>.Failure(category.FirstError);
            }

            if (await _catalog.CodeExistsAsync(normalized.Value, cancellationToken).ConfigureAwait(false))
            {
                continue;
            }

            _catalog.Add(new DocumentType(
                Guid.NewGuid(),
                normalized.Value,
                definition.Title.Trim(),
                definition.TitlePersian.Trim(),
                category.Value,
                definition.RequiresBackSide,
                definition.DefaultValidityDays,
                definition.IsIdentityDocument,
                definition.ProviderTemplate,
                definition.MaxPages));

            added++;
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        // Counted after committing rather than assumed, because "added" is not "total" whenever the run
        // skipped codes that were already present — which on every restart after the first is all of them.
        var total = (await _catalog
            .ListAsync(includeInactive: true, search: null, new PageRequest(1, 1), cancellationToken)
            .ConfigureAwait(false)).TotalCount;

        _logger.LogInformation(
            "Base document type catalogue reconciled: {Added} added, {Total} total.",
            added,
            total);

        return Result<(int, int)>.Success((added, (int)total));
    }

    private async Task<Result> SetActiveAsync(string code, bool isActive, string action, CancellationToken cancellationToken)
    {
        var normalized = DocumentTypeRules.NormalizeCode(code);
        if (normalized.IsFailure)
        {
            return Result.Failure(normalized.FirstError);
        }

        var type = await LoadTrackedAsync(normalized.Value, cancellationToken).ConfigureAwait(false);

        if (type is null)
        {
            return Result.Failure(IdentityErrors.DocumentTypeNotFound);
        }

        if (type.IsActive == isActive)
        {
            // Reported as the outcome it is. An operator who activates an active type has not done anything,
            // and an audit line claiming a change would misdescribe the record.
            await _audit.RecordSuccessAsync(
                action,
                ResourceTypes.DocumentType,
                type.Code,
                new Dictionary<string, string?> { ["changed"] = "false" },
                cancellationToken).ConfigureAwait(false);
            await _unitOfWork.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
            return Result.Success();
        }

        if (isActive)
        {
            type.Activate();
        }
        else
        {
            type.Deactivate();
        }

        await _audit.RecordSuccessAsync(
            action,
            ResourceTypes.DocumentType,
            type.Code,
            new Dictionary<string, string?> { ["isActive"] = isActive.ToString() },
            cancellationToken).ConfigureAwait(false);
        await _unitOfWork.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        return Result.Success();
    }

    private async Task<DocumentType?> LoadTrackedAsync(string code, CancellationToken cancellationToken)
    {
        var untracked = await _catalog.FindByCodeAsync(code, cancellationToken).ConfigureAwait(false);
        return untracked is null
            ? null
            : await _catalog.FindTrackedByIdAsync(untracked.Id, cancellationToken).ConfigureAwait(false);
    }
}
