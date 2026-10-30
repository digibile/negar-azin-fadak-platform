namespace NegarAzinFadak.Infrastructure.Notifications;

/// <summary>SMS delivery provider selected by configuration.</summary>
public enum SmsProvider
{
    /// <summary>
    /// No provider configured. This is the default precisely so that a host without an explicit choice
    /// fails to start: silently defaulting to a working provider is how production ends up delivering
    /// real one-time codes into a developer's inbox file.
    /// </summary>
    Unconfigured = 0,

    /// <summary>
    /// Local development sink that writes messages to a file. Refuses to run outside the Development
    /// environment; see <see cref="DevelopmentSmsSender"/>.
    /// </summary>
    Development = 1
}
