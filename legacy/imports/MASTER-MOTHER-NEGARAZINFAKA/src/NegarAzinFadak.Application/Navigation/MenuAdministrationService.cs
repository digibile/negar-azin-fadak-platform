using Microsoft.Extensions.Logging;
using NegarAzinFadak.Application.Auditing;
using NegarAzinFadak.Application.Tenancy;
using NegarAzinFadak.Core;
using NegarAzinFadak.Core.Persistence;
using NegarAzinFadak.Core.Results;
using NegarAzinFadak.Core.Tenancy;
using NegarAzinFadak.Organization.Domain.Menus;
using NegarAzinFadak.Organization.Domain.Roles;

namespace NegarAzinFadak.Application.Navigation;

/// <summary>Everything an operator states when creating a section.</summary>
/// <param name="Code">Stable code, unique among the siblings it is added next to.</param>
/// <param name="Title">Display title.</param>
/// <param name="EnglishTitle">English title, when the platform produces one.</param>
/// <param name="Icon">Icon name for the client to draw.</param>
/// <param name="Route">Client route the item opens, or null for a pure grouping item.</param>
/// <param name="SortOrder">Position among its siblings.</param>
/// <param name="RequiredPermissionCode">Catalog permission a caller must hold, or null for none.</param>
/// <param name="Module">Module the item opens.</param>
public sealed record MenuItemDraft(
    string Code,
    string Title,
    string? EnglishTitle,
    string? Icon,
    string? Route,
    int SortOrder,
    string? RequiredPermissionCode,
    string? Module);

/// <summary>
/// Everything an operator states when changing a section in place. The code is absent on purpose: it is
/// addressed by a separate operation, because it is the key the sibling-uniqueness rule is computed
/// against.
/// </summary>
/// <param name="Title">Display title.</param>
/// <param name="EnglishTitle">English title, when the platform produces one.</param>
/// <param name="Icon">Icon name for the client to draw.</param>
/// <param name="Route">Client route the item opens, or null for a pure grouping item.</param>
/// <param name="SortOrder">Position among its siblings.</param>
/// <param name="RequiredPermissionCode">Catalog permission a caller must hold, or null for none.</param>
/// <param name="Module">Module the item opens.</param>
public sealed record MenuItemEdit(
    string Title,
    string? EnglishTitle,
    string? Icon,
    string? Route,
    int SortOrder,
    string? RequiredPermissionCode,
    string? Module);

/// <summary>
/// Defines and maintains the navigation menus of the caller's own level.
/// </summary>
/// <remarks>
/// <para>
/// Every method resolves its menu through the tenant-filtered directory and then re-checks the level against
/// the caller's own session, so a menu of another organization, or of another level inside this one, is
/// reported as absent rather than modified. The domain is not asked to decide this: it knows nothing about
/// who is calling, and a use case that did not check would leave the check to whichever endpoint happened to
/// call it first.
/// </para>
/// <para>
/// A required permission code is resolved against the catalog before the item is accepted. A menu entry
/// naming a code nothing can grant is invisible to every operator while looking perfectly correct in an
/// administration screen, which is the failure this check exists to prevent — the same rule role grants are
/// held to.
/// </para>
/// <para>
/// Field validation happens here, before anything is attached to the unit of work, for two reasons. The
/// aggregate expresses length limits by refusing, which is right inside a domain test and wrong at an HTTP
/// boundary, where a caller who typed a 300-character title deserves a 400 rather than a 500. And a refusal
/// flushes its audit record immediately, so a half-built item left in the change tracker would be committed
/// with it.
/// </para>
/// </remarks>
public sealed class MenuAdministrationService
{
    /// <summary>Longest title a menu or a section may carry, matching the column that stores it.</summary>
    private const int MaximumTitleLength = 256;

    /// <summary>Longest client route a section may carry, matching the column that stores it.</summary>
    private const int MaximumRouteLength = 256;

    private readonly IRepository<Menu> _menus;
    private readonly IMenuDirectory _directory;
    private readonly IPermissionCatalog _catalog;
    private readonly IUnitOfWork _unitOfWork;
    private readonly AuditTrailWriter _audit;
    private readonly ILogger<MenuAdministrationService> _logger;

