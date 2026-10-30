using NegarAzinFadak.Core.Domain;
using NegarAzinFadak.Core.Messaging;
using NegarAzinFadak.Core.Tenancy;
using NegarAzinFadak.Identity.Domain.Authentication;
using NegarAzinFadak.Identity.Domain.Documents;
using NegarAzinFadak.Identity.Domain.Users;

namespace NegarAzinFadak.Identity.Domain.Events;

/// <summary>A person was registered in the central identity registry.</summary>
public sealed record UserRegistered(
    Guid EventId,
    DateTimeOffset OccurredAt,
    Guid UserId,
    TenantScope Scope,
    string MaskedMobile,
    UserSource Source) : DomainEvent(EventId, OccurredAt);

/// <summary>A mobile number was proven by a one-time code.</summary>
public sealed record MobileOwnershipConfirmed(
    Guid EventId,
    DateTimeOffset OccurredAt,
    Guid UserId,
    TenantScope Scope,
    string MaskedMobile,
    OtpPurpose Purpose) : DomainEvent(EventId, OccurredAt);

/// <summary>Identity data was submitted from a document and is awaiting confirmation or review.</summary>
public sealed record IdentityDataSubmitted(
    Guid EventId,
    DateTimeOffset OccurredAt,
    Guid UserId,
    Guid DocumentId,
    TenantScope Scope,
    IReadOnlyList<IdentityField> SubmittedFields) : DomainEvent(EventId, OccurredAt);

/// <summary>The master identity profile passed verification and became trusted master data.</summary>
public sealed record IdentityVerified(
    Guid EventId,
    DateTimeOffset OccurredAt,
    Guid UserId,
    Guid DocumentId,
    TenantScope Scope,
    VerificationMethod Method) : DomainEvent(EventId, OccurredAt);

/// <summary>Identity verification was refused; the profile must not be used as master data.</summary>
public sealed record IdentityVerificationFailed(
    Guid EventId,
    DateTimeOffset OccurredAt,
    Guid UserId,
    Guid DocumentId,
    TenantScope Scope,
    DocumentStatus Status,
    string ReasonCode) : DomainEvent(EventId, OccurredAt);

/// <summary>A document reached a decided state, verified or refused.</summary>
public sealed record DocumentVerificationDecided(
    Guid EventId,
    DateTimeOffset OccurredAt,
    Guid UserId,
    Guid DocumentId,
    Guid DocumentTypeId,
    TenantScope Scope,
    DocumentStatus Status,
    VerificationMethod Method,
    DateOnly? ExpiresOn) : DomainEvent(EventId, OccurredAt);

/// <summary>A document passed its expiry date and stopped being usable.</summary>
public sealed record DocumentExpired(
    Guid EventId,
    DateTimeOffset OccurredAt,
    Guid UserId,
    Guid DocumentId,
    TenantScope Scope,
    DateOnly ExpiredOn) : DomainEvent(EventId, OccurredAt);

/// <summary>A document will expire soon and notifications must be raised.</summary>
public sealed record DocumentExpiringSoon(
    Guid EventId,
    DateTimeOffset OccurredAt,
    Guid UserId,
    Guid DocumentId,
    TenantScope Scope,
    DateOnly ExpiresOn,
    int DaysRemaining) : DomainEvent(EventId, OccurredAt);

/// <summary>A new version of a document replaced a previous one.</summary>
public sealed record DocumentReplaced(
    Guid EventId,
    DateTimeOffset OccurredAt,
    Guid UserId,
    Guid PreviousDocumentId,
    Guid NewDocumentId,
    TenantScope Scope) : DomainEvent(EventId, OccurredAt);

/// <summary>
/// Published across module boundaries so that CRM, credit, sales and notifications react to a person
/// becoming verifiable without importing identity internals.
/// </summary>
public sealed record UserBecameVerified(
    Guid EventId,
    DateTimeOffset OccurredAt,
    TenantScope Scope,
    Guid UserId,
    Guid VerifiedDocumentId,
    VerificationMethod Method) : IntegrationEvent(EventId, OccurredAt, Scope);

/// <summary>Published when a person is registered, so downstream modules can open their own profiles.</summary>
public sealed record UserRegisteredIntegration(
    Guid EventId,
    DateTimeOffset OccurredAt,
    TenantScope Scope,
    Guid UserId,
    UserSource Source) : IntegrationEvent(EventId, OccurredAt, Scope);

/// <summary>Published when a document is refused, so risk and credit modules can react.</summary>
public sealed record DocumentRefusedIntegration(
    Guid EventId,
    DateTimeOffset OccurredAt,
    TenantScope Scope,
    Guid UserId,
    Guid DocumentId,
    DocumentStatus Status) : IntegrationEvent(EventId, OccurredAt, Scope);

/// <summary>Published when a document expires, so business processes can demand a replacement.</summary>
public sealed record DocumentExpiredIntegration(
    Guid EventId,
    DateTimeOffset OccurredAt,
    TenantScope Scope,
    Guid UserId,
    Guid DocumentId,
    DateOnly ExpiredOn) : IntegrationEvent(EventId, OccurredAt, Scope);
