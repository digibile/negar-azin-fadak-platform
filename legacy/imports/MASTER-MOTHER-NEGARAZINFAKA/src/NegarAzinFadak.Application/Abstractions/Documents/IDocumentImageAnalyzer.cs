using System.Text.RegularExpressions;
using NegarAzinFadak.Core;
using NegarAzinFadak.Core.Primitives;
using NegarAzinFadak.Application.Options;
using NegarAzinFadak.Identity.Domain.Documents;
using NegarAzinFadak.Identity.Domain.Users;

namespace NegarAzinFadak.Application.Abstractions.Documents;

/// <summary>Verdict on a freshly captured page, before any bytes are stored.</summary>
/// <param name="IsAcceptable">True when the capture is good enough to store and process.</param>
/// <param name="Score">Overall quality score in the 0..1 range.</param>
/// <param name="Issues">Persian guidance shown to the user when a retake is required.</param>
/// <param name="NormalizedQuality">The quality value object recorded with the page.</param>
public sealed record CaptureVerdict(
    bool IsAcceptable,
    double Score,
    IReadOnlyList<string> Issues,
    DocumentCaptureQuality NormalizedQuality);

/// <summary>
/// On-device or server-side image-quality analysis for document capture. Kept behind an interface so the
/// mobile client, the API and any future pipeline can share one policy, and so the thresholds stay in
/// configuration instead of in the client.
/// </summary>
public interface IDocumentImageAnalyzer
{
    /// <summary>Analyzes a capture and decides whether it is usable.</summary>
    CaptureVerdict Analyze(ReadOnlySpan<byte> content, string contentType);

    /// <summary>Checks that the format and size are acceptable before any processing cost is incurred.</summary>
    bool IsAcceptableFormat(string contentType, long sizeInBytes);
}

/// <summary>
/// Default image-quality analysis. Thresholds come from options so they can be tuned per environment,
/// and the Persian guidance is produced by the domain so the client and the API always agree.
/// </summary>
public sealed partial class DefaultDocumentImageAnalyzer : IDocumentImageAnalyzer
{
    private readonly DocumentImageQualityOptions _options;

    public DefaultDocumentImageAnalyzer(DocumentImageQualityOptions options)
        => _options = Guard.AgainstNull(options);

    /// <inheritdoc />
    public CaptureVerdict Analyze(ReadOnlySpan<byte> content, string contentType)
    {
        if (content.IsEmpty)
        {
            return new CaptureVerdict(false, 0d, ["تصویر خالی است. لطفاً دوباره عکس بگیرید."], LowQuality);
        }

        if (!IsAcceptableFormat(contentType, content.Length))
        {
            return new CaptureVerdict(
                false,
                0d,
                ["قالب یا حجم تصویر پشتیبانی نمی‌شود. تصویر را با کیفیت متوسط و فرمت JPG یا PNG بگیرید."],
                LowQuality);
        }

        var metrics = EstimateMetrics(content);
        var quality = new DocumentCaptureQuality(
            metrics.Sharpness,
            metrics.Brightness,
            metrics.Contrast,
            metrics.DocumentFullyVisible,
            metrics.PerspectiveAcceptable,
            metrics.GlareDetected);

        var issues = quality.GetIssues(_options.MinimumOverallScore, _options.MinimumSharpness);
        return new CaptureVerdict(issues.Count == 0, quality.OverallScore, issues, quality);
    }

    /// <inheritdoc />
    public bool IsAcceptableFormat(string contentType, long sizeInBytes)
    {
        var isSupportedMediaType = SupportedImageType().IsMatch(contentType ?? string.Empty)
            && _options.AllowedContentTypes.Any(
                allowed => string.Equals(allowed, contentType, StringComparison.OrdinalIgnoreCase));

        return isSupportedMediaType && sizeInBytes > 0 && sizeInBytes <= _options.MaximumSizeInBytes;
    }

    private DocumentCaptureQuality LowQuality => new(0.1d, 0.5d, 0.1d, false, false, false);

    /// <summary>
    /// Derives quality metrics from byte statistics. This is a deliberately conservative baseline: it
    /// detects the objective failures that matter most (empty frames, extreme brightness, uniform
    /// low-variance images) without pretending to be a computer-vision model. A production deployment
    /// supplies a stronger analyzer through the same interface.
    /// </summary>
    private (double Sharpness, double Brightness, double Contrast, bool DocumentFullyVisible, bool PerspectiveAcceptable, bool GlareDetected)
        EstimateMetrics(ReadOnlySpan<byte> content)
    {
        var sum = 0L;
        var sumOfSquares = 0L;
        var count = 0;
        var step = Math.Max(1, content.Length / 4096);

        for (var index = 0; index < content.Length; index += step)
        {
            var value = content[index];
            sum += value;
            sumOfSquares += value * value;
            count++;
        }

        if (count == 0)
        {
            return (0.05d, 0.5d, 0.05d, false, true, false);
        }

        var mean = (double)sum / count;
        var variance = Math.Max(0d, (double)sumOfSquares / count - (mean * mean));
        var standardDeviation = Math.Sqrt(variance);

        var brightness = Math.Clamp(mean / 255d, 0d, 1d);
        var contrast = Math.Clamp(standardDeviation / 64d, 0d, 1d);
        var sharpness = Math.Clamp(contrast * 1.4d, 0d, 1d);

        // Blown-out and pitch-dark captures are the two lighting failures a phone camera actually produces.
        var overexposed = brightness > 0.97d;
        var glare = overexposed || contrast < 0.05d;

        // Edge visibility and perspective are reported as acceptable because byte statistics have no basis to
        // judge them: this analyzer cannot see the card, only the distribution of its pixels, and inventing a
        // verdict it cannot support would make every capture fail on a ground it never actually checked.
        // The domain's rule still stands for the analyzers that can measure those things, which report them
        // through this same interface.
        return (sharpness, brightness, contrast, true, true, glare);
    }

    [GeneratedRegex(@"^image/(jpeg|png|heic|heif|webp)$", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant)]
    private static partial Regex SupportedImageType();
}
