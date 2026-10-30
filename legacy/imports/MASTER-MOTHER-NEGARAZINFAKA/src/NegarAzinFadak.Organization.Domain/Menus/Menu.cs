using NegarAzinFadak.Core;
using NegarAzinFadak.Core.Auditing;
using NegarAzinFadak.Core.Domain;
using NegarAzinFadak.Core.Results;
using NegarAzinFadak.Core.Tenancy;
using NegarAzinFadak.Organization.Domain.Events;

namespace NegarAzinFadak.Organization.Domain.Menus;

/// <summary>
/// One navigation menu: the container that holds a hierarchical set of <see cref="MenuItem"/> rows for a
/// tenant, a company or a brand.
/// </summary>
/// <remarks>
/// <para>
/// The menu is the aggregate root of navigation because every rule about an item's position is a rule about
/// the menu it sits in. A code is unique among siblings, a parent must be inside the same menu, a subtree
/// cannot be re-parented into itself and a menu with items cannot be deleted. None of those can be decided
/// by an item looking only at itself, so the aggregate loads its items and answers for them.
/// </para>
/// <para>
/// A whole master menu is small — tens to low hundreds of sections, not millions of rows — so holding the
/// tree in one aggregate is what makes the hierarchy rules expressible at all. It is also what makes them
/// testable without a database.
/// </para>
/// </remarks>
public sealed class Menu : AggregateRoot, IAuditable, IHasConcurrencyStamp, ITenantScoped
{
    /// <summary>
    /// Deepest level an item may occupy. A menu therefore nests six levels: sections, groups, pages.
    /// </summary>
    /// <remarks>
    /// Bounded on purpose. A hierarchy with no ceiling is a hierarchy that can be walked forever, and a
    /// client rendering it has to recurse; a bound turns "the operator nested something unreasonably" into a
    /// refusal at the point of the mistake.
    /// </remarks>
    public const int MaximumDepth = 5;

    private readonly List<MenuItem> _items = [];

    private Menu()
    {
        Code = string.Empty;
        Title = string.Empty;
        Scope = TenantScope.None;
        Level = MenuLevel.Tenant;
        ConcurrencyStamp = string.Empty;
    }

    private Menu(Guid id, TenantScope scope, MenuLevel level, string code, string title, string? englishTitle, bool isPlatformDefined)
        : base(id)
    {
        Scope = Guard.AgainstNull(scope);
        Level = level;
        Code = NormalizeCode(code);
        Title = NormalizeTitle(title);
        EnglishTitle = string.IsNullOrWhiteSpace(englishTitle) ? null : englishTitle.Trim();
        IsPlatformDefined = isPlatformDefined;
        IsActive = true;
        ConcurrencyStamp = Guid.NewGuid().ToString("N");
    }

    /// <summary>Organizational coordinates that own this menu.</summary>
    public TenantScope Scope { get; private set; }

    /// <summary>Level this menu is defined for. Fixed at construction, and consistent with <see cref="Scope"/>.</summary>
    public MenuLevel Level { get; private set; }

    /// <summary>Stable code, unique within the level this menu is defined for.</summary>
    public string Code { get; private set; }

    /// <summary>Display title of the menu itself.</summary>
    public string Title { get; private set; }

    /// <summary>English title of the menu, for bilingual headings and exports.</summary>
    public string? EnglishTitle { get; private set; }

    /// <summary>False hides the whole menu from navigation without discarding its structure.</summary>
    public bool IsActive { get; private set; }

    /// <summary>True when the menu was provisioned from the platform's configured base structure.</summary>
    public bool IsPlatformDefined { get; private set; }

    /// <summary>Every item in the menu, in storage order. Use <see cref="RootItems"/> to walk the tree.</summary>
    public IReadOnlyList<MenuItem> Items => _items.AsReadOnly();

    public DateTimeOffset CreatedAt { get; set; }

    public Guid? CreatedBy { get; set; }

    public DateTimeOffset? ModifiedAt { get; set; }

    public Guid? ModifiedBy { get; set; }

    public string ConcurrencyStamp { get; set; } = string.Empty;

