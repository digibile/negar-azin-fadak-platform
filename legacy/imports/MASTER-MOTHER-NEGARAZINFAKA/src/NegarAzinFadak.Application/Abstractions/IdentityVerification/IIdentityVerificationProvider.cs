using NegarAzinFadak.Core.Primitives;
using NegarAzinFadak.Core.Results;
using NegarAzinFadak.Identity.Domain.Documents;
using NegarAzinFadak.Identity.Domain.Users;

namespace NegarAzinFadak.Application.Abstractions.IdentityVerification;

/// <summary>Evidence a strong verification method worked with.</summary>
/// <param name="Method">Verification method that was applied.</param>
/// <param name="Score">Provider score in the 0..1 range.</param>
/// <param name="ProviderCode">Provider that produced the score.</param>
/// <param name="Reasons">Machine-readable reasons behind the score, for review screens.</param>
public sealed record VerificationEvidence(
    VerificationMethod Method,
    decimal Score,
    string ProviderCode,
    IReadOnlyList<string> Reasons);

/// <summary>Input for a strong verification attempt.</summary>
/// <param name="UserId">Identity being verified.</param>
/// <param name="DocumentId">Document the attempt is based on.</param>
/// <param name="DocumentImage">Bytes of the primary page, for face and tamper checks.</param>
/// <param name="ExpectedMobile">Mobile the platform believes the person owns, for ownership matching.</param>
/// <param name="ExpectedIban">Bank account the platform believes the person owns, when available.</param>
public sealed record VerificationRequest(
    Guid UserId,
    Guid DocumentId,
    ReadOnlyMemory<byte> DocumentImage,
    MobileNumber? ExpectedMobile,
    string? ExpectedIban);

/// <summary>
/// Optional stronger identity verification. The platform works without any of these; when one is
/// configured it strengthens the decision, and when none is configured the pipeline falls back to
/// information matching and human review. No provider is hard-coded.
/// </summary>
public interface IIdentityVerificationProvider
{
    /// <summary>Stable code of the provider.</summary>
    string Code { get; }

    /// <summary>True when the provider is configured, licensed and reachable.</summary>
    bool IsAvailable { get; }

    /// <summary>Methods this provider can perform.</summary>
    IReadOnlyCollection<VerificationMethod> SupportedMethods { get; }

    /// <summary>Runs the requested method and returns the evidence.</summary>
    Task<Result<VerificationEvidence>> VerifyAsync(
        VerificationRequest request,
        VerificationMethod method,
        CancellationToken cancellationToken = default);
}

/// <summary>Captures what a provider believes about a person's identity, for cross-checking against documents.</summary>
/// <param name="NationalId">National identity number the provider reports.</param>
/// <param name="FirstName">Given name the provider reports.</param>
/// <param name="LastName">Family name the provider reports.</param>
/// <param name="DateOfBirth">Date of birth the provider reports.</param>
/// <param name="IsMobileOwner">True when the provider confirms the person owns the submitted mobile.</param>
public sealed record ExternalIdentitySnapshot(
    string? NationalId,
    string? FirstName,
    string? LastName,
    DateOnly? DateOfBirth,
    bool IsMobileOwner);

/// <summary>
/// Authoritative identity source, e.g. a registry or a bank verification service. Optional: when no
/// provider is configured the platform relies on document review and information matching.
/// </summary>
public interface IExternalIdentitySource
{
    /// <summary>Stable code of the source.</summary>
    string Code { get; }

    /// <summary>True when the source is configured and reachable.</summary>
    bool IsAvailable { get; }

    /// <summary>Looks a person up by national identity number.</summary>
    Task<Result<ExternalIdentitySnapshot?>> LookupAsync(
        string nationalId,
        CancellationToken cancellationToken = default);
}
