namespace NegarAzinFadak.Api.Authentication;

/// <summary>
/// Claim types the platform issues and reads.
/// </summary>
/// <remarks>
/// The tenant coordinates are separate claims rather than one serialized scope, so an operator can see
/// at a glance which level a token is scoped to, and so a token minted for one branch cannot be
/// reinterpreted as a store token by reordering fields.
/// </remarks>
public static class PlatformClaims
{
    /// <summary>Central identity identifier. Uses the registered short name <c>sub</c>.</summary>
    public const string UserId = "sub";

    /// <summary>Unique token identifier, usable as a revocation key.</summary>
    public const string TokenId = "jti";

    /// <summary>Organization the caller acts in. Required on every authenticated request.</summary>
    public const string OrganizationId = "org";

    /// <summary>Company context, when the caller is narrower than the organization.</summary>
    public const string CompanyId = "company";

    /// <summary>Brand context, when the caller is narrower than the company.</summary>
    public const string BrandId = "brand";

    /// <summary>Branch context, when the caller is narrower than the brand.</summary>
    public const string BranchId = "branch";

    /// <summary>Store context, when the caller is narrower than the branch.</summary>
    public const string StoreId = "store";

    /// <summary>Role code granted to the caller.</summary>
    public const string Role = "role";

    /// <summary>Permission code granted to the caller.</summary>
    public const string Permission = "permission";
}
