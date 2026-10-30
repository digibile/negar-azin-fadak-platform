using NegarAzinFadak.Core.Primitives;
using NegarAzinFadak.Core.Results;

namespace NegarAzinFadak.Application.Abstractions.Notifications;

/// <summary>Channel a notification is delivered over. Channels come from configuration, not from <c>if</c> statements.</summary>
public enum NotificationChannel
{
    /// <summary>Delivered inside the platform and shown in the notification centre.</summary>
    InApp = 0,

    /// <summary>Delivered as an SMS.</summary>
    Sms = 1,

    /// <summary>Delivered by email.</summary>
    Email = 2,

    /// <summary>Delivered as a mobile push notification.</summary>
    Push = 3
}

/// <summary>A notification to deliver.</summary>
/// <param name="Channel">Delivery channel.</param>
/// <param name="Target">Mobile number, email address or device token, depending on the channel.</param>
/// <param name="TemplateCode">Data-driven template code; the body is rendered by the notification service.</param>
/// <param name="TemplateData">Values substituted into the template. Never contains raw secrets.</param>
/// <param name="Locale">BCP-47 locale of the recipient, used to pick the template variant.</param>
public sealed record NotificationRequest(
    NotificationChannel Channel,
    string Target,
    string TemplateCode,
    IReadOnlyDictionary<string, string> TemplateData,
    string Locale = "fa-IR");

/// <summary>Result of a delivery attempt, kept for notification-centre history and provider troubleshooting.</summary>
/// <param name="ProviderCode">Provider that handled the attempt.</param>
/// <param name="ProviderMessageId">Provider-side identifier, for support and reconciliation.</param>
/// <param name="IsSuccess">True when the provider accepted the message.</param>
/// <param name="FailureReason">Why the attempt failed, without leaking sensitive content.</param>
public sealed record NotificationDeliveryResult(
    string ProviderCode,
    string? ProviderMessageId,
    bool IsSuccess,
    string? FailureReason);

/// <summary>SMS/OTP delivery port. Vendor-neutral so that the platform never depends on one gateway.</summary>
public interface ISmsSender
{
    /// <summary>Stable code of the configured gateway.</summary>
    string Code { get; }

    /// <summary>Sends a text message to a mobile number in E.164 form.</summary>
    Task<Result<NotificationDeliveryResult>> SendAsync(
        MobileNumber target,
        string body,
        CancellationToken cancellationToken = default);
}

/// <summary>Email delivery port.</summary>
public interface IEmailSender
{
    /// <summary>Stable code of the configured mail gateway.</summary>
    string Code { get; }

    /// <summary>Sends a message to an email address.</summary>
    Task<Result<NotificationDeliveryResult>> SendAsync(
        string emailAddress,
        string subject,
        string body,
        CancellationToken cancellationToken = default);
}

/// <summary>Push notification port.</summary>
public interface IPushSender
{
    /// <summary>Stable code of the configured push gateway.</summary>
    string Code { get; }

    /// <summary>Sends a push notification to a device token.</summary>
    Task<Result<NotificationDeliveryResult>> SendAsync(
        string deviceToken,
        string title,
        string body,
        IReadOnlyDictionary<string, string> data,
        CancellationToken cancellationToken = default);
}
