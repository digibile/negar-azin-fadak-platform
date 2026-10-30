namespace NegarAzinFadak.Core.Tenancy;

/// <summary>
/// Ambient organizational context of the current unit of work. Resolved from the authenticated
/// request by the API layer and from stored job data by background workers; never from client input.
/// </summary>
public interface ITenantContext
{
    /// <summary>Coordinates the current request operates in. <see cref="TenantScope.None"/> when unauthenticated.</summary>
    TenantScope Scope { get; }

    /// <summary>True when the request is running with an authenticated organizational context.</summary>
    bool IsResolved => !Scope.IsEmpty;
}

/// <summary>Mutable holder of the ambient tenant scope, registered as a scoped service.</summary>
public sealed class TenantContext : ITenantContext
{
    private TenantScope _scope = TenantScope.None;

    /// <inheritdoc />
    public TenantScope Scope => _scope;

    /// <summary>Sets the ambient scope for the current unit of work.</summary>
    public void Set(TenantScope scope) => _scope = Guard.AgainstNull(scope);

    /// <summary>
    /// Runs an action against a different scope, restoring the previous one afterwards. Used by
    /// platform-level jobs and cross-tenant administration that must run with an explicit scope.
    /// </summary>
    public IDisposable Use(TenantScope scope)
    {
        ArgumentNullException.ThrowIfNull(scope);
        var previous = _scope;
        _scope = scope;
        return new ScopeRestorer(this, previous);
    }

    private sealed class ScopeRestorer(TenantContext context, TenantScope previous) : IDisposable
    {
        public void Dispose() => context._scope = previous;
    }
}
