namespace NegarAzinFadak.Application.Options;

/// <summary>
/// Password sign-in policy, bound from the <c>SignIn</c> configuration section.
/// </summary>
/// <remarks>
/// These are security thresholds, so they are deployment data rather than constants in the use case. A
/// platform that needs a stricter lockout changes configuration; the sign-in use case is not edited, and
/// no threshold is ever hard-coded in an <c>if</c> statement.
/// </remarks>
public sealed class SignInOptions
{
    /// <summary>Configuration section name.</summary>
    public const string SectionName = "SignIn";

    /// <summary>
    /// Consecutive failed attempts after which the identity is suspended. Reaching it costs the caller a
    /// legitimate account, so it is deliberately generous; the endpoint is also rate limited per caller.
    /// </summary>
    public int MaxFailedAttempts { get; set; } = 10;

    /// <summary>
    /// Shortest password the platform will store. Enforced on the way in, so a weak credential cannot be
    /// introduced through an administrative path that skips the registration flow.
    /// </summary>
    public int MinimumPasswordLength { get; set; }  = 12;
}
