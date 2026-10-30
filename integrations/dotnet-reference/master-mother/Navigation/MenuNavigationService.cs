using Microsoft.Extensions.Logging;
using NegarAzinFadak.Core;
using NegarAzinFadak.Core.Results;
using NegarAzinFadak.Core.Security;
using NegarAzinFadak.Core.Tenancy;
using NegarAzinFadak.Organization.Domain.Menus;

namespace NegarAzinFadak.Application.Navigation;

/// <summary>
/// Answers "what may this operator navigate to".
/// </summary>
/// <remarks>
/// <para>
/// The tenant and the granted permissions both come from the validated session, never from the request. A
/// body or a query string that could name a permission would make navigation a property of client behaviour,
/// and the one client bug that omitted the check would show an operator sections their role does not open.
/// The permission filtering therefore happens here, on the platform's own reading of the token, and the
/// client renders what it is given.
/// </para>
/// <para>
/// This is the effective view. The administration view, which keeps items the caller cannot reach so a
/// screen can show what is withdrawn and who can reach it, is <see cref="ReadStructureAsync"/> behind the
/// menu administration permission. Collapsing the two would make it impossible to find out why a section is
/// not appearing.
/// </para>
/// </remarks>
public sealed class MenuNavigationService
{
    private readonly IMenuDirectory _directory;
    private readonly ICurrentUser _currentUser;
    private readonly ILogger<MenuNavigationService> _logger;

    public MenuNavigationService(
        IMenuDirectory directory,
        ICurrentUser currentUser,
        ILogger<MenuNavigationService> logger)
    {
        _directory = Guard.AgainstNull(directory);
        _currentUser = Guard.AgainstNull(currentUser);
        _logger = Guard.AgainstNull(logger);
    }

    /// <summary>Reads the navigation the caller is entitled to, filtered to the permissions their token carries.</summary>
    public async Task<Result<EffectiveMenuTree>> ReadAsync(CancellationToken cancellationToken = default)
    {
        var scope = _currentUser.Scope;
        if (scope.IsEmpty)
        {
            return Result<EffectiveMenuTree>.Failure(NavigationErrors.OutsideTenant);
        }

        var menus = await _directory.ListVisibleAsync(scope, cancellationToken).ConfigureAwait(false);
        var tree = MenuTreeBuilder.Build(menus, _currentUser.Permissions);

        _logger.LogDebug(
            "Navigation read for organization {OrganizationId}: {MenuCount} menu(s), {SectionCount} section(s).",
            scope.OrganizationId,
            tree.Menus.Count,
            tree.SectionCount);

        return Result<EffectiveMenuTree>.Success(tree);
    }

    /// <summary>
    /// Reads the full structure that applies to the caller, including sections their roles do not open.
    /// </summary>
    /// <remarks>
    /// Permission filtering is deliberately not applied here. The caller of this read is administering the
    /// menu, and the question they are answering is usually exactly which section is missing or which one
    /// nobody can reach — neither of which is visible in the effective tree.
    /// </remarks>
    public async Task<Result<IReadOnlyList<MenuTree>>> ReadStructureAsync(
        CancellationToken cancellationToken = default)
    {
        var scope = _currentUser.Scope;
        if (scope.IsEmpty)
        {
            return Result<IReadOnlyList<MenuTree>>.Failure(NavigationErrors.OutsideTenant);
        }

        var menus = await _directory.ListVisibleAsync(scope, cancellationToken).ConfigureAwait(false);

        // Withdrawn menus and sections are kept, and marked. An administration screen is asked the question the
        // filtered tree cannot answer — why is this section not appearing — and dropping the withdrawn entries
        // is the one answer that guarantees it stays unanswered.
        return Result<IReadOnlyList<MenuTree>>.Success(
            menus
                .OrderBy(menu => menu.Level)
                .ThenBy(menu => menu.Code, StringComparer.Ordinal)
                .Select(menu => MenuTreeBuilder.BuildOne(menu))
                .ToArray()
                .AsReadOnly());
    }
}

/// <summary>Stable error codes of the navigation use cases that are not the domain's own.</summary>
public static class NavigationErrors
{
    public const string OutsideTenantCode = "navigation.outside_tenant";
    public const string MenuOutsideTenantCode = "navigation.menu.outside_tenant";
    public const string MenuReadRequiredCode = "navigation.menu.read_required";

    public static Error OutsideTenant
        => Error.Forbidden(OutsideTenantCode, "The navigation tree is read inside a tenant, and this request has no tenant.");

    public static Error MenuOutsideTenant
        => Error.Forbidden(MenuOutsideTenantCode, "The menu belongs to another tenant.");

    public static Error ReadPermissionRequired(string code)
        => Error.Forbidden(
            MenuReadRequiredCode,
            $"Reading this menu needs '{code}', which the caller's roles do not grant.");
}
