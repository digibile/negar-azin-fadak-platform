using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using NegarAzinFadak.Application.Abstractions.Documents;
using NegarAzinFadak.Application.Abstractions.Ocr;
using NegarAzinFadak.Application.Dossiers;
using NegarAzinFadak.Application.Identity;
using NegarAzinFadak.Application.Options;
using NegarAzinFadak.Core;
using NegarAzinFadak.Core.Results;
using NegarAzinFadak.Core.Time;
using NegarAzinFadak.Identity.Domain;
using NegarAzinFadak.Identity.Domain.Documents;
using NegarAzinFadak.Identity.Domain.Users;
using NegarAzinFadak.Identity.Domain.Verification;

namespace NegarAzinFadak.Application.Documents;

/// <summary>Outcome of a capture attempt, including the guidance to show the user on a retake.</summary>
/// <param name="IsAccepted">True when the page was stored.</param>
/// <param name="GuidancePersian">Persian instructions; empty when the capture was accepted.</param>
/// <param name="DocumentId">The logical document the page belongs to.</param>
/// <param name="PageId">The stored page, when accepted.</param>
public sealed record CaptureOutcome(
    bool IsAccepted,
    IReadOnlyList<string> GuidancePersian,
    Guid DocumentId,
    Guid? PageId);

/// <summary>Outcome of the OCR pipeline for a logical document.</summary>
/// <param name="DocumentId">Document that was processed.</param>
/// <param name="Status">Resulting document status; never better than <see cref="DocumentStatus.PendingVerification"/>.</param>
/// <param name="ExtractedFields">Normalised values proposed by the pipeline.</param>
/// <param name="CrossCheck">Cross-check outcome against the person's master data.</param>
/// <param name="ProviderCode">Provider that produced the extraction.</param>
public sealed record OcrPipelineOutcome(
    Guid DocumentId,
    DocumentStatus Status,
    IReadOnlyDictionary<IdentityField, string?> ExtractedFields,
    IdentityCrossCheckResult CrossCheck,
    string ProviderCode);

/// <summary>
/// The document recognition pipeline: capture → quality gate → storage → extraction → normalisation →
/// validation → cross-check. Every stage can only ever lower trust, never raise it: the pipeline ends at
/// <see cref="DocumentStatus.PendingVerification"/> and the user or a reviewer decides.
/// </summary>
public sealed class DocumentIntakeService
{
    private readonly IDocumentStorage _storage;
    private readonly IDocumentImageAnalyzer _imageAnalyzer;
    private readonly IOcrProviderResolver _ocrResolver;
    private readonly IClock _clock;
    private readonly DocumentImageQualityOptions _qualityOptions;
    private readonly DocumentOptions _documentOptions;
    private readonly ILogger<DocumentIntakeService> _logger;

    public DocumentIntakeService(
        IDocumentStorage storage,
        IDocumentImageAnalyzer imageAnalyzer,
        IOcrProviderResolver ocrResolver,
        IClock clock,
        IOptions<DocumentImageQualityOptions> qualityOptions,
        IOptions<DocumentOptions> documentOptions,
        ILogger<DocumentIntakeService> logger)
    {
        _storage = Guard.AgainstNull(storage);
        _imageAnalyzer = Guard.AgainstNull(imageAnalyzer);
        _ocrResolver = Guard.AgainstNull(ocrResolver);
        _clock = Guard.AgainstNull(clock);
        _qualityOptions = Guard.AgainstNull(qualityOptions).Value;
        _documentOptions = Guard.AgainstNull(documentOptions).Value;
        _logger = Guard.AgainstNull(logger);
    }

    /// <summary>
    /// Judges a capture before anything is stored. Cheap, synchronous, and safe to call from an edge or
    /// from the mobile client through the API, so a bad photo never reaches private storage.
    /// </summary>
    public CaptureVerdict EvaluateCapture(ReadOnlyMemory<byte> content, string contentType)
    {
        if (content.Length > _documentOptions.MaximumSizeInBytes)
        {
            return new CaptureVerdict(
                false,
                0d,
                ["حجم تصویر بیش از حد مجاز است. تصویر را با کیفیت پایین‌تر بگیرید."],
                new DocumentCaptureQuality(0.5d, 0.5d, 0.5d, false, true, false));
        }

        return _imageAnalyzer.Analyze(content.Span, contentType);
    }

    /// <summary>
    /// Stores a page that passed the quality gate. The bytes go to private storage; the caller only ever
    /// receives an identifier and a digest.
    /// </summary>
    public async Task<Result<CaptureOutcome>> StorePageAsync(
        IdentityDocument document,
        DocumentSide side,
        int pageNumber,
        ReadOnlyMemory<byte> content,
        string contentType,
        Guid tenantId,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(document);

        var verdict = EvaluateCapture(content, contentType);
        if (!verdict.IsAcceptable)
        {
            _logger.LogInformation(
                "Document capture refused for document {DocumentId} side {Side}: quality {Score}.",
                document.Id,
                side,
                verdict.Score);

            return Result<CaptureOutcome>.Success(new CaptureOutcome(false, verdict.Issues, document.Id, null));
        }

        var extension = ExtensionFor(contentType);
        var stored = await _storage.StoreAsync(
            new MemoryStream(content.ToArray(), writable: false),
            contentType,
            extension,
            tenantId,
            document.UserId,
            cancellationToken);

        if (stored.IsFailure)
        {
            return Result<CaptureOutcome>.Failure(IdentityErrors.DocumentStorageFailed());
        }

        var metadata = stored.Value;
        var added = document.AddPage(
            Guid.NewGuid(),
            pageNumber,
            side,
            metadata.StorageKey,
            metadata.ContentType,
            metadata.SizeInBytes,
            metadata.Sha256Hash,
            verdict.NormalizedQuality,
            _clock.UtcNow);

        if (added.IsFailure)
        {
            await _storage.DeleteAsync(metadata.StorageKey, cancellationToken);
            return Result<CaptureOutcome>.Failure(added.FirstError);
        }

        return Result<CaptureOutcome>.Success(new CaptureOutcome(true, Array.Empty<string>(), document.Id, document.Pages[^1].Id));
    }