    /// <summary>Defines a menu for a tenant, a company or a brand.</summary>
    /// <param name="id">Identifier to give the menu. Assigned by the caller so related records can share it.</param>
    /// <param name="scope">Coordinates the menu belongs to.</param>
    /// <param name="code">Stable code, unique at this level within the tenant.</param>
    /// <param name="title">Display title.</param>
    /// <param name="englishTitle">English title, when the platform produces one.</param>
    /// <param name="isPlatformDefined">True for the base structure a deployment ships.</param>
    public static Result<Menu> Define(
        Guid id,
        TenantScope scope,
        string code,
        string title,
        string? englishTitle = null,
        bool isPlatformDefined = false)
    {
        ArgumentNullException.ThrowIfNull(scope);

        if (ResolveLevel(scope) is not { } level)
        {
            return Result<Menu>.Failure(MenuErrors.MenuScopeInvalid);
        }

        return Result<Menu>.Success(new Menu(id, scope, level, code, title, englishTitle, isPlatformDefined));
    }

    /// <summary>
    /// Adds a top-level section, or nests the new item under <paramref name="parentId"/>.
    /// </summary>
    /// <param name="parentId">Parent item, or <see langword="null"/> for a top-level section.</param>
    /// <param name="code">Stable code, unique among the siblings it is added next to.</param>
    /// <param name="title">Display title.</param>
    /// <param name="englishTitle">English title, when the platform produces one.</param>
    /// <param name="icon">Icon name for the client to draw.</param>
    /// <param name="route">Client route the item opens, or null for a pure grouping item.</param>
    /// <param name="sortOrder">Position among its siblings.</param>
    /// <param name="requiredPermissionCode">Catalog permission a caller must hold, or null for no requirement.</param>
    /// <param name="module">Module the item opens.</param>
    /// <param name="isPlatformDefined">True for an item of the platform's configured base structure.</param>
    public Result<MenuItem> AddItem(
        Guid? parentId,
        string code,
        string title,
        string? englishTitle = null,
        string? icon = null,
        string? route = null,
        int sortOrder = 0,
        string? requiredPermissionCode = null,
        string? module = null,
        bool isPlatformDefined = false)
    {
        if (!IsActive)
        {
            return Result<MenuItem>.Failure(MenuErrors.MenuInactive(Code));
        }

        if (sortOrder < 0)
        {
            return Result<MenuItem>.Failure(MenuErrors.ItemSortOrderInvalid);
        }

        if (!MenuItem.IsValidRoute(route))
        {
            return Result<MenuItem>.Failure(MenuErrors.ItemRouteInvalid(route ?? string.Empty));
        }

        var resolvedParentId = parentId ?? Guid.Empty;
        var depth = 0;

        if (resolvedParentId != Guid.Empty)
        {
            var parent = _items.FirstOrDefault(item => item.Id == resolvedParentId);
            if (parent is null)
            {
                // The parent is either absent or belongs to another menu. Both are reported as "not found in
                // this menu" on purpose: telling a caller which menu does hold the item would let it probe
                // for menus outside its own scope.
                return Result<MenuItem>.Failure(MenuErrors.ItemParentNotFound(resolvedParentId.ToString()));
            }

            if (!parent.IsActive)
            {
                return Result<MenuItem>.Failure(MenuErrors.ItemParentInactive(parent.Code));
            }

            depth = parent.Depth + 1;
            if (depth > MaximumDepth)
            {
                return Result<MenuItem>.Failure(MenuErrors.ItemDepthExceeded(MaximumDepth));
            }
        }

        var normalized = MenuItem.NormalizeCodeForStorage(code);
        if (SiblingsOf(resolvedParentId).Any(sibling => string.Equals(sibling.Code, normalized, StringComparison.Ordinal)))
        {
            return Result<MenuItem>.Failure(MenuErrors.ItemCodeExists(normalized, resolvedParentId.ToString()));
        }

        var item = MenuItem.Create(
            Id,
            resolvedParentId,
            normalized,
            title,
            englishTitle,
            icon,
            route,
            sortOrder,
            requiredPermissionCode,
            module ?? DefaultModule,
            depth,
            isPlatformDefined,
            Scope);

        _items.Add(item);
        RaiseDomainEvent(new MenuItemChanged(
            Guid.NewGuid(),
            DateTimeOffset.UtcNow,
            Scope,
            Id,
            Code,
            item.Id,
            item.Code,
            MenuItemChangeKind.Added));

        return Result<MenuItem>.Success(item);
    }

    /// <summary>Replaces the descriptive fields and the ordering of an existing item.</summary>
    public Result UpdateItem(
        Guid itemId,
        string title,
        string? englishTitle,
        string? icon,
        string? route,
        int sortOrder,
        string? requiredPermissionCode,
        string? module)
    {
        var found = FindItem(itemId);
        if (found is null)
        {
            return Result.Failure(MenuErrors.ItemNotFound(itemId.ToString()));
        }

        var updated = found.Update(title, englishTitle, icon, route, sortOrder, requiredPermissionCode, module ?? DefaultModule);
        if (updated.IsFailure)
        {
            return updated;
        }

        RaiseChanged(found, MenuItemChangeKind.Updated);
        return Result.Success();
    }