    public MenuAdministrationService(
        IRepository<Menu> menus,
        IMenuDirectory directory,
        IPermissionCatalog catalog,
        IUnitOfWork unitOfWork,
        AuditTrailWriter audit,
        ILogger<MenuAdministrationService> logger)
    {
        _menus = Guard.AgainstNull(menus);
        _directory = Guard.AgainstNull(directory);
        _catalog = Guard.AgainstNull(catalog);
        _unitOfWork = Guard.AgainstNull(unitOfWork);
        _audit = Guard.AgainstNull(audit);
        _logger = Guard.AgainstNull(logger);
    }

    /// <summary>Defines a menu for the level the caller's own session addresses.</summary>
    /// <param name="code">Stable code, unique at this level within the tenant.</param>
    /// <param name="title">Display title.</param>
    /// <param name="englishTitle">English title, when the platform produces one.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <remarks>
    /// The level is never taken from the request. It follows from the caller's session, so a body that named
    /// a company or a brand would let a tenant administrator write a menu that every company would then see.
    /// </remarks>
    public async Task<Result<Menu>> DefineAsync(
        string code,
        string title,
        string? englishTitle,
        CancellationToken cancellationToken = default)
    {
        var scope = _audit.Scope;
        var target = string.IsNullOrWhiteSpace(code) ? "menus" : code.Trim();

        if (Menu.ResolveLevel(scope) is not { } level)
        {
            return await DeniedAsync(
                TenantAuditActions.MenuDefine,
                ResourceTypes.Menu,
                target,
                Result<Menu>.Failure(MenuErrors.MenuScopeInvalid),
                cancellationToken).ConfigureAwait(false);
        }

        if (string.IsNullOrWhiteSpace(code))
        {
            return await DeniedAsync(
                TenantAuditActions.MenuDefine,
                ResourceTypes.Menu,
                target,
                Result<Menu>.Failure(MenuErrors.MenuCodeInvalid),
                cancellationToken).ConfigureAwait(false);
        }

        if (string.IsNullOrWhiteSpace(title))
        {
            return await DeniedAsync(
                TenantAuditActions.MenuDefine,
                ResourceTypes.Menu,
                target,
                Result<Menu>.Failure(MenuErrors.MenuTitleInvalid),
                cancellationToken).ConfigureAwait(false);
        }

        if (code.Trim().Length > 64)
        {
            return await DeniedAsync(
                TenantAuditActions.MenuDefine,
                ResourceTypes.Menu,
                target,
                Result<Menu>.Failure(MenuErrors.MenuCodeInvalid),
                cancellationToken).ConfigureAwait(false);
        }

        if (title.Trim().Length > MaximumTitleLength || (englishTitle?.Trim().Length ?? 0) > MaximumTitleLength)
        {
            // Both titles are held in bounded columns, and the bound is checked here because the alternative is
            // a write that fails on one database provider and truncates on another.
            return await DeniedAsync(
                TenantAuditActions.MenuDefine,
                ResourceTypes.Menu,
                target,
                Result<Menu>.Failure(MenuErrors.MenuTitleInvalid),
                cancellationToken).ConfigureAwait(false);
        }

        var normalized = Menu.NormalizeCodeForStorage(code);

        // Checked here rather than left to the unique index: a repeated definition is an expected outcome, and
        // the caller has to hear it in the platform's vocabulary instead of receiving a 500 for something they
        // did on purpose.
        if (await _directory.CodeExistsAsync(scope, level, normalized, cancellationToken).ConfigureAwait(false))
        {
            return await DeniedAsync(
                TenantAuditActions.MenuDefine,
                ResourceTypes.Menu,
                normalized,
                Result<Menu>.Failure(MenuErrors.MenuCodeExists(normalized)),
                cancellationToken).ConfigureAwait(false);
        }

        var defined = Menu.Define(Guid.NewGuid(), scope, normalized, title, englishTitle);
        if (defined.IsFailure)
        {
            return await DeniedAsync(
                TenantAuditActions.MenuDefine,
                ResourceTypes.Menu,
                normalized,
                defined,
                cancellationToken).ConfigureAwait(false);
        }

        var menu = defined.Value;
        _menus.Add(menu);

        await RecordAsync(
            TenantAuditActions.MenuDefine,
            ResourceTypes.Menu,
            menu.Id,
            new Dictionary<string, string?>
            {
                ["code"] = menu.Code,
                ["level"] = menu.Level.ToString(),
                ["organizationId"] = scope.OrganizationId.ToString()
            },
            cancellationToken).ConfigureAwait(false);
        await _unitOfWork.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        _logger.LogInformation(
            "Menu {MenuCode} defined at {MenuLevel} level for organization {OrganizationId}.",
            menu.Code,
            menu.Level,
            scope.OrganizationId);

        return Result<Menu>.Success(menu);
    }

