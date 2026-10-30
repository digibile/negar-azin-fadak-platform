using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using NegarAzinFadak.Application.Options;
using NegarAzinFadak.Application.Tenancy;
using NegarAzinFadak.Core;
using NegarAzinFadak.Core.Persistence;
using NegarAzinFadak.Core.Results;
using NegarAzinFadak.Core.Tenancy;
using NegarAzinFadak.Organization.Domain.Menus;
using NegarAzinFadak.Organization.Domain.Roles;

namespace NegarAzinFadak.Application.Navigation;

/// <summary>What one run of the base-structure installer did.</summary>
/// <param name="MenuId">The menu the sections were installed into, or <see langword="null"/> when the deployment declares no base menu.</param>
/// <param name="SectionsAdded">Sections this run created.</param>
/// <param name="SectionsKept">Sections the menu already had and this run left untouched.</param>
/// <param name="SectionsSkipped">Sections this run did not install, because their parent had been withdrawn.</param>
/// <param name="Incomplete">Set when a section the aggregate refused was already partly staged.</param>
public sealed record MenuInstallation(
    Guid? MenuId,
    int SectionsAdded,
    int SectionsKept,
    int SectionsSkipped,
    Error? Incomplete = null);

/// <summary>
/// Installs the configured base menu into a scope, adding only what is missing.
/// </summary>
/// <remarks>
/// <para>
/// This runs twice over the life of a menu: once when a tenant is provisioned, and again whenever a
/// deployment publishes a new base structure. Both runs have to be safe to repeat, so the rule is
/// add-missing-only. A section already present is left exactly as it is — a tenant that retitled a section,
/// reordered it or attached a different permission keeps that, because the alternative is a deploy silently
/// reverting an operator's decisions every time the platform is updated. Adding a new section to a menu that
/// already has fifty of them is the case this is really for.
/// </para>
/// <para>
/// Sections are matched by code among their siblings, and a withdrawn parent is left withdrawn. Neither
/// choice is neutral: matching by title would create a duplicate the moment a tenant translated a heading,
/// and re-activating a parent the operator switched off would undo a decision they made on purpose. The
/// skipped count is reported so a deployment can see that the base structure is not fully present.
/// </para>
/// <para>
/// The installer does not save. It stages its changes and leaves the transaction to its caller, so a menu and
/// the tenant it belongs to are created in one commit — a tenant with a half-installed menu, or a menu whose
/// tenant failed to provision, is not a state either should be able to reach.
/// </para>
/// <para>
/// It is called with an unresolved (platform) session and an explicit target scope. The tenant filter then
/// returns every row and the isolation column is stamped from the aggregate's own organization, which is the
/// only combination that lets a platform process write into a tenant that did not exist when the session
/// started. A session carrying a resolved organization would stamp the menu with the *caller's* organization,
/// and the tenant it was meant for would never see it.
/// </para>
/// </remarks>
public sealed class MenuStructureService
{
    private readonly IRepository<Menu> _menus;
    private readonly IMenuDirectory _directory;
    private readonly IPermissionCatalog _catalog;
    private readonly IOptions<MenuOptions> _options;
    private readonly ILogger<MenuStructureService> _logger;

    public MenuStructureService(
        IRepository<Menu> menus,
        IMenuDirectory directory,
        IPermissionCatalog catalog,
        IOptions<MenuOptions> options,
        ILogger<MenuStructureService> logger)
    {
        _menus = Guard.AgainstNull(menus);
        _directory = Guard.AgainstNull(directory);
        _catalog = Guard.AgainstNull(catalog);
        _options = Guard.AgainstNull(options);
        _logger = Guard.AgainstNull(logger);
    }

