using Microsoft.Extensions.Options;

namespace NegarAzinFadak.Application.Options;

/// <summary>
/// One section of the platform's base menu, declared in configuration together with its children.
/// </summary>
/// <remarks>
/// The section is configuration, not code, for the same reason a role template is: the shape of the master
/// menu is a deployment decision. A deployment that groups the fifty-odd master sections differently, or that
/// renames one for its own operators, changes this section and the menu itself needs no change.
/// <para>
/// Nothing here is business data. A section names where a part of the platform lives and which catalog
/// permission opens it; it does not create the module, and it carries no counts, balances or records. The
/// sections the platform ships are the parts of the platform that already exist, so applying this
/// configuration can never produce a menu entry pointing at an invented capability.
/// </para>
/// </remarks>
public sealed class MenuSectionDefinition
{
    /// <summary>Stable code, unique among its siblings. The identity the structure is referred to by.</summary>
    public string Code { get; set; } = string.Empty;

    /// <summary>Display title, in the language the operator reads.</summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>English title, for the bilingual headings and exports the platform produces.</summary>
    public string? EnglishTitle { get; set; }

    /// <summary>Icon name for the client to draw, e.g. <c>dashboard</c>.</summary>
    public string? Icon { get; set; }

    /// <summary>Client route the section opens, or omitted for a pure grouping section.</summary>
    public string? Route { get; set; }

    /// <summary>Position among its siblings. Lower sorts first; ties fall back to the code.</summary>
    public int SortOrder { get; set; }

    /// <summary>
    /// Catalog permission a caller must hold for this section to appear in their navigation.
    /// </summary>
    /// <remarks>
    /// The whole point of attaching a permission to a menu item: the client stops being the thing that
    /// decides which links to draw, and the platform decides it from the token the caller actually holds. An
    /// omitted value means the section requires no capability and is shown to any authenticated caller.
    /// </remarks>
    public string? RequiredPermissionCode { get; set; }

    /// <summary>Module the section opens, e.g. <c>identity</c> or <c>marketplace</c>.</summary>
    public string Module { get; set; } = string.Empty;

    /// <summary>Sections nested under this one.</summary>
    public List<MenuSectionDefinition> Children { get; set; } = [];
}

/// <summary>
/// The base menu a newly provisioned tenant starts with, bound from the <c>PlatformMenu</c> section.
/// </summary>
/// <remarks>
/// <para>
/// A tenant's menu is data, not a template frozen into the provisioning code, for the same reason its roles
/// are: a deployment that needs a different starter menu changes this section. The menu a tenant ends up with
/// is still editable afterwards through the menu endpoints, so this is where the tree starts and not where it
/// is fixed.
/// </para>
/// <para>
/// The section is optional. A host that declares none provisions tenants with an empty menu and an operator
/// builds the structure, which is a worse but an honest outcome: an invented base menu would put links in
/// front of operators that lead nowhere.
/// </para>
/// </remarks>
public sealed class MenuOptions
{
    /// <summary>Configuration section name.</summary>
    public const string SectionName = "PlatformMenu";

    /// <summary>Code of the menu the sections are installed into at tenant level.</summary>
    public string Code { get; set; } = "master";

    /// <summary>Display title of that menu.</summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>English title of that menu.</summary>
    public string? EnglishTitle { get; set; }

    /// <summary>Sections installed as the top level of the menu.</summary>
    public List<MenuSectionDefinition> Sections { get; set; } = [];

    /// <summary>True when the section declares nothing, in which case provisioning installs no menu.</summary>
    public bool IsEmpty => Sections.Count is 0;