    /// <summary>Adds a section to a menu, optionally nested under an existing item of the same menu.</summary>
    public async Task<Result<MenuItem>> AddItemAsync(
        Guid menuId,
        Guid? parentId,
        MenuItemDraft draft,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(draft);

        var loaded = await LoadAsync(menuId, cancellationToken).ConfigureAwait(false);
        if (loaded.IsFailure)
        {
            return await DeniedAsync<MenuItem>(
                TenantAuditActions.MenuItemAdd,
                ResourceTypes.MenuItem,
                draft.Code,
                Result<MenuItem>.Failure(loaded.Errors),
                cancellationToken).ConfigureAwait(false);
        }

        var fields = Validate(draft);
        if (fields.IsFailure)
        {
            return await DeniedAsync<MenuItem>(
                TenantAuditActions.MenuItemAdd,
                ResourceTypes.MenuItem,
                draft.Code,
                Result<MenuItem>.Failure(fields.Errors),
                cancellationToken).ConfigureAwait(false);
        }

        var permission = await ResolvePermissionAsync(draft.RequiredPermissionCode, draft.Code, cancellationToken)
            .ConfigureAwait(false);
        if (permission.IsFailure)
        {
            return await DeniedAsync<MenuItem>(
                TenantAuditActions.MenuItemAdd,
                ResourceTypes.MenuItem,
                draft.Code,
                Result<MenuItem>.Failure(permission.Errors),
                cancellationToken).ConfigureAwait(false);
        }

        var added = loaded.Value.AddItem(
            parentId,
            draft.Code,
            draft.Title,
            draft.EnglishTitle,
            draft.Icon,
            draft.Route,
            draft.SortOrder,
            permission.Value,
            draft.Module,
            isPlatformDefined: false);

        if (added.IsFailure)
        {
            return await DeniedAsync<MenuItem>(
                TenantAuditActions.MenuItemAdd,
                ResourceTypes.MenuItem,
                draft.Code,
                added,
                cancellationToken).ConfigureAwait(false);
        }

        var item = added.Value;
        await RecordAsync(
            TenantAuditActions.MenuItemAdd,
            ResourceTypes.MenuItem,
            item.Id,
            new Dictionary<string, string?>
            {
                ["code"] = item.Code,
                ["menuId"] = loaded.Value.Id.ToString(),
                ["module"] = item.Module,
                ["depth"] = item.Depth.ToString(System.Globalization.CultureInfo.InvariantCulture),
                ["permission"] = item.RequiredPermissionCode
            },
            cancellationToken).ConfigureAwait(false);
        await _unitOfWork.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        _logger.LogInformation(
            "Menu section {ItemCode} added to menu {MenuCode} at depth {Depth}.",
            item.Code,
            loaded.Value.Code,
            item.Depth);

        return Result<MenuItem>.Success(item);
    }

