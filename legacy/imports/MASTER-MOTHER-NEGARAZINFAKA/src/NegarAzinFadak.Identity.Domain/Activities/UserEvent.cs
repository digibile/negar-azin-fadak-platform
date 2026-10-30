using NegarAzinFadak.Core;
using NegarAzinFadak.Core.Domain;
using NegarAzinFadak.Core.Tenancy;
using NegarAzinFadak.Core.Time;
using NegarAzinFadak.Identity.Domain.Authentication;
using NegarAzinFadak.Identity.Domain.Documents;
using NegarAzinFadak.Identity.Domain.Users;

namespace NegarAzinFadak.Identity.Domain.Activities;

/// <summary>
/// Business and system events that make up a person's timeline. Entries are produced by real domain and
/// integration events, never by hand-written fixtures, so the dossier tells the truth about what happened.
/// </summary>
public enum UserEventCategory
{
    /// <summary>Account creation, mobile change, closure.</summary>
    Account = 0,

    /// <summary>OTP issues, verifications, failures and lockouts.</summary>
    Authentication = 1,

    /// <summary>Document uploads, extractions and verification decisions.</summary>
    Identity = 2,

    /// <summary>Digital folder activity.</summary>
    Document = 3,

    /// <summary>Commercial activity, recorded by the owning module.</summary>
    Business = 4,

    /// <summary>Support and workflow activity.</summary>
    Service = 5,

    /// <summary>Security-relevant occurrences such as suspicious sign-ins.</summary>
    Security = 6
}

/// <summary>
/// Kind of occurrence on the timeline. The code is data, so a new module can contribute an event type
/// without changing the identity module, and reporting can group by whatever it needs.
/// </summary>
public sealed class UserEventType : Entity
{
    private UserEventType()
    {
        Code = string.Empty;
        TitlePersian = string.Empty;
    }

    public UserEventType(string code, UserEventCategory category, string titlePersian, string? icon = null)
    {
        Code = Guard.AgainstNullOrWhiteSpace(code).Trim().ToLowerInvariant();
        Category = category;
        TitlePersian = Guard.AgainstNullOrWhiteSpace(titlePersian);
        Icon = string.IsNullOrWhiteSpace(icon) ? null : icon.Trim();
    }

    /// <summary>Stable snake_case code, e.g. <c>identity.document_verified</c>.</summary>
    public string Code { get; private set; }

    public UserEventCategory Category { get; private set; }

    public string TitlePersian { get; private set; }

    /// <summary>Icon hint for the client, so the timeline stays consistent across modules.</summary>
    public string? Icon { get; private set; }
}

/// <summary>One occurrence on a person's timeline.</summary>
public sealed class UserEvent : Entity, ITenantScoped
{
    private UserEvent()
    {
        TypeCode = string.Empty;
        SourceModule = string.Empty;
        Title = string.Empty;
        Scope = TenantScope.None;
        Metadata = new Dictionary<string, string>(StringComparer.Ordinal);
    }

    internal UserEvent(
        Guid id,
        Guid userId,
        TenantScope scope,
        string typeCode,
        UserEventCategory category,
        string title,
        string? description,
        string sourceModule,
        DateTimeOffset occurredAt,
        Guid? actorUserId,
        string? correlationId,
        IReadOnlyDictionary<string, string>? metadata = null)
    {
        AssignId(id);
        UserId = Guard.AgainstEmpty(userId);
        Scope = Guard.AgainstNull(scope);
        TypeCode = Guard.AgainstNullOrWhiteSpace(typeCode);
        Category = category;
        Title = Guard.AgainstNullOrWhiteSpace(title);
        Description = string.IsNullOrWhiteSpace(description) ? null : description.Trim();
        SourceModule = Guard.AgainstNullOrWhiteSpace(sourceModule);
        OccurredAt = occurredAt;
        ActorUserId = actorUserId;
        CorrelationId = string.IsNullOrWhiteSpace(correlationId) ? null : correlationId.Trim();
        Metadata = metadata is null
            ? new Dictionary<string, string>(StringComparer.Ordinal)
            : new Dictionary<string, string>(metadata, StringComparer.Ordinal);
    }

    /// <summary>Central identity the event belongs to. Every timeline entry is anchored here.</summary>
    public Guid UserId { get; private set; }

    public TenantScope Scope { get; private set; } = TenantScope.None;

    public string TypeCode { get; private set; } = string.Empty;

    public UserEventCategory Category { get; private set; }

    /// <summary>Persian summary shown on the timeline.</summary>
    public string Title { get; private set; } = string.Empty;

    public string? Description { get; private set; }

