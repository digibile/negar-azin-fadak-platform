using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using NegarAzinFadak.Application.Abstractions.Notifications;
using NegarAzinFadak.Core.Primitives;
using NegarAzinFadak.Core.Results;
using NegarAzinFadak.Core.Time;
using NegarAzinFadak.Infrastructure.Notifications;

namespace NegarAzinFadak.Infrastructure.Tests;

/// <summary>
/// The development SMS sink writes real one-time codes to a local file. These tests pin the two
/// properties that make that acceptable: it cannot run outside Development, and it never puts a code
/// where the rest of the platform's logs can see it.
/// </summary>
public sealed class DevelopmentSmsSinkTests : IDisposable
{
    private const string Code = "481902";

    private const string Production = "Production";
    private const string Staging = "Staging";
    private const string Development = "Development";
    private static readonly MobileNumber Target = MobileNumber.Create("09121110000");

    private readonly string _inboxDirectory =
        Path.Combine(Path.GetTempPath(), $"negar-sms-tests-{Guid.NewGuid():N}");

    private readonly List<CapturedLog> _logs = [];

    public void Dispose()
    {
        if (Directory.Exists(_inboxDirectory))
        {
            Directory.Delete(_inboxDirectory, recursive: true);
        }

        GC.SuppressFinalize(this);
    }