    /// <summary>Changes the descriptive fields, the ordering and the permission requirement of a section.</summary>
    public async Task<Result> UpdateItemAsync(
        Guid menuId,
        Guid itemId,
        MenuItemEdit edit,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(edit);

        var loaded = await LoadAsync(menuId, cancellationToken).ConfigureAwait(false);
        if (loaded.IsFailure)
        {
            return await DeniedAsync(
                TenantAuditActions.MenuItemUpdate,
                ResourceTypes.MenuItem,
                itemId.ToString(),
                Result.Failure(loaded.Errors),
                cancellationToken).ConfigureAwait(false);
        }

        // The item is looked up first. Reporting the fields as invalid when the caller addressed a section
        // that is not there would answer a question they did not ask, and would do it in the vocabulary of a
        // mistake they did not make.
        var existing = loaded.Value.FindItem(itemId);
        if (existing is null)
        {
            return await DeniedAsync(
                TenantAuditActions.MenuItemUpdate,
                ResourceTypes.MenuItem,
                itemId.ToString(),
                Result.Failure(MenuErrors.ItemNotFound(itemId.ToString())),
                cancellationToken).ConfigureAwait(false);
        }

        // Carrying the current code through the same validation an addition goes through, so an in-place
        // change cannot smuggle in a value a new section would have been refused for.
        var fields = Validate(
            edit.Title, edit.EnglishTitle, edit.Icon, edit.Route, edit.SortOrder, edit.Module);
        if (fields.IsFailure)
        {
            return await DeniedAsync(
                TenantAuditActions.MenuItemUpdate,
                ResourceTypes.MenuItem,
                itemId.ToString(),
                fields,
                cancellationToken).ConfigureAwait(false);
        }

        var permission = await ResolvePermissionAsync(edit.RequiredPermissionCode, null, cancellationToken)
            .ConfigureAwait(false);
        if (permission.IsFailure)
        {
            return await DeniedAsync(
                TenantAuditActions.MenuItemUpdate,
                ResourceTypes.MenuItem,
                itemId.ToString(),
                Result.Failure(permission.Errors),
                cancellationToken).ConfigureAwait(false);
        }

        var updated = loaded.Value.UpdateItem(
            itemId,
            edit.Title,
            edit.EnglishTitle,
            edit.Icon,
            edit.Route,
            edit.SortOrder,
            permission.Value,
            edit.Module);

        if (updated.IsFailure)
        {
            return await DeniedAsync(
                TenantAuditActions.MenuItemUpdate,
                ResourceTypes.MenuItem,
                itemId.ToString(),
                updated,
                cancellationToken).ConfigureAwait(false);
        }

        await RecordAsync(
            TenantAuditActions.MenuItemUpdate,
            ResourceTypes.MenuItem,
            itemId,
            new Dictionary<string, string?>
            {
                ["menuId"] = loaded.Value.Id.ToString(),
                ["permission"] = permission.Value
            },
            cancellationToken).ConfigureAwait(false);
        await _unitOfWork.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        return Result.Success();
    }

    /// <summary>Changes a section's code, which is what the base structure and audit records refer to it by.</summary>
    public async Task<Result> RecodeItemAsync(
        Guid menuId,
        Guid itemId,
        string code,
        CancellationToken cancellationToken = default)
    {
        var loaded = await LoadAsync(menuId, cancellationToken).ConfigureAwait(false);
        if (loaded.IsFailure)
        {
            return await DeniedAsync(
                TenantAuditActions.MenuItemRecode,
                ResourceTypes.MenuItem,
                itemId.ToString(),
                Result.Failure(loaded.Errors),
                cancellationToken).ConfigureAwait(false);
        }

        if (string.IsNullOrWhiteSpace(code) || code.Trim().Length > 64)
        {
            return await DeniedAsync(
                TenantAuditActions.MenuItemRecode,
                ResourceTypes.MenuItem,
                itemId.ToString(),
                Result.Failure(MenuErrors.ItemCodeInvalid),
                cancellationToken).ConfigureAwait(false);
        }

        var recoded = loaded.Value.UpdateItemCode(itemId, code);
        if (recoded.IsFailure)
        {
            return await DeniedAsync(
                TenantAuditActions.MenuItemRecode,
                ResourceTypes.MenuItem,
                itemId.ToString(),
                recoded,
                cancellationToken).ConfigureAwait(false);
        }

        await RecordAsync(
            TenantAuditActions.MenuItemRecode,
            ResourceTypes.MenuItem,
            itemId,
            new Dictionary<string, string?> { ["code"] = MenuItem.NormalizeCodeForStorage(code) },
            cancellationToken).ConfigureAwait(false);
        await _unitOfWork.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        return Result.Success();
    }

    /// <summary>Moves a section, and its subtree, under a different parent of the same menu.</summary>
    public async Task<Result> MoveItemAsync(
        Guid menuId,
        Guid itemId,
        Guid? newParentId,
        CancellationToken cancellationToken = default)
    {
        var loaded = await LoadAsync(menuId, cancellationToken).ConfigureAwait(false);
        if (loaded.IsFailure)
        {
            return await DeniedAsync(
                TenantAuditActions.MenuItemMove,
                ResourceTypes.MenuItem,
                itemId.ToString(),
                Result.Failure(loaded.Errors),
                cancellationToken).ConfigureAwait(false);
        }

        var moved = loaded.Value.MoveItem(itemId, newParentId);
        if (moved.IsFailure)
        {
            return await DeniedAsync(
                TenantAuditActions.MenuItemMove,
                ResourceTypes.MenuItem,
                itemId.ToString(),
                moved,
                cancellationToken).ConfigureAwait(false);
        }

        await RecordAsync(
            TenantAuditActions.MenuItemMove,
            ResourceTypes.MenuItem,
            itemId,
            new Dictionary<string, string?>
            {
                ["parentId"] = newParentId?.ToString(),
                ["menuId"] = loaded.Value.Id.ToString()
            },
            cancellationToken).ConfigureAwait(false);
        await _unitOfWork.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        return Result.Success();
    }

