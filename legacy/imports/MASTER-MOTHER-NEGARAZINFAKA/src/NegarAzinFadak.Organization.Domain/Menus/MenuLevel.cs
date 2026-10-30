namespace NegarAzinFadak.Organization.Domain.Menus;

/// <summary>
/// The organizational level a menu is defined for.
/// </summary>
/// <remarks>
/// A menu is defined once for a tenant, once for a company or once for a brand, and the levels compose:
/// a brand operator sees the tenant's menu, the company's menu and their own brand's, in that order. That is
/// what makes the master menu extensible — a new section is added to the tenant's menu and every company
/// and brand below inherits it, while a brand that needs one extra section defines it only for itself.
/// <para>
/// Branch and store are deliberately absent. A branch or a store does not define navigation; it consumes the
/// menu of the brand above it, and letting it define its own would produce two trees that disagree about
/// what a role can see.
/// </para>
/// </remarks>
public enum MenuLevel
{
    /// <summary>Defined for the whole tenant and inherited by every company and brand below it.</summary>
    Tenant = 0,

    /// <summary>Defined for one company and inherited by that company's brands.</summary>
    Company = 1,

    /// <summary>Defined for one brand and seen only by operators acting in that brand.</summary>
    Brand = 2
}