    /// <summary>Module that produced the event, e.g. <c>identity</c>, <c>credit</c>, <c>sales</c>.</summary>
    public string SourceModule { get; private set; }

    public DateTimeOffset OccurredAt { get; private set; }

    /// <summary>User that caused the event; null for system-originated events.</summary>
    public Guid? ActorUserId { get; private set; }

    /// <summary>Request correlation identifier, so a support agent can trace the exact request.</summary>
    public string? CorrelationId { get; private set; }

    /// <summary>Structured extra data. Never contains raw document bytes or full identity secrets.</summary>
    public IReadOnlyDictionary<string, string> Metadata { get; private set; } = new Dictionary<string, string>(StringComparer.Ordinal);

    /// <summary>Records an event on the timeline. The only way timeline entries come into existence.</summary>
    public static UserEvent Record(
        Guid id,
        Guid userId,
        TenantScope scope,
        string typeCode,
        UserEventCategory category,
        string title,
        string? description,
        string sourceModule,
        DateTimeOffset occurredAt,
        Guid? actorUserId = null,
        string? correlationId = null,
        IReadOnlyDictionary<string, string>? metadata = null)
        => new(id, userId, scope, typeCode, category, title, description, sourceModule, occurredAt, actorUserId, correlationId, metadata);
}

/// <summary>
/// A person's ordered history. Building the timeline by querying recorded events — rather than by
/// assembling a narrative in the UI — is what keeps the dossier and the audit trail the same truth.
/// </summary>
public sealed class UserTimeline
{
    private readonly IReadOnlyList<UserEvent> _events;

    public UserTimeline(Guid userId, IReadOnlyList<UserEvent> events)
    {
        UserId = Guard.AgainstEmpty(userId);
        _events = events;
    }

    public Guid UserId { get; }

    /// <summary>Events, most recent first.</summary>
    public IReadOnlyList<UserEvent> Events => _events;

    /// <summary>Events of one category, most recent first.</summary>
    public IReadOnlyList<UserEvent> In(UserEventCategory category)
        => _events.Where(@event => @event.Category == category).ToList().AsReadOnly();

    /// <summary>Events inside a time window, most recent first.</summary>
    public IReadOnlyList<UserEvent> Between(DateTimeOffset from, DateTimeOffset to)
        => _events.Where(@event => @event.OccurredAt >= from && @event.OccurredAt <= to)
            .ToList()
            .AsReadOnly();
}

/// <summary>Helper that derives timeline entries from domain events, keeping the mapping in one place.</summary>
public static class UserEventRecorder
{
    /// <summary>Records an OTP issuance on the timeline without ever including the code itself.</summary>
    public static UserEvent OtpIssued(
        Guid userId,
        TenantScope scope,
        OtpPurpose purpose,
        DateTimeOffset at,
        Guid? actorUserId,
        string? correlationId)
        => UserEvent.Record(
            Guid.NewGuid(),
            userId,
            scope,
            "authentication.otp_issued",
            UserEventCategory.Authentication,
            "درخواست کد تأیید",
            $"کد یک‌بار مصرف برای «{purpose}» ارسال شد.",
            "identity",
            at,
            actorUserId,
            correlationId,
            new Dictionary<string, string>(StringComparer.Ordinal) { ["purpose"] = purpose.ToString() });

    /// <summary>Records a document verification decision on the timeline.</summary>
    public static UserEvent DocumentDecision(
        Guid userId,
        TenantScope scope,
        Guid documentId,
        DocumentStatus status,
        DateTimeOffset at,
        Guid? actorUserId,
        string? correlationId)
        => UserEvent.Record(
            Guid.NewGuid(),
            userId,
            scope,
            $"identity.document_{status.ToString().ToLowerInvariant()}",
            UserEventCategory.Identity,
            status switch
            {
                DocumentStatus.Verified => "تأیید مدرک",
                DocumentStatus.Rejected => "رد مدرک",
                DocumentStatus.NeedsReview => "مدرک نیازمند بررسی",
                DocumentStatus.Expired => "انقضای مدرک",
                _ => "بررسی مدرک"
            },
            status switch
            {
                DocumentStatus.Verified => "مدرک با موفقیت تأیید شد.",
                DocumentStatus.Rejected => "مدرک رد شد.",
                DocumentStatus.NeedsReview => "مدرک برای بررسی کارشناس ارسال شد.",
                DocumentStatus.Expired => "مدرک منقضی شد.",
                _ => null
            },
            "identity",
            at,
            actorUserId,
            correlationId,
            new Dictionary<string, string>(StringComparer.Ordinal) { ["documentId"] = documentId.ToString() });
}