    /// <summary>Shows a section in navigation again.</summary>
    public Task<Result> ActivateItemAsync(Guid menuId, Guid itemId, CancellationToken cancellationToken = default)
        => ChangeItemAsync(
            menuId,
            itemId,
            menu => menu.ActivateItem(itemId),
            TenantAuditActions.MenuItemActivate,
            cancellationToken);

    /// <summary>Hides a section from navigation, keeping its children in place.</summary>
    public Task<Result> DeactivateItemAsync(Guid menuId, Guid itemId, CancellationToken cancellationToken = default)
        => ChangeItemAsync(
            menuId,
            itemId,
            menu => menu.DeactivateItem(itemId),
            TenantAuditActions.MenuItemDeactivate,
            cancellationToken);

    /// <summary>Removes a section that has no children and is not part of the platform base structure.</summary>
    public Task<Result> RemoveItemAsync(Guid menuId, Guid itemId, CancellationToken cancellationToken = default)
        => ChangeItemAsync(
            menuId,
            itemId,
            menu => menu.RemoveItem(itemId),
            TenantAuditActions.MenuItemRemove,
            cancellationToken);

    /// <summary>Withdraws a whole menu from navigation, keeping its structure.</summary>
    public async Task<Result> DeactivateMenuAsync(Guid menuId, CancellationToken cancellationToken = default)
    {
        var loaded = await LoadAsync(menuId, cancellationToken).ConfigureAwait(false);
        if (loaded.IsFailure)
        {
            return await DeniedAsync(
                TenantAuditActions.MenuDeactivate, ResourceTypes.Menu, menuId.ToString(), Result.Failure(loaded.Errors), cancellationToken)
                .ConfigureAwait(false);
        }

        var deactivated = loaded.Value.Deactivate();
        if (deactivated.IsFailure)
        {
            return await DeniedAsync(
                TenantAuditActions.MenuDeactivate, ResourceTypes.Menu, menuId.ToString(), deactivated, cancellationToken)
                .ConfigureAwait(false);
        }

        await RecordAsync(TenantAuditActions.MenuDeactivate, ResourceTypes.Menu, menuId, null, cancellationToken)
            .ConfigureAwait(false);
        await _unitOfWork.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        return Result.Success();
    }

    /// <summary>Makes a withdrawn menu available to navigation again.</summary>
    public async Task<Result> ActivateMenuAsync(Guid menuId, CancellationToken cancellationToken = default)
    {
        var loaded = await LoadAsync(menuId, cancellationToken).ConfigureAwait(false);
        if (loaded.IsFailure)
        {
            return await DeniedAsync(
                TenantAuditActions.MenuActivate, ResourceTypes.Menu, menuId.ToString(), Result.Failure(loaded.Errors), cancellationToken)
                .ConfigureAwait(false);
        }

        var activated = loaded.Value.Activate();
        if (activated.IsFailure)
        {
            return await DeniedAsync(
                TenantAuditActions.MenuActivate, ResourceTypes.Menu, menuId.ToString(), activated, cancellationToken)
                .ConfigureAwait(false);
        }

        await RecordAsync(TenantAuditActions.MenuActivate, ResourceTypes.Menu, menuId, null, cancellationToken)
            .ConfigureAwait(false);
        await _unitOfWork.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        return Result.Success();
    }

