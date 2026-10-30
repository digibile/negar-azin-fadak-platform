using System.ComponentModel.DataAnnotations;

namespace NegarAzinFadak.Application.Options;

/// <summary>One permission the platform publishes, declared in configuration rather than in code.</summary>
public sealed class PermissionDefinition
{
    /// <summary>Stable dotted code, e.g. <c>seller.catalog.product.write</c>.</summary>
    [Required]
    public string Code { get; set; } = string.Empty;

    /// <summary>Grouping shown in administration screens, e.g. <c>catalog</c>.</summary>
    [Required]
    public string Category { get; set; } = string.Empty;

    /// <summary>Short human-readable label.</summary>
    [Required]
    public string Title { get; set; } = string.Empty;

    /// <summary>What holding this permission allows.</summary>
    public string? Description { get; set; }
}

/// <summary>
/// One role a newly provisioned tenant receives, declared in configuration.
/// </summary>
/// <remarks>
/// The template is configuration, not code. A deployment that needs a different set of starter roles — a
/// franchise with a regional manager, a marketplace with only sellers — changes this section, and the
/// provisioning use case needs no change at all. The codes it references must exist in
/// <see cref="PlatformAuthorizationOptions.Permissions"/>; an unknown code is reported rather than
/// silently skipped, so a typo cannot leave a tenant administrator unable to administer.
/// </remarks>
public sealed class RoleTemplateDefinition
{
    /// <summary>Role code minted for the tenant, e.g. <c>tenant_admin</c>.</summary>
    [Required]
    public string Code { get; set; } = string.Empty;

    /// <summary>Display name of the role.</summary>
    [Required]
    public string Name { get; set; } = string.Empty;

    /// <summary>What the role is for.</summary>
    public string? Description { get; set; }

    /// <summary>
    /// True when the role is one the platform depends on. Built-in roles may be edited and retired but
    /// not removed, so a tenant cannot lock itself out of its own administration.
    /// </summary>
    public bool IsBuiltIn { get; set; }

    /// <summary>Permission codes granted to the role.</summary>
    public List<string> Permissions { get; set; } = [];
}

/// <summary>
/// The platform's permission catalog and starter role templates, bound from the
/// <c>PlatformAuthorization</c> configuration section.
/// </summary>
/// <remarks>
/// This is what makes "permissions are data" true in practice. The endpoints still name concrete codes,
/// but the set of codes that exist, their categories and the roles a new tenant starts with are all
/// supplied by the deployment. Nothing in the platform grants a capability that is absent from here.
/// </remarks>
public sealed class PlatformAuthorizationOptions
{
    /// <summary>Configuration section name.</summary>
    public const string SectionName = "PlatformAuthorization";

    /// <summary>Permissions published into the catalog.</summary>
    public List<PermissionDefinition> Permissions { get; set; } = [];

    /// <summary>Roles granted to a tenant when it is provisioned.</summary>
    public List<RoleTemplateDefinition> RoleTemplates { get; set; } = [];

    /// <summary>Codes referenced by a role template that are absent from <see cref="Permissions"/>.</summary>
    public IReadOnlyList<string> Validate()
    {
        var problems = new List<string>();

        var known = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var permission in Permissions)
        {
            if (string.IsNullOrWhiteSpace(permission.Code))
            {
                problems.Add("A permission entry has no code.");
                continue;
            }

            if (!known.Add(permission.Code))
            {
                problems.Add($"Permission '{permission.Code}' is declared more than once.");
            }
        }

        var roleCodes = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var template in RoleTemplates)
        {
            if (string.IsNullOrWhiteSpace(template.Code))
            {
                problems.Add("A role template has no code.");
                continue;
            }

            if (!roleCodes.Add(template.Code))
            {
                problems.Add($"Role template '{template.Code}' is declared more than once.");
            }

            foreach (var permissionCode in template.Permissions)
            {
                if (!known.Contains(permissionCode))
                {
                    problems.Add(
                        $"Role template '{template.Code}' references unknown permission '{permissionCode}'.");
                }
            }
        }

        return problems;
    }
}
