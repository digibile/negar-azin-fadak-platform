using NegarAzinFadak.Core.Paging;
using NegarAzinFadak.Core.Results;
using NegarAzinFadak.Core.Tenancy;

namespace NegarAzinFadak.Application.Abstractions.Ai;

/// <summary>A question or instruction from an operator, in natural language.</summary>
/// <param name="Prompt">The operator's question or instruction.</param>
/// <param name="Scope">Organizational coordinates the answer must stay inside.</param>
/// <param name="Locale">Requested answer locale, e.g. <c>fa-IR</c>.</param>
public sealed record AiPrompt(string Prompt, TenantScope Scope, string Locale = "fa-IR");

/// <summary>An AI answer, with the provenance a regulated platform must be able to show.</summary>
/// <param name="Content">The answer text.</param>
/// <param name="ProviderCode">Provider that produced the answer.</param>
/// <param name="ModelCode">Model that produced the answer, for reproducibility.</param>
/// <param name="DataSources">Tables and documents the answer was computed from.</param>
/// <param name="Confidence">Provider confidence in the 0..1 range.</param>
public sealed record AiAnswer(
    string Content,
    string ProviderCode,
    string ModelCode,
    IReadOnlyList<string> DataSources,
    decimal Confidence);

/// <summary>
/// Enterprise AI port. Every implementation must receive already-authorised, tenant-filtered data and
/// must never receive a request that would let it widen the caller's access. The AI capability is a
/// consumer of authorized queries, never a bypass around authorization.
/// </summary>
public interface IAiProvider
{
    /// <summary>Stable code of the provider.</summary>
    string Code { get; }

    /// <summary>True when the provider is configured and reachable.</summary>
    bool IsAvailable { get; }

    /// <summary>Capabilities the provider supports, e.g. <c>summarise</c>, <c>classify</c>, <c>extract</c>.</summary>
    IReadOnlyCollection<string> Capabilities { get; }

    /// <summary>Answers a prompt using the supplied, already-authorised facts.</summary>
    Task<Result<AiAnswer>> CompleteAsync(
        AiPrompt prompt,
        IReadOnlyList<string> authorisedContext,
        CancellationToken cancellationToken = default);
}

/// <summary>Authorized business data handed to the AI engine for analysis.</summary>
/// <param name="Name">Logical name of the dataset, e.g. <c>overdue_installments</c>.</param>
/// <param name="Rows">The rows the caller is allowed to see.</param>
public sealed record AiDataset(string Name, IReadOnlyList<IReadOnlyDictionary<string, string?>> Rows);

/// <summary>A management-level analysis the AI engine can produce, e.g. risky installments or sales trends.</summary>
/// <param name="TitlePersian">Persian title shown in the dashboard.</param>
/// <param name="Summary">The narrative insight.</param>
/// <param name="Highlights">Concrete data points behind the insight.</param>
/// <param name="Confidence">Confidence in the 0..1 range.</param>
public sealed record BusinessInsight(
    string TitlePersian,
    string Summary,
    IReadOnlyList<string> Highlights,
    decimal Confidence);

/// <summary>Analytics port used by the dashboard and by the enterprise assistant.</summary>
public interface IBusinessInsightProvider
{
    /// <summary>Produces insights for a dashboard section, using only tenant-scoped, authorized data.</summary>
    Task<Result<IReadOnlyList<BusinessInsight>>> GenerateAsync(
        string sectionCode,
        TenantScope scope,
        IReadOnlyList<AiDataset> datasets,
        CancellationToken cancellationToken = default);
}