    /// <summary>Renames a menu.</summary>
    public async Task<Result> RenameMenuAsync(
        Guid menuId,
        string title,
        string? englishTitle,
        CancellationToken cancellationToken = default)
    {
        var loaded = await LoadAsync(menuId, cancellationToken).ConfigureAwait(false);
        if (loaded.IsFailure)
        {
            return await DeniedAsync(
                TenantAuditActions.MenuRename, ResourceTypes.Menu, menuId.ToString(), Result.Failure(loaded.Errors), cancellationToken)
                .ConfigureAwait(false);
        }

        if (string.IsNullOrWhiteSpace(title)
            || title.Trim().Length > MaximumTitleLength
            || (englishTitle?.Trim().Length ?? 0) > MaximumTitleLength)
        {
            return await DeniedAsync(
                TenantAuditActions.MenuRename,
                ResourceTypes.Menu,
                menuId.ToString(),
                Result.Failure(MenuErrors.MenuTitleInvalid),
                cancellationToken).ConfigureAwait(false);
        }

        var renamed = loaded.Value.Rename(title, englishTitle);
        if (renamed.IsFailure)
        {
            return await DeniedAsync(
                TenantAuditActions.MenuRename, ResourceTypes.Menu, menuId.ToString(), renamed, cancellationToken)
                .ConfigureAwait(false);
        }

        await RecordAsync(TenantAuditActions.MenuRename, ResourceTypes.Menu, menuId, null, cancellationToken)
            .ConfigureAwait(false);
        await _unitOfWork.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        return Result.Success();
    }

    /// <summary>Removes a menu, provided it holds nothing.</summary>
    public async Task<Result> RemoveMenuAsync(Guid menuId, CancellationToken cancellationToken = default)
    {
        var loaded = await LoadAsync(menuId, cancellationToken).ConfigureAwait(false);
        if (loaded.IsFailure)
        {
            return await DeniedAsync(
                TenantAuditActions.MenuRemove, ResourceTypes.Menu, menuId.ToString(), Result.Failure(loaded.Errors), cancellationToken)
                .ConfigureAwait(false);
        }

        var removed = loaded.Value.Remove();
        if (removed.IsFailure)
        {
            return await DeniedAsync(
                TenantAuditActions.MenuRemove, ResourceTypes.Menu, menuId.ToString(), removed, cancellationToken)
                .ConfigureAwait(false);
        }

        _menus.Remove(loaded.Value);

        await RecordAsync(TenantAuditActions.MenuRemove, ResourceTypes.Menu, menuId, null, cancellationToken)
            .ConfigureAwait(false);
        await _unitOfWork.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        _logger.LogInformation("Menu {MenuCode} removed because it was empty.", loaded.Value.Code);
        return Result.Success();
    }

    private async Task<Result> ChangeItemAsync(
        Guid menuId,
        Guid itemId,
        Func<Menu, Result> change,
        string action,
        CancellationToken cancellationToken)
    {
        var loaded = await LoadAsync(menuId, cancellationToken).ConfigureAwait(false);
        if (loaded.IsFailure)
        {
            return await DeniedAsync(action, ResourceTypes.MenuItem, itemId.ToString(), Result.Failure(loaded.Errors), cancellationToken)
                .ConfigureAwait(false);
        }

        var applied = change(loaded.Value);
        if (applied.IsFailure)
        {
            return await DeniedAsync(action, ResourceTypes.MenuItem, itemId.ToString(), applied, cancellationToken)
                .ConfigureAwait(false);
        }

        await RecordAsync(
            action,
            ResourceTypes.MenuItem,
            itemId,
            new Dictionary<string, string?> { ["menuId"] = menuId.ToString() },
            cancellationToken).ConfigureAwait(false);
        await _unitOfWork.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        return Result.Success();
    }

    /// <summary>
    /// Checks the fields the aggregate would otherwise refuse by throwing, and returns the first broken rule.
    /// </summary>
    /// <remarks>
    /// The aggregate treats a blank or oversized value as a programming error and says so by throwing, which
    /// is the right stance for an invariant and the wrong one for a request body. Reporting the same rule as
    /// a <see cref="Result"/> here is what turns a typo in a title into a 400.
    /// </remarks>
    private static Result Validate(MenuItemDraft draft)
    {
        if (string.IsNullOrWhiteSpace(draft.Code) || draft.Code.Trim().Length > 64)
        {
            return Result.Failure(MenuErrors.ItemCodeInvalid);
        }

        return Validate(
            draft.Title,
            draft.EnglishTitle,
            draft.Icon,
            draft.Route,
            draft.SortOrder,
            draft.Module);
    }