    /// <summary>
    /// Brings the menu of <paramref name="scope"/> in line with the configured base structure, adding what is
    /// missing. Returns without saving.
    /// </summary>
    public async Task<Result<MenuInstallation>> InstallAsync(
        TenantScope scope,
        CancellationToken cancellationToken = default)
    {
        var options = _options.Value;

        if (options.IsEmpty)
        {
            // A deployment that declares no base menu provisions an empty menu. Inventing a default here
            // would put links in front of operators that lead nowhere, which is worse than an empty screen.
            return Result<MenuInstallation>.Success(new MenuInstallation(null, 0, 0, 0));
        }

        if (Menu.ResolveLevel(scope) is not { } level)
        {
            return Result<MenuInstallation>.Failure(MenuErrors.MenuScopeInvalid);
        }

        var permissions = await ResolvePermissionsAsync(options.Sections, cancellationToken).ConfigureAwait(false);
        if (permissions.IsFailure)
        {
            return Result<MenuInstallation>.Failure(permissions.Errors);
        }

        var code = Menu.NormalizeCodeForStorage(options.Code);
        var menu = await _directory
            .FindTrackedByCodeAsync(scope, level, code, cancellationToken)
            .ConfigureAwait(false);

        if (menu is null)
        {
            var defined = Menu.Define(
                Guid.NewGuid(),
                scope,
                code,
                options.Title,
                options.EnglishTitle,
                isPlatformDefined: true);

            if (defined.IsFailure)
            {
                return Result<MenuInstallation>.Failure(defined.Errors);
            }

            menu = defined.Value;
            _menus.Add(menu);

            _logger.LogInformation(
                "Base menu {MenuCode} created for organization {OrganizationId} at {MenuLevel} level.",
                menu.Code,
                scope.OrganizationId,
                level);
        }
        else if (!menu.IsActive)
        {
            // Withdrawing the whole menu is an operator's decision, and re-publishing the base structure is not
            // a reason to overrule it. Reported instead of silently succeeding.
            _logger.LogWarning(
                "Base menu {MenuCode} of organization {OrganizationId} is withdrawn; {SectionCount} configured section(s) were not installed.",
                menu.Code,
                scope.OrganizationId,
                CountSections(options.Sections));

            return Result<MenuInstallation>.Success(
                new MenuInstallation(menu.Id, 0, 0, CountSections(options.Sections)));
        }

        var counters = new Counters();
        await InstallSections(
                menu,
                options.Sections,
                parentId: null,
                parentPath: string.Empty,
                permissions.Value,
                counters,
                cancellationToken)
            .ConfigureAwait(false);

        if (counters.Added > 0)
        {
            _logger.LogInformation(
                "Base structure of menu {MenuCode} for organization {OrganizationId}: {Added} section(s) added, {Kept} kept, {Skipped} skipped.",
                menu.Code,
                scope.OrganizationId,
                counters.Added,
                counters.Kept,
                counters.Skipped);
        }

        // Reported rather than raised as a failure: by this point the menu and its items are staged in the
        // caller's unit of work, and a refusal here would be flushed by the caller's own audit record — which
        // would commit a half-installed menu for a tenant that, in the provisioning case, does not exist yet.
        // A tenant with an incomplete menu and a line in the audit trail is diagnosable; an orphan menu
        // pointing at no tenant is not.
        if (counters.Failure is { } incomplete)
        {
            _logger.LogError(
                "Base structure of menu {MenuCode} for organization {OrganizationId} is incomplete: {Reason}",
                menu.Code,
                scope.OrganizationId,
                incomplete.Description);
        }

        return Result<MenuInstallation>.Success(
            new MenuInstallation(menu.Id, counters.Added, counters.Kept, counters.Skipped, counters.Failure));
    }

    private async Task InstallSections(
        Menu menu,
        IReadOnlyCollection<MenuSectionDefinition> sections,
        Guid? parentId,
        string parentPath,
        IReadOnlyDictionary<string, string?> permissions,
        Counters counters,
        CancellationToken cancellationToken)
    {
        foreach (var section in sections)
        {
            var normalized = MenuItem.NormalizeCodeForStorage(section.Code);
            var path = Path(parentPath, section.Code);
            var existing = FindChild(menu, parentId, normalized);

            if (existing is not null)
            {
                counters.Kept++;

                if (!existing.IsActive)
                {
                    // The section was withdrawn, so its subtree is invisible anyway. Re-adding the children
                    // would be adding rows nobody can reach, and re-activating it would overrule the operator.
                    counters.Skipped += CountSections(section.Children);
                    continue;
                }

                await InstallSections(
                        menu,
                        section.Children,
                        existing.Id,
                        path,
                        permissions,
                        counters,
                        cancellationToken)
                    .ConfigureAwait(false);
                continue;
            }

            permissions.TryGetValue(path, out var permission);

            var added = menu.AddItem(
                parentId,
                normalized,
                section.Title,
                section.EnglishTitle,
                section.Icon,
                section.Route,
                section.SortOrder,
                permission,
                section.Module,
                isPlatformDefined: true);

            if (added.IsFailure)
            {
                // Configuration was validated at startup and the caller re-checked each code before adding it,
                // so reaching this means the running process and its configuration disagree. Stopped rather
                // than carried on: the remaining sections would be added under a structure the deployment
                // never asked for, and the record of what happened would no longer explain the menu.
                counters.Failure = added.FirstError;
                return;
            }

            counters.Added++;

            await InstallSections(
                    menu,
                    section.Children,
                    added.Value.Id,
                    path,
                    permissions,
                    counters,
                    cancellationToken)
                .ConfigureAwait(false);
        }
    }

