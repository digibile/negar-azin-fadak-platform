using NegarAzinFadak.Core.Primitives;
using NegarAzinFadak.Core.Results;
using NegarAzinFadak.Identity.Domain.Documents;

namespace NegarAzinFadak.Application.Abstractions.Ocr;

/// <summary>One page submitted to an OCR provider.</summary>
/// <param name="PageId">Identity of the page inside the logical document.</param>
/// <param name="Content">Image bytes, as captured and quality-checked.</param>
/// <param name="ContentType">MIME type of the image.</param>
public sealed record OcrPageRequest(Guid PageId, ReadOnlyMemory<byte> Content, string ContentType);

/// <summary>What one OCR provider reported for a page. Raw output; the platform normalises and cross-checks it.</summary>
/// <param name="PageId">Page the result belongs to.</param>
/// <param name="ProviderCode">Provider that produced the result, for quality reporting.</param>
/// <param name="TemplateCode">Template the provider used, when it is template-driven.</param>
/// <param name="RawText">Full recognised text.</param>
/// <param name="Fields">Field name to raw value, exactly as the provider reported it.</param>
/// <param name="Confidence">Provider confidence in the 0..1 range.</param>
public sealed record OcrPageResult(
    Guid PageId,
    string ProviderCode,
    string? TemplateCode,
    string RawText,
    IReadOnlyDictionary<string, string?> Fields,
    decimal Confidence);

/// <summary>A complete extraction across all pages of one logical document.</summary>
/// <param name="ProviderCode">Provider that produced the extraction.</param>
/// <param name="Pages">Per-page results, in page order.</param>
public sealed record OcrExtractionResult(string ProviderCode, IReadOnlyList<OcrPageResult> Pages)
{
    /// <summary>Merged field values across pages; later pages do not erase earlier ones unless empty.</summary>
    public IReadOnlyDictionary<string, string?> MergeFields()
    {
        var merged = new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase);
        foreach (var page in Pages)
        {
            foreach (var (key, value) in page.Fields)
            {
                if (!string.IsNullOrWhiteSpace(value))
                {
                    merged[key] = value;
                }
            }
        }

        return merged;
    }
}

/// <summary>
/// Provider-agnostic OCR port. The domain never learns which vendor is in use, and adding a vendor is a
/// configuration change plus one adapter.
/// </summary>
public interface IOcrProvider
{
    /// <summary>Stable code of the provider, e.g. <c>azure_read</c> or <c>tesseract_local</c>.</summary>
    string Code { get; }

    /// <summary>True when the provider is configured and reachable right now.</summary>
    bool IsAvailable { get; }

    /// <summary>Document templates this provider supports, matched against <see cref="DocumentType"/> configuration.</summary>
    IReadOnlyCollection<string> SupportedTemplates { get; }

    /// <summary>Extracts text and fields from the pages of one logical document.</summary>
    Task<Result<OcrExtractionResult>> ExtractAsync(
        Guid documentTypeId,
        IReadOnlyList<OcrPageRequest> pages,
        CancellationToken cancellationToken = default);
}

/// <summary>Resolves the OCR provider for a document type, from configuration rather than from code.</summary>
public interface IOcrProviderResolver
{
    /// <summary>Returns the provider configured for the supplied document type, or a failure.</summary>
    Result<IOcrProvider> Resolve(Guid documentTypeId);
}
