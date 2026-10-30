namespace NegarAzinFadak.Infrastructure.Notifications;

/// <summary>SMS provider selection and settings, read from the <c>Sms</c> section.</summary>
public sealed class SmsOptions
{
    /// <summary>Configuration section name.</summary>
    public const string SectionName = "Sms";

    /// <summary>
    /// Provider to deliver through. There is no usable default: <see cref="SmsProvider.Unconfigured"/>
    /// makes the host refuse to start.
    /// </summary>
    public SmsProvider Provider { get; set; } = SmsProvider.Unconfigured;

    /// <summary>Settings specific to the local development sink.</summary>
    public DevelopmentSmsOptions Development { get; set; } = new();
}

/// <summary>Settings for the local development SMS sink.</summary>
public sealed class DevelopmentSmsOptions
{
    /// <summary>Configuration section name.</summary>
    public const string SectionName = "Sms:Development";

    /// <summary>
    /// Directory the sink writes delivered messages into. Kept out of version control so a real code
    /// can never be committed, and created on demand.
    /// </summary>
    public string InboxPath { get; set; } = Path.Combine("App_Data", "sms-inbox");
}