    /// <summary>
    /// Renames an item's code, which is the only identifier the structure is referred to by.
    /// </summary>
    /// <remarks>
    /// Separated from <see cref="UpdateItem"/> because the code is what the sibling-uniqueness rule is
    /// computed against, so the collision has to be checked before the rename and reported to the caller
    /// rather than caught by a database index.
    /// </remarks>
    public Result UpdateItemCode(Guid itemId, string code)
    {
        var found = FindItem(itemId);
        if (found is null)
        {
            return Result.Failure(MenuErrors.ItemNotFound(itemId.ToString()));
        }

        var normalized = MenuItem.NormalizeCodeForStorage(code);
        if (SiblingsOf(found.ParentId)
            .Any(sibling => sibling.Id != found.Id && string.Equals(sibling.Code, normalized, StringComparison.Ordinal)))
        {
            return Result.Failure(MenuErrors.ItemCodeExists(normalized, found.ParentId.ToString()));
        }

        var previous = found.Code;
        found.RenameCode(normalized);
        RaiseDomainEvent(new MenuItemChanged(
            Guid.NewGuid(),
            DateTimeOffset.UtcNow,
            Scope,
            Id,
            Code,
            found.Id,
            normalized,
            MenuItemChangeKind.Recoded,
            previous));
        return Result.Success();
    }

    /// <summary>
    /// Moves an item, and everything below it, under a different parent.
    /// </summary>
    /// <param name="itemId">Item to move.</param>
    /// <param name="newParentId">New parent, or <see langword="null"/> to promote the item to a top-level section.</param>
    public Result MoveItem(Guid itemId, Guid? newParentId)
    {
        var item = FindItem(itemId);
        if (item is null)
        {
            return Result.Failure(MenuErrors.ItemNotFound(itemId.ToString()));
        }

        var resolvedParentId = newParentId ?? Guid.Empty;
        var parentDepth = 0;

        if (resolvedParentId != Guid.Empty)
        {
            if (resolvedParentId == itemId || IsDescendantOf(resolvedParentId, itemId))
            {
                // Refused here rather than left to a depth check: moving a branch under itself produces a
                // cycle that no depth number can describe, and the recursive walk a client does to render the
                // tree would not terminate.
                return Result.Failure(MenuErrors.ItemCycle);
            }

            var parent = FindItem(resolvedParentId);
            if (parent is null)
            {
                return Result.Failure(MenuErrors.ItemParentNotFound(resolvedParentId.ToString()));
            }

            parentDepth = parent.Depth;
        }

        var normalizedCode = item.Code;
        if (SiblingsOf(resolvedParentId)
            .Any(sibling => sibling.Id != item.Id && string.Equals(sibling.Code, normalizedCode, StringComparison.Ordinal)))
        {
            return Result.Failure(MenuErrors.ItemCodeExists(normalizedCode, resolvedParentId.ToString()));
        }

        var shift = (parentDepth + 1) - item.Depth;
        var deepest = DeepestDescendantDepth(item);
        if (deepest + shift > MaximumDepth)
        {
            return Result.Failure(MenuErrors.ItemDepthExceeded(MaximumDepth));
        }

        item.Reparent(resolvedParentId, parentDepth);
        ShiftDescendants(item, shift);
        RaiseChanged(item, MenuItemChangeKind.Moved);
        return Result.Success();
    }

    /// <summary>Shows an item in navigation again.</summary>
    public Result ActivateItem(Guid itemId)
    {
        var item = FindItem(itemId);
        if (item is null)
        {
            return Result.Failure(MenuErrors.ItemNotFound(itemId.ToString()));
        }

        var activated = item.Activate();
        if (activated.IsFailure)
        {
            return activated;
        }

        RaiseChanged(item, MenuItemChangeKind.Activated);
        return Result.Success();
    }

    /// <summary>Hides an item from navigation, keeping its children in place.</summary>
    public Result DeactivateItem(Guid itemId)
    {
        var item = FindItem(itemId);
        if (item is null)
        {
            return Result.Failure(MenuErrors.ItemNotFound(itemId.ToString()));
        }

        var deactivated = item.Deactivate();
        if (deactivated.IsFailure)
        {
            return deactivated;
        }

        RaiseChanged(item, MenuItemChangeKind.Deactivated);
        return Result.Success();
    }

