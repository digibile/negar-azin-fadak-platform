using System.Globalization;
using System.Text;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using NegarAzinFadak.Application.Abstractions.Notifications;
using NegarAzinFadak.Core;
using NegarAzinFadak.Core.Primitives;
using NegarAzinFadak.Core.Results;
using NegarAzinFadak.Core.Time;

namespace NegarAzinFadak.Infrastructure.Notifications;

/// <summary>
/// Local development SMS sink: writes each message to a file instead of sending it.
/// </summary>
/// <remarks>
/// <para>
/// This type exists so a developer can complete an SMS flow offline, and it is deliberately hard to
/// switch on by accident. Three independent guards must all pass before it will accept a message:
/// the environment must be <c>Development</c>, the configured provider must be
/// <see cref="SmsProvider.Development"/>, and the inbox path must be writable. The first two are
/// checked in the constructor, so a misconfigured host fails while the container is being built rather
/// than at the moment a real user asks for a code.
/// </para>
/// <para>
/// The message body is never written to a log. It goes to the inbox file and nowhere else, because a log
/// is typically shipped to an aggregator, retained for months and readable by a much wider group of
/// people than the developer who is entitled to the code. The inbox directory is excluded from version
/// control, and the file is created with owner-only permissions where the platform supports it.
/// </para>
/// </remarks>
internal sealed class DevelopmentSmsSender : ISmsSender, IDisposable
{
    /// <summary>Stable provider code recorded on delivered challenges and audit records.</summary>
    internal const string ProviderCode = "development-sink";

    private readonly IHostEnvironment _environment;
    private readonly DevelopmentSmsOptions _options;
    private readonly IClock _clock;
    private readonly ILogger<DevelopmentSmsSender> _logger;

    /// <summary>
    /// Serialises inbox writes. A challenge burst would otherwise interleave two writers into the same
    /// append and corrupt the line a developer is about to read.
    /// </summary>
    private readonly SemaphoreSlim _writeLock = new(1, 1);

    public DevelopmentSmsSender(
        IHostEnvironment environment,
        IOptions<SmsOptions> options,
        IClock clock,
        ILogger<DevelopmentSmsSender> logger)
    {
        _environment = Guard.AgainstNull(environment);
        _clock = Guard.AgainstNull(clock);
        _logger = Guard.AgainstNull(logger);

        var settings = Guard.AgainstNull(options).Value;

        // Guard 1: the environment. Checked in the constructor rather than only at registration so that
        // no code path can obtain a working development sender outside Development.
        if (!_environment.IsDevelopment())
        {
            throw new InvalidOperationException(
                "The development SMS sink may only be constructed in the Development environment. "
                + $"The current environment is '{_environment.EnvironmentName}'. Configure a real SMS gateway "
                + $"via '{SmsOptions.SectionName}:{nameof(SmsOptions.Provider)}' instead.");
        }

        // Guard 2: the configuration still has to ask for this provider. Belt and braces against a
        // registration that resolves the type directly.
        if (settings.Provider != SmsProvider.Development)
        {
            throw new InvalidOperationException(
                $"The development SMS sink requires '{SmsOptions.SectionName}:{nameof(SmsOptions.Provider)}' "
                + $"to be '{SmsProvider.Development}', but it is '{settings.Provider}'.");
        }

        if (string.IsNullOrWhiteSpace(settings.Development.InboxPath))
        {
            throw new InvalidOperationException(
                $"'{DevelopmentSmsOptions.SectionName}:{nameof(DevelopmentSmsOptions.InboxPath)}' is not configured.");
        }

        _options = settings.Development;
    }

    /// <inheritdoc />
    public string Code => ProviderCode;

    /// <summary>Absolute path of the inbox file, resolved once so logs and writes agree.</summary>
    internal string InboxFile => Path.GetFullPath(_options.InboxPath);

    /// <inheritdoc />
    public async Task<Result<NotificationDeliveryResult>> SendAsync(
        MobileNumber target,
        string body,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(target);
        ArgumentException.ThrowIfNullOrWhiteSpace(body);

        var line = ComposeEntry(target, body);

        try
        {
            await _writeLock.WaitAsync(cancellationToken);

            try
            {
                Directory.CreateDirectory(Path.GetDirectoryName(InboxFile)!);
                await EnsureOwnerOnlyPermissions();
                await File.AppendAllTextAsync(InboxFile, line, Encoding.UTF8, cancellationToken);
            }
            finally
            {
                _writeLock.Release();
            }
        }
        catch (Exception exception) when (exception is IOException or UnauthorizedAccessException)
        {
            // The message body is redacted here as well, because an exception from the file layer can
            // quote the line that failed to write.
            _logger.LogError(
                exception,
                "Development SMS sink could not write to {Inbox} for {Target}. Message: {Message}",
                InboxFile,
                target.Masked,
                OtpLogRedaction.Redact(exception.Message));

            return Result<NotificationDeliveryResult>.Failure(
                Error.Unexpected("sms.development_sink_write_failed", "The development SMS sink could not record the message."));
        }

        // The target is already masked by the value object and the body is never logged, so this line is
        // safe at any log level. It records that a code was produced without disclosing it.
        _logger.LogInformation(
            "Development SMS sink recorded a message for {Target} at {Inbox}. The message body is withheld from logs; code: {Code}.",
            target.Masked,
            InboxFile,
            OtpLogRedaction.DescribeCode(ExtractCode(body)));

        return Result<NotificationDeliveryResult>.Success(
            new NotificationDeliveryResult(
                ProviderCode,
                _clock.UtcNow.UtcDateTime.ToString("yyyyMMddHHmmssfff", CultureInfo.InvariantCulture),
                IsSuccess: true,
                FailureReason: null));
    }

    /// <summary>Builds the inbox entry, including the body, which is the whole point of the sink.</summary>
    private string ComposeEntry(MobileNumber target, string body)
        => string.Create(
            CultureInfo.InvariantCulture,
            $"[{_clock.UtcNow:O}] to={target.Masked} provider={ProviderCode}{Environment.NewLine}{body}{Environment.NewLine}{new string('-', 72)}{Environment.NewLine}");

    /// <summary>
    /// Best-effort creation of the inbox file with owner-only permissions.
    /// </summary>
    /// <remarks>
    /// Not supported on Windows, where the file inherits the directory's ACL instead. Failing to tighten
    /// permissions is not worth failing a development send over, so the error is swallowed deliberately.
    /// </remarks>
    private async Task EnsureOwnerOnlyPermissions()
    {
        if (OperatingSystem.IsWindows())
        {
            return;
        }

        if (File.Exists(InboxFile))
        {
            return;
        }

        try
        {
            await File.AppendAllTextAsync(InboxFile, string.Empty, Encoding.UTF8);
            File.SetUnixFileMode(InboxFile, UnixFileMode.UserRead | UnixFileMode.UserWrite);
        }
        catch (Exception exception) when (exception is IOException or UnauthorizedAccessException or PlatformNotSupportedException)
        {
            _logger.LogDebug(exception, "Could not restrict permissions on the development SMS inbox.");
        }
    }

    /// <summary>Recovers the code from a rendered body purely to report its length in the log.</summary>
    private static string? ExtractCode(string body)
    {
        var match = System.Text.RegularExpressions.Regex.Match(body, @"\d{" + MinimumCodeLength + ",}");
        return match.Success ? match.Value : null;
    }

    private const int MinimumCodeLength = 4;

    /// <inheritdoc />
    public void Dispose() => _writeLock.Dispose();
}
