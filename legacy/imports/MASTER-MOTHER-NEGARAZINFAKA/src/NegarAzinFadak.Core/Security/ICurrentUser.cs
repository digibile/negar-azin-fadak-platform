using NegarAzinFadak.Core.Tenancy;

namespace NegarAzinFadak.Core.Security;

/// <summary>
/// The authenticated principal of the current request, expressed in domain terms. Application and
/// domain code depends on this interface only, never on <c>HttpContext</c>.
/// </summary>
public interface ICurrentUser
{
    /// <summary>Central identity identifier of the caller, or <see langword="null"/> when anonymous.</summary>
    Guid? UserId { get; }

    /// <summary>True when the caller is authenticated.</summary>
    bool IsAuthenticated { get; }

    /// <summary>Organizational coordinates of the caller.</summary>
    TenantScope Scope { get; }

    /// <summary>Role codes granted to the caller.</summary>
    IReadOnlyCollection<string> Roles { get; }

    /// <summary>Permission codes granted to the caller.</summary>
    IReadOnlyCollection<string> Permissions { get; }

    /// <summary>Correlation identifier of the current request, for audit records and log scoping.</summary>
    string? CorrelationId { get; }

    /// <summary>True when the caller holds the permission, ignoring tenant scope.</summary>
    bool HasPermission(string permission);
}

/// <summary>
/// Mutable principal holder registered as a scoped service. The API layer materialises it from the
/// validated access token; background workers construct it from stored job context.
/// </summary>
public sealed class CurrentUser : ICurrentUser
{
    private readonly HashSet<string> _permissions;

    public CurrentUser(
        Guid? userId,
        TenantScope scope,
        IEnumerable<string>? roles = null,
        IEnumerable<string>? permissions = null,
        string? correlationId = null)
    {
        UserId = userId;
        Scope = Guard.AgainstNull(scope);
        Roles = roles is null ? Array.Empty<string>() : [.. roles];
        _permissions = permissions is null
            ? new HashSet<string>(StringComparer.Ordinal)
            : new HashSet<string>(permissions, StringComparer.Ordinal);
        CorrelationId = correlationId;
    }

    /// <summary>An anonymous principal with no scope, used before authentication and by public endpoints.</summary>
    public static CurrentUser Anonymous { get; } = new(null, TenantScope.None);

    public Guid? UserId { get; }

    public bool IsAuthenticated => UserId.HasValue;

    public TenantScope Scope { get; }

    public IReadOnlyCollection<string> Roles { get; }

    public IReadOnlyCollection<string> Permissions => _permissions;

    public string? CorrelationId { get; }

    public bool HasPermission(string permission)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(permission);
        return _permissions.Contains(permission);
    }
}