    /// <summary>
    /// Removes an item from the menu.
    /// </summary>
    /// <remarks>
    /// Refused for an item that has children and for an item of the platform's base structure. The first
    /// because deleting a branch would silently delete the meaning of every route under it; the second
    /// because the base structure is what a deployment ships, and a tenant removing it would find the gap
    /// only by noticing that a route stopped appearing.
    /// </remarks>
    public Result RemoveItem(Guid itemId)
    {
        var item = FindItem(itemId);
        if (item is null)
        {
            return Result.Failure(MenuErrors.ItemNotFound(itemId.ToString()));
        }

        if (item.IsPlatformDefined)
        {
            return Result.Failure(MenuErrors.ItemNotRemovable(item.Code));
        }

        if (_items.Any(existing => existing.ParentId == item.Id))
        {
            return Result.Failure(MenuErrors.ItemHasChildren);
        }

        _items.Remove(item);
        RaiseChanged(item, MenuItemChangeKind.Removed);
        return Result.Success();
    }

    /// <summary>Makes the menu available to navigation.</summary>
    public Result Activate()
    {
        if (IsActive)
        {
            return Result.Failure(MenuErrors.MenuAlreadyActive(Code));
        }

        IsActive = true;
        RaiseAvailabilityChanged();
        return Result.Success();
    }

    /// <summary>Hides the menu and everything in it from navigation.</summary>
    /// <remarks>
    /// Refuses a second withdrawal for the same reason activation does: an operator who asks to withdraw a
    /// menu that is already withdrawn is looking at a screen that has not caught up with a previous change,
    /// and answering "done" teaches them that the screen is the problem.
    /// </remarks>
    public Result Deactivate()
    {
        if (!IsActive)
        {
            return Result.Failure(MenuErrors.MenuAlreadyInactive(Code));
        }

        IsActive = false;
        RaiseAvailabilityChanged();
        return Result.Success();
    }

    /// <summary>Removes the menu, provided it holds nothing.</summary>
    public Result Remove()
    {
        if (_items.Count > 0)
        {
            return Result.Failure(MenuErrors.MenuNotEmpty(Code));
        }

        return Result.Success();
    }

    /// <summary>Renames the menu. Its code is never changed, because the structure is addressed by it.</summary>
    public Result Rename(string title, string? englishTitle = null)
    {
        Title = NormalizeTitle(title);
        EnglishTitle = string.IsNullOrWhiteSpace(englishTitle) ? null : englishTitle.Trim();
        return Result.Success();
    }

    /// <summary>Finds an item of this menu by identifier, or <see langword="null"/>.</summary>
    public MenuItem? FindItem(Guid itemId) => _items.FirstOrDefault(item => item.Id == itemId);

    /// <summary>The top-level sections of the menu, in display order.</summary>
    public IReadOnlyList<MenuItem> RootItems() => Ordered(SiblingsOf(Guid.Empty));

    /// <summary>The children of one item, in display order. Empty for a leaf.</summary>
    public IReadOnlyList<MenuItem> ChildrenOf(Guid parentId) => Ordered(SiblingsOf(parentId));

    /// <summary>
    /// Whether <paramref name="candidateId"/> sits somewhere under <paramref name="ancestorId"/>.
    /// </summary>
    /// <remarks>
    /// Walks up from the candidate rather than down from the ancestor. A move already rejected its own
    /// subject, so the walk cannot start inside the subtree it is searching for and cannot loop.
    /// </remarks>
    public bool IsDescendantOf(Guid candidateId, Guid ancestorId)
    {
        var current = FindItem(candidateId);
        while (current is not null && !current.IsRoot)
        {
            if (current.ParentId == ancestorId)
            {
                return true;
            }

            current = FindItem(current.ParentId);
        }

        return false;
    }

    /// <summary>
    /// The canonical stored form of a menu code.
    /// </summary>
    /// <remarks>
    /// Exposed for the same reason as <see cref="MenuItem.NormalizeCodeForStorage"/>: a lookup has to
    /// normalize the way construction does, or it stops finding menus that plainly exist.
    /// </remarks>
    public static string NormalizeCodeForStorage(string code) => NormalizeCode(code);

