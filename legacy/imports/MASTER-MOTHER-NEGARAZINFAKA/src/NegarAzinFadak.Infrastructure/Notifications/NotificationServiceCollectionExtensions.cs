using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;
using NegarAzinFadak.Application.Abstractions.Notifications;
using NegarAzinFadak.Core;

namespace NegarAzinFadak.Infrastructure.Notifications;

/// <summary>Registers the configured SMS provider, refusing unsafe combinations at startup.</summary>
public static class NotificationServiceCollectionExtensions
{
    /// <summary>
    /// Wires the SMS provider named by configuration.
    /// </summary>
    /// <remarks>
    /// Selection happens here and nowhere else, so the provider in use is always the one the configuration
    /// names. Every misconfiguration throws while the container is being built rather than at the moment a
    /// real user requests a one-time code, when the failure would be both late and the most visible it can
    /// possibly be.
    /// <para>
    /// The two refusals that matter: no provider configured at all, and the development sink requested
    /// outside Development. The second is the one that would otherwise deliver real customers' codes into
    /// a file on a developer's laptop.
    /// </para>
    /// </remarks>
    /// <exception cref="InvalidOperationException">The configuration is missing or unsafe.</exception>
    public static IServiceCollection AddNegarAzinFadakSms(
        this IServiceCollection services,
        IConfiguration configuration,
        IHostEnvironment environment)
    {
        ArgumentNullException.ThrowIfNull(services);
        ArgumentNullException.ThrowIfNull(configuration);
        ArgumentNullException.ThrowIfNull(environment);

        // The sink's own guard needs the environment resolved from the container. Registering it here
        // makes this extension self-sufficient: without it, the sender would only activate inside a full
        // host, and any other composition root would fail with a confusing resolution error instead of
        // the explicit refusal its constructor is written to give.
        services.TryAddSingleton(environment);

        services.AddOptions<SmsOptions>()
            .Bind(configuration.GetSection(SmsOptions.SectionName));

        var provider = ReadProvider(configuration);

        switch (provider)
        {
            case SmsProvider.Development:
                RequireDevelopmentEnvironment(environment);
                services.AddSingleton<ISmsSender, DevelopmentSmsSender>();
                break;

            case SmsProvider.Unconfigured:
                throw new InvalidOperationException(
                    $"No SMS provider is configured. Set '{SmsOptions.SectionName}:{nameof(SmsOptions.Provider)}' "
                    + $"to '{SmsProvider.Development}' for local development, or to a real gateway in a shared "
                    + "environment. There is no default, so a host that forgets this cannot deliver codes.");

            default:
                throw new InvalidOperationException(
                    $"Unsupported SMS provider '{provider}'. Known providers: "
                    + $"{nameof(SmsProvider.Development)}.");
        }

        return services;
    }

    /// <summary>
    /// Reads the provider from the raw configuration value rather than through the options binder.
    /// </summary>
    /// <remarks>
    /// The binder would convert a typo into its own conversion exception before the switch could report
    /// it, leaving an operator with a message about type conversion instead of one naming the setting and
    /// the valid choices.
    /// </remarks>
    private static SmsProvider ReadProvider(IConfiguration configuration)
    {
        var configured = configuration[$"{SmsOptions.SectionName}:{nameof(SmsOptions.Provider)}"];

        if (string.IsNullOrWhiteSpace(configured))
        {
            return SmsProvider.Unconfigured;
        }

        if (!Enum.TryParse(configured, ignoreCase: true, out SmsProvider provider) || !Enum.IsDefined(provider))
        {
            throw new InvalidOperationException(
                $"Unsupported SMS provider '{configured}'. Known providers: "
                + $"{nameof(SmsProvider.Development)}.");
        }

        return provider;
    }

    private static void RequireDevelopmentEnvironment(IHostEnvironment environment)
    {
        if (environment.IsDevelopment())
        {
            return;
        }

        throw new InvalidOperationException(
            $"'{SmsOptions.SectionName}:{nameof(SmsOptions.Provider)}' is '{SmsProvider.Development}', which is only "
            + $"permitted in the Development environment, but the current environment is '{environment.EnvironmentName}'. "
            + "Refusing to start: the development sink writes one-time codes to a local file and must never be "
            + "reachable from a shared or production environment.");
    }
}
