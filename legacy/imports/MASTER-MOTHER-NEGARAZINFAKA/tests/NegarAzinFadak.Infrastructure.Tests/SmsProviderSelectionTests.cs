using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using NegarAzinFadak.Application.Abstractions.Notifications;
using NegarAzinFadak.Core.Time;
using NegarAzinFadak.Infrastructure.Notifications;

namespace NegarAzinFadak.Infrastructure.Tests;

/// <summary>
/// Provider selection is a startup decision, and the combinations that matter are the refusals: a host
/// with no provider, and a host that names the development sink from a shared environment.
/// </summary>
public sealed class SmsProviderSelectionTests
{
    [Fact]
    public void A_host_with_no_provider_configured_refuses_to_start()
    {
        // There is deliberately no default provider. Defaulting to something that works is how a
        // production host ends up quietly delivering codes to a file.
        var exception = Assert.Throws<InvalidOperationException>(
            () => Register(new Dictionary<string, string?>(), "Production"));

        Assert.Contains("No SMS provider is configured", exception.Message, StringComparison.Ordinal);
    }

    [Theory]
    [InlineData("Production")]
    [InlineData("Staging")]
    public void The_development_sink_is_refused_in_a_shared_environment(string environmentName)
    {
        var exception = Assert.Throws<InvalidOperationException>(
            () => Register(
                new Dictionary<string, string?> { ["Sms:Provider"] = "Development" },
                environmentName));

        Assert.Contains("only permitted in the Development environment", exception.Message, StringComparison.Ordinal);
        Assert.Contains("one-time codes", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void The_development_sink_is_accepted_in_development()
    {
        var provider = Register(
            new Dictionary<string, string?> { ["Sms:Provider"] = "Development" },
            "Development");

        Assert.Equal("development-sink", provider.Code);
    }

    [Fact]
    public void An_unknown_provider_is_refused_rather_than_ignored()
    {
        var exception = Assert.Throws<InvalidOperationException>(
            () => Register(
                new Dictionary<string, string?> { ["Sms:Provider"] = "KavehTelecomatic" },
                "Production"));

        Assert.Contains("Unsupported SMS provider", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void The_provider_is_registered_as_a_singleton_so_the_audited_code_is_stable()
    {
        // OtpChallenge records the provider code on a delivered challenge. Resolving a different instance
        // per request would make that audit trail inconsistent.
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddSingleton<IClock, SystemClock>();
        services.AddNegarAzinFadakSms(
            Configuration(new Dictionary<string, string?> { ["Sms:Provider"] = "Development" }),
            new StubEnvironment("Development"));

        using var provider = services.BuildServiceProvider();

        Assert.Same(
            provider.GetRequiredService<ISmsSender>(),
            provider.GetRequiredService<ISmsSender>());
    }

    private static ISmsSender Register(Dictionary<string, string?> settings, string environmentName)
    {
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddSingleton<IClock, SystemClock>();

        services.AddNegarAzinFadakSms(Configuration(settings), new StubEnvironment(environmentName));

        using var provider = services.BuildServiceProvider();
        return provider.GetRequiredService<ISmsSender>();
    }

    private static IConfiguration Configuration(Dictionary<string, string?> settings)
        => new ConfigurationBuilder().AddInMemoryCollection(settings).Build();

    private sealed class StubEnvironment(string environmentName) : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = environmentName;

        public string ApplicationName { get; set; } = "NegarAzinFadak.Tests";

        public string ContentRootPath { get; set; } = AppContext.BaseDirectory;

        public Microsoft.Extensions.FileProviders.IFileProvider ContentRootFileProvider { get; set; }
            = new Microsoft.Extensions.FileProviders.NullFileProvider();
    }
}