    /// <summary>
    /// The level a scope defines a menu at, or <see langword="null"/> when the scope is not one of them.
    /// </summary>
    /// <remarks>
    /// A branch or store context is rejected rather than rounded down to its brand. Silently defining a
    /// brand-wide menu for a request that arrived with a branch context would publish a menu to a wider
    /// audience than the caller asked about.
    /// </remarks>
    public static MenuLevel? ResolveLevel(TenantScope scope)
    {
        ArgumentNullException.ThrowIfNull(scope);

        if (scope.IsEmpty)
        {
            return null;
        }

        if (scope.BranchId.HasValue || scope.StoreId.HasValue)
        {
            return null;
        }

        return scope.CompanyId is null
            ? MenuLevel.Tenant
            : scope.BrandId is null
                ? MenuLevel.Company
                : MenuLevel.Brand;
    }

    /// <summary>
    /// Announces that the whole menu became available or unavailable.
    /// </summary>
    /// <remarks>
    /// Separate from <see cref="MenuItemChanged"/> because the reach of the change is the menu, not an item:
    /// a subscriber that caches navigation has to drop or rebuild the entire tree, and an event per item would
    /// describe the same change several times and none of them completely.
    /// </remarks>
    private void RaiseAvailabilityChanged()
        => RaiseDomainEvent(new MenuAvailabilityChanged(
            Guid.NewGuid(),
            DateTimeOffset.UtcNow,
            Scope,
            Id,
            Code,
            IsActive));

    private void RaiseChanged(MenuItem item, MenuItemChangeKind kind, string? previousCode = null)
        => RaiseDomainEvent(new MenuItemChanged(
            Guid.NewGuid(),
            DateTimeOffset.UtcNow,
            Scope,
            Id,
            Code,
            item.Id,
            item.Code,
            kind,
            previousCode));

    /// <summary>
    /// Moves every descendant of <paramref name="item"/> by the same number of levels.
    /// </summary>
    /// <remarks>
    /// The item itself is skipped: <see cref="MenuItem.Reparent"/> has already placed it. The walk is by
    /// parent, not by a recursive call from the item, because an item does not know its children — only the
    /// menu does. Recursion terminates because the tree is acyclic: <see cref="MoveItem"/> refused the move
    /// that could have broken that, and the aggregate built it cycle-free to begin with.
    /// </remarks>
    private void ShiftDescendants(MenuItem item, int shift)
    {
        if (shift == 0)
        {
            return;
        }

        foreach (var child in _items.Where(candidate => candidate.ParentId == item.Id))
        {
            child.ShiftDepth(shift);
            ShiftDescendants(child, shift);
        }
    }

    private int DeepestDescendantDepth(MenuItem item)
    {
        var deepest = item.Depth;
        var pending = new Stack<MenuItem>();
        pending.Push(item);

        while (pending.Count > 0)
        {
            var current = pending.Pop();
            foreach (var child in _items.Where(candidate => candidate.ParentId == current.Id))
            {
                deepest = Math.Max(deepest, child.Depth);
                pending.Push(child);
            }
        }

        return deepest;
    }

    private IEnumerable<MenuItem> SiblingsOf(Guid parentId)
        => _items.Where(item => item.ParentId == parentId);

    /// <summary>Display order: explicit position first, then the code, so the order is total and stable.</summary>
    private static IReadOnlyList<MenuItem> Ordered(IEnumerable<MenuItem> items)
        => items
            .OrderBy(item => item.SortOrder)
            .ThenBy(item => item.Code, StringComparer.Ordinal)
            .ToArray()
            .AsReadOnly();

    /// <summary>
    /// Module recorded on an item whose caller did not name one.
    /// </summary>
    /// <remarks>
    /// A constant of the aggregate, not a value from configuration, because it is not a business decision:
    /// it is the code that holds items added before this aggregate existed a module, and a seeded structure
    /// always names its own. The field is a required part of an item, so there has to be one default.
    /// </remarks>
    private const string DefaultModule = "platform";

    private static string NormalizeCode(string code)
    {
        var trimmed = Guard.AgainstNullOrWhiteSpace(code).Trim().ToLowerInvariant();
        if (trimmed.Length > 64)
        {
            throw new ArgumentException("A menu code must not exceed 64 characters.", nameof(code));
        }

        return trimmed;
    }

    private static string NormalizeTitle(string title)
    {
        var trimmed = Guard.AgainstNullOrWhiteSpace(title).Trim();
        if (trimmed.Length > 256)
        {
            throw new ArgumentException("A menu title must not exceed 256 characters.", nameof(title));
        }

        return trimmed;
    }
}