    /// <summary>
    /// Runs extraction, normalisation, validation and cross-check for every page of a document. The
    /// resulting state is at most <see cref="DocumentStatus.PendingVerification"/>, no matter how
    /// confident the provider claims to be.
    /// </summary>
    public async Task<Result<OcrPipelineOutcome>> RunPipelineAsync(
        IdentityDocument document,
        DocumentType documentType,
        IdentityProfile? profile,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(document);
        ArgumentNullException.ThrowIfNull(documentType);

        if (document.Pages.Count == 0)
        {
            return Result<OcrPipelineOutcome>.Failure(IdentityErrors.DocumentHasNoPages);
        }

        if (documentType.RequiresBackSide && !document.HasSide(DocumentSide.Back))
        {
            return Result<OcrPipelineOutcome>.Failure(IdentityErrors.DocumentSideMissing(nameof(DocumentSide.Back)));
        }

        var providerResult = _ocrResolver.Resolve(documentType.Id);
        if (providerResult.IsFailure)
        {
            return Result<OcrPipelineOutcome>.Failure(IdentityErrors.OcrProviderUnavailable("unconfigured"));
        }

        var provider = providerResult.Value;
        if (!provider.IsAvailable)
        {
            return Result<OcrPipelineOutcome>.Failure(IdentityErrors.OcrProviderUnavailable(provider.Code));
        }

        var pages = new List<OcrPageRequest>(document.Pages.Count);
        foreach (var page in document.Pages)
        {
            var content = await ReadPageAsync(page, cancellationToken);
            if (content.IsFailure)
            {
                return Result<OcrPipelineOutcome>.Failure(IdentityErrors.OcrExtractionFailed());
            }

            pages.Add(new OcrPageRequest(page.Id, content.Value, page.ContentType));
        }

        var extraction = await provider.ExtractAsync(documentType.Id, pages, cancellationToken);
        if (extraction.IsFailure)
        {
            _logger.LogWarning(
                "OCR extraction failed for document {DocumentId} via {Provider}.",
                document.Id,
                provider.Code);
            return Result<OcrPipelineOutcome>.Failure(IdentityErrors.OcrExtractionFailed());
        }

        var now = _clock.UtcNow;
        foreach (var pageResult in extraction.Value.Pages)
        {
            var recorded = document.RecordExtraction(
                Guid.NewGuid(),
                pageResult.PageId,
                pageResult.ProviderCode,
                pageResult.TemplateCode,
                pageResult.RawText,
                pageResult.Fields,
                now,
                pageResult.Confidence);

            if (recorded.IsFailure)
            {
                return Result<OcrPipelineOutcome>.Failure(recorded.FirstError);
            }
        }

        var normalized = IdentityFieldNormalizer.Normalize(extraction.Value.MergeFields());
        if (normalized.Count == 0)
        {
            return Result<OcrPipelineOutcome>.Failure(IdentityErrors.OcrNoFieldsExtracted);
        }

        var applied = document.ApplyNormalizedFields(normalized);
        if (applied.IsFailure)
        {
            return Result<OcrPipelineOutcome>.Failure(applied.FirstError);
        }

        if (profile is not null)
        {
            profile.ApplyOcrExtraction(normalized);
        }

        var crossCheck = IdentityConsistencyChecker.Check(normalized, UserDossierBuilder.ProfileFields(profile));
        profile?.RecordCrossCheckOutcome(crossCheck.IsConsistent, DescribeConflicts(crossCheck));

        var status = crossCheck.IsConsistent
            ? DocumentStatus.PendingVerification
            : DocumentStatus.NeedsReview;

        if (!crossCheck.IsConsistent)
        {
            document.FlagForReview(DescribeConflicts(crossCheck), now, VerificationMethod.IdentityInformationMatch);
        }

        return Result<OcrPipelineOutcome>.Success(
            new OcrPipelineOutcome(document.Id, status, normalized, crossCheck, provider.Code));
    }

    private async Task<Result<ReadOnlyMemory<byte>>> ReadPageAsync(
        DocumentPage page,
        CancellationToken cancellationToken)
    {
        var stream = await _storage.OpenReadAsync(page.StorageKey, cancellationToken);
        if (stream.IsFailure)
        {
            return Result<ReadOnlyMemory<byte>>.Failure(stream.FirstError);
        }

        await using var buffer = stream.Value;
        using var memory = new MemoryStream();
        await buffer.CopyToAsync(memory, cancellationToken);
        return Result<ReadOnlyMemory<byte>>.Success(memory.ToArray());
    }

    private static string DescribeConflicts(IdentityCrossCheckResult crossCheck)
        => crossCheck.Conflicts.Count == 0
            ? string.Empty
            : string.Join(
                "، ",
                crossCheck.Conflicts.Select(conflict =>
                    $"{conflict.Field}: سند «{conflict.DocumentValue ?? "—"}» در برابر پروفایل «{conflict.ProfileValue ?? "—"}»"));

    private static string ExtensionFor(string contentType) => contentType.ToLowerInvariant() switch
    {
        "image/png" => ".png",
        "image/heic" or "image/heif" => ".heic",
        "image/webp" => ".webp",
        "application/pdf" => ".pdf",
        _ => ".jpg"
    };
}