    /// <summary>
    /// Validates the descriptive fields of a section, whichever operation supplied them.
    /// </summary>
    /// <remarks>
    /// An in-place change is checked by exactly the same rules as an addition, without the caller having to
    /// supply a code that the update operation does not take.
    /// </remarks>
    private static Result Validate(
        string title,
        string? englishTitle,
        string? icon,
        string? route,
        int sortOrder,
        string? module)
    {
        if (string.IsNullOrWhiteSpace(title)
            || title.Trim().Length > MaximumTitleLength
            || (englishTitle?.Trim().Length ?? 0) > MaximumTitleLength)
        {
            return Result.Failure(MenuErrors.ItemTitleInvalid);
        }

        if (!string.IsNullOrWhiteSpace(icon) && icon.Trim().Length > 64)
        {
            return Result.Failure(MenuErrors.ItemIconInvalid);
        }

        if (!string.IsNullOrWhiteSpace(module) && module.Trim().Length > 64)
        {
            return Result.Failure(MenuErrors.ItemModuleInvalid);
        }

        if (!MenuItem.IsValidRoute(route) || (route?.Trim().Length ?? 0) > MaximumRouteLength)
        {
            return Result.Failure(MenuErrors.ItemRouteInvalid(route ?? string.Empty));
        }

        if (sortOrder < 0)
        {
            return Result.Failure(MenuErrors.ItemSortOrderInvalid);
        }

        return Result.Success();
    }

    /// <summary>
    /// Resolves a required permission code against the catalog, returning the canonical form to store.
    /// </summary>
    /// <remarks>
    /// The catalog's own spelling is returned rather than the caller's, so two spellings of one capability
    /// differing in case cannot both end up in the menu, where only one of them would ever match a token. A
    /// null or blank requirement is legitimate and resolves to null.
    /// </remarks>
    private async Task<Result<string?>> ResolvePermissionAsync(
        string? requiredPermissionCode,
        string? sectionCode,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(requiredPermissionCode))
        {
            return Result<string?>.Success(null);
        }

        var code = requiredPermissionCode.Trim();
        if (code.Length > 128)
        {
            return Result<string?>.Failure(MenuErrors.ItemPermissionInvalid);
        }

        var permission = await _catalog.FindAsync(code, cancellationToken).ConfigureAwait(false);
        if (permission is null)
        {
            return Result<string?>.Failure(AuthorizationErrors.PermissionNotFound(code));
        }

        if (!permission.IsActive)
        {
            return Result<string?>.Failure(AuthorizationErrors.PermissionInactive(code));
        }

        _ = sectionCode;
        return Result<string?>.Success(permission.Code);
    }

    /// <summary>
    /// Loads one menu of the caller's own level, tracked with its items.
    /// </summary>
    /// <remarks>
    /// The level is re-checked rather than trusting the identifier. A menu of another organization is already
    /// invisible to the tenant filter, but a menu of a *different level* in the same organization is not, and
    /// without this check a company administrator would edit the tenant-wide menu that every company sees.
    /// The answer for both cases is "not found", so a caller cannot use this to discover which menus exist
    /// above it.
    /// </remarks>
    private async Task<Result<Menu>> LoadAsync(Guid menuId, CancellationToken cancellationToken)
    {
        var menu = await _directory.FindTrackedByIdAsync(menuId, cancellationToken).ConfigureAwait(false);
        if (menu is null)
        {
            return Result<Menu>.Failure(MenuErrors.MenuNotFound(menuId.ToString()));
        }

        var scope = _audit.Scope;
        if (menu.Scope.OrganizationId != scope.OrganizationId || Menu.ResolveLevel(scope) != menu.Level)
        {
            return Result<Menu>.Failure(MenuErrors.MenuNotFound(menuId.ToString()));
        }

        return Result<Menu>.Success(menu);
    }

    private Task RecordAsync(
        string action,
        string resourceType,
        Guid resourceId,
        IReadOnlyDictionary<string, string?>? attributes,
        CancellationToken cancellationToken)
        => _audit.RecordSuccessAsync(action, resourceType, resourceId.ToString(), attributes, cancellationToken);

    private Task<Result<T>> DeniedAsync<T>(
        string action,
        string resourceType,
        string resourceId,
        Result<T> result,
        CancellationToken cancellationToken)
        => _audit.AuditDenialAsync(action, resourceType, resourceId, result, cancellationToken: cancellationToken);

    private Task<Result> DeniedAsync(
        string action,
        string resourceType,
        string resourceId,
        Result result,
        CancellationToken cancellationToken)
        => _audit.AuditDenialAsync(action, resourceType, resourceId, result, cancellationToken: cancellationToken);
}