    /// <summary>
    /// Resolves every permission the configured structure requires, so a section that nothing can grant stops
    /// the run instead of being installed invisible.
    /// </summary>
    private async Task<Result<IReadOnlyDictionary<string, string?>>> ResolvePermissionsAsync(
        IReadOnlyCollection<MenuSectionDefinition> sections,
        CancellationToken cancellationToken)
    {
        var resolved = new Dictionary<string, string?>(StringComparer.Ordinal);
        var walked = await ResolveSectionPermissionsAsync(sections, string.Empty, resolved, cancellationToken)
            .ConfigureAwait(false);

        return walked.IsFailure
            ? Result<IReadOnlyDictionary<string, string?>>.Failure(walked.Errors)
            : Result<IReadOnlyDictionary<string, string?>>.Success(resolved);
    }

    private static MenuItem? FindChild(Menu menu, Guid? parentId, string code)
    {
        var siblings = parentId is { } parent ? menu.ChildrenOf(parent) : menu.RootItems();
        return siblings.FirstOrDefault(item => string.Equals(item.Code, code, StringComparison.Ordinal));
    }

    private static int CountSections(IReadOnlyCollection<MenuSectionDefinition> sections)
        => sections.Sum(section => 1 + CountSections(section.Children));

    /// <summary>
    /// Resolves one level of the declared structure, then its children.
    /// </summary>
    /// <remarks>
    /// Walked with the tree rather than flattened into a queue because a section's identity is its path, not
    /// its code. Codes are unique among siblings and may repeat in different branches, and the two sections
    /// sharing a code may require different permissions. Keyed by code alone, the first one resolved would be
    /// handed to both, and a branch would be granted a capability its own declaration never asked for.
    /// </remarks>
    private async Task<Result> ResolveSectionPermissionsAsync(
        IReadOnlyCollection<MenuSectionDefinition> sections,
        string parentPath,
        Dictionary<string, string?> resolved,
        CancellationToken cancellationToken)
    {
        foreach (var section in sections)
        {
            if (!string.IsNullOrWhiteSpace(section.RequiredPermissionCode))
            {
                var code = section.RequiredPermissionCode.Trim();
                var permission = await _catalog.FindAsync(code, cancellationToken).ConfigureAwait(false);
                if (permission is null || !permission.IsActive)
                {
                    return Result.Failure(MenuErrors.StructurePermissionUnknown(section.Code, code));
                }

                resolved[Path(parentPath, section.Code)] = permission.Code;
            }

            var walked = await ResolveSectionPermissionsAsync(
                    section.Children,
                    Path(parentPath, section.Code),
                    resolved,
                    cancellationToken)
                .ConfigureAwait(false);

            if (walked.IsFailure)
            {
                return walked;
            }
        }

        return Result.Success();
    }

    /// <summary>
    /// Identity of a configured section within the declared structure: its path from the root.
    /// </summary>
    /// <remarks>
    /// Both the resolution pass and the installation walk build this the same way, so a resolved permission
    /// is the one the section that asked for it receives.
    /// </remarks>
    private static string Path(string parentPath, string code)
        => parentPath.Length is 0
            ? code.Trim().ToLowerInvariant()
            : $"{parentPath}/{code.Trim().ToLowerInvariant()}";

    private sealed class Counters
    {
        public int Added { get; set; }

        public int Kept { get; set; }

        public int Skipped { get; set; }

        public Error? Failure { get; set; }
    }
}