    [Theory]
    [InlineData(Production)]
    [InlineData(Staging)]
    [InlineData("QA")]
    public void The_sink_refuses_to_be_constructed_outside_development(string environmentName)
    {
        // This is the guarantee that matters most: even a host that somehow resolved the development
        // sender in production would fail here, rather than writing customers' codes to its disk.
        var exception = Assert.Throws<InvalidOperationException>(
            () => CreateSender(new StubEnvironment(environmentName)));

        Assert.Contains("Development", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void The_sink_is_constructed_in_development()
    {
        using var sender = CreateSender(new StubEnvironment(Development));

        Assert.Equal("development-sink", sender.Code);
    }

    [Fact]
    public void The_sink_refuses_a_configuration_that_did_not_ask_for_it()
    {
        // Guards against a registration that resolves the type directly, bypassing provider selection.
        var options = Options.Create(new SmsOptions { Provider = SmsProvider.Unconfigured });

        Assert.Throws<InvalidOperationException>(
            () => new DevelopmentSmsSender(
                new StubEnvironment(Development),
                options,
                new FixedClock(DateTimeOffset.Parse("2026-03-01T10:00:00Z", null)),
                CreateLogger()));
    }

    [Fact]
    public async Task The_message_body_reaches_the_inbox_so_a_developer_can_complete_the_flow()
    {
        using var sender = CreateSender(new StubEnvironment(Development));

        var result = await sender.SendAsync(Target, $"کد ورود شما: {Code}");

        Assert.True(result.IsSuccess);
        Assert.True(result.Value.IsSuccess);

        var inbox = await File.ReadAllTextAsync(sender.InboxFile);
        Assert.Contains(Code, inbox, StringComparison.Ordinal);
        Assert.Contains(Target.Masked, inbox, StringComparison.Ordinal);
    }

    [Fact]
    public async Task The_message_body_is_never_written_to_a_log()
    {
        // A log is shipped, retained and read by far more people than the developer entitled to the
        // code, so the body must not appear there at any level.
        using var sender = CreateSender(new StubEnvironment(Development));

        await sender.SendAsync(Target, $"کد ورود شما: {Code}");

        Assert.NotEmpty(_logs);
        Assert.All(_logs, entry => Assert.DoesNotContain(Code, entry.Message, StringComparison.Ordinal));
    }

    [Fact]
    public async Task A_logged_entry_records_that_a_code_exists_without_disclosing_it()
    {
        using var sender = CreateSender(new StubEnvironment(Development));

        await sender.SendAsync(Target, $"کد ورود شما: {Code}");

        var entry = Assert.Single(_logs);
        Assert.Contains("withheld", entry.Message, StringComparison.Ordinal);
        Assert.Contains(Target.Masked, entry.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Concurrent_sends_do_not_interleave_in_the_inbox()
    {
        using var sender = CreateSender(new StubEnvironment(Development));

        await Task.WhenAll(Enumerable.Range(0, 25)
            .Select(index => sender.SendAsync(Target, $"کد {index:D6}")));

        var lines = await File.ReadAllLinesAsync(sender.InboxFile);

        // Every entry is a header, a body and a separator, so a torn write would not divide evenly.
        Assert.Equal(0, lines.Length % 3);
    }

    [Fact]
    public async Task A_write_failure_is_reported_without_quoting_the_code()
    {
        // A directory where the inbox file should be: the append cannot succeed against it.
        var blockedPath = Path.Combine(_inboxDirectory, "blocked");
        Directory.CreateDirectory(blockedPath);

        using var sender = CreateSender(new StubEnvironment(Development), inboxPath: blockedPath);

        var result = await sender.SendAsync(Target, $"کد ورود شما: {Code}");

        Assert.True(result.IsFailure);
        Assert.Equal(ErrorType.Unexpected, result.FirstError.Type);
        Assert.All(_logs, entry => Assert.DoesNotContain(Code, entry.Message, StringComparison.Ordinal));
    }

    [Fact]
    public void Redaction_removes_digit_runs_but_keeps_surrounding_text()
    {
        var redacted = OtpLogRedaction.Redact("کد 481902 تا ساعت 5 دقیقه");

        Assert.DoesNotContain("481902", redacted, StringComparison.Ordinal);
        Assert.Contains("کد", redacted, StringComparison.Ordinal);
        Assert.Contains("دقیقه", redacted, StringComparison.Ordinal);
    }

    [Fact]
    public void Describing_a_code_reports_its_length_and_nothing_else()
    {
        var described = OtpLogRedaction.DescribeCode("481902");

        Assert.DoesNotContain("481902", described, StringComparison.Ordinal);
        Assert.Contains("6", described, StringComparison.Ordinal);
        Assert.Equal("absent", OtpLogRedaction.DescribeCode(null));
    }

    private DevelopmentSmsSender CreateSender(
        IHostEnvironment environment,
        string? inboxPath = null)
    {
        var options = Options.Create(new SmsOptions
        {
            Provider = SmsProvider.Development,
            Development = new DevelopmentSmsOptions
            {
                InboxPath = inboxPath ?? Path.Combine(_inboxDirectory, "inbox.txt")
            }
        });

        return new DevelopmentSmsSender(
            environment,
            options,
            new FixedClock(DateTimeOffset.Parse("2026-03-01T10:00:00Z", null)),
            CreateLogger());
    }

    private ILogger<DevelopmentSmsSender> CreateLogger()
        => LoggerFactory
            .Create(builder => builder.AddProvider(new CapturingProvider(_logs)))
            .CreateLogger<DevelopmentSmsSender>();

    private sealed record CapturedLog(string Message);

    private sealed class CapturingProvider(List<CapturedLog> sink) : ILoggerProvider
    {
        public ILogger CreateLogger(string categoryName) => new CapturingLogger(sink);

        public void Dispose()
        {
            // Nothing unmanaged to release.
        }

        private sealed class CapturingLogger(List<CapturedLog> sink) : ILogger
        {
            public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;

            public bool IsEnabled(LogLevel logLevel) => true;

            public void Log<TState>(
                LogLevel logLevel,
                EventId eventId,
                TState state,
                Exception? exception,
                Func<TState, Exception?, string> formatter)
            {
                var message = formatter(state, exception);

                if (exception is not null)
                {
                    message += " " + exception.Message;
                }

                sink.Add(new CapturedLog(message));
            }
        }
    }

    private sealed class StubEnvironment(string environmentName) : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = environmentName;

        public string ApplicationName { get; set; } = "NegarAzinFadak.Tests";

        public string ContentRootPath { get; set; } = AppContext.BaseDirectory;

        public Microsoft.Extensions.FileProviders.IFileProvider ContentRootFileProvider { get; set; }
            = new Microsoft.Extensions.FileProviders.NullFileProvider();
    }
}