    /// <summary>Problems that make the declared structure impossible to install.</summary>
    /// <param name="knownPermissionCodes">
    /// Permission codes the platform's catalog declares, used to refuse a section that requires a capability
    /// nothing can grant. Cross-checked here rather than only at install time, so a typo stops a deployment
    /// at startup instead of producing a section that never appears for any operator.
    /// </param>
    public IReadOnlyList<string> Validate(IReadOnlyCollection<string>? knownPermissionCodes = null)
    {
        var problems = new List<string>();
        var granted = knownPermissionCodes is null
            ? null
            : new HashSet<string>(knownPermissionCodes, StringComparer.OrdinalIgnoreCase);

        if (!IsEmpty && string.IsNullOrWhiteSpace(Code))
        {
            problems.Add("The base menu has no code.");
        }

        if (!IsEmpty && string.IsNullOrWhiteSpace(Title))
        {
            problems.Add("The base menu has no title.");
        }

        Inspect(Sections, 0, problems, granted);
        return problems;
    }

    private static void Inspect(
        IReadOnlyCollection<MenuSectionDefinition> siblings,
        int depth,
        List<string> problems,
        HashSet<string>? granted)
    {
        if (depth > Organization.Domain.Menus.Menu.MaximumDepth)
        {
            problems.Add($"A base menu section nests deeper than {Organization.Domain.Menus.Menu.MaximumDepth} levels.");
            return;
        }

        var codes = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var section in siblings)
        {
            if (string.IsNullOrWhiteSpace(section.Code))
            {
                problems.Add("A base menu section has no code.");
                continue;
            }

            if (section.Code.Trim().Length > 64)
            {
                problems.Add($"Base menu section '{section.Code}' has a code longer than 64 characters.");
            }

            if (!codes.Add(section.Code.Trim()))
            {
                problems.Add($"Base menu section '{section.Code}' is declared more than once among its siblings.");
            }

            if (string.IsNullOrWhiteSpace(section.Title) || section.Title.Trim().Length > 256)
            {
                problems.Add($"Base menu section '{section.Code}' needs a title of 1 to 256 characters.");
            }

            if (string.IsNullOrWhiteSpace(section.Module) || section.Module.Trim().Length > 64)
            {
                problems.Add($"Base menu section '{section.Code}' must name the module it opens.");
            }

            if (section.SortOrder < 0)
            {
                problems.Add($"Base menu section '{section.Code}' has a negative sort order.");
            }

            if (!Organization.Domain.Menus.MenuItem.IsValidRoute(section.Route))
            {
                problems.Add($"Base menu section '{section.Code}' has a route that is not a client path.");
            }

            if (granted is not null
                && !string.IsNullOrWhiteSpace(section.RequiredPermissionCode)
                && !granted.Contains(section.RequiredPermissionCode.Trim()))
            {
                problems.Add(
                    $"Base menu section '{section.Code}' requires permission '{section.RequiredPermissionCode}', which the catalog does not declare.");
            }

            Inspect(section.Children, depth + 1, problems, granted);
        }
    }
}

/// <summary>
/// Checks the base menu against the permission codes the same deployment declares.
/// </summary>
/// <remarks>
/// A separate validator rather than a second <c>Validate</c> on the options builder, because the builder's
/// dependency-typed overload resolves its dependency from the container — and
/// <see cref="PlatformAuthorizationOptions"/> is only ever bound through <see cref="IOptions{TOptions}"/>,
/// never registered as a service in its own right. Registering a second, separately-bound copy of the same
/// configuration to satisfy that overload would create two objects that agree only until the first
/// configuration change after startup.
/// </remarks>
internal sealed class MenuOptionsValidator(IOptions<PlatformAuthorizationOptions> authorization)
    : IValidateOptions<MenuOptions>
{
    /// <inheritdoc />
    public ValidateOptionsResult Validate(string? name, MenuOptions options)
    {
        ArgumentNullException.ThrowIfNull(options);

        var declared = authorization.Value.Permissions
            .Where(permission => !string.IsNullOrWhiteSpace(permission.Code))
            .Select(permission => permission.Code)
            .ToArray();

        var problems = options.Validate(declared);
        return problems.Count is 0
            ? ValidateOptionsResult.Success
            : ValidateOptionsResult.Fail(problems);
    }
}
