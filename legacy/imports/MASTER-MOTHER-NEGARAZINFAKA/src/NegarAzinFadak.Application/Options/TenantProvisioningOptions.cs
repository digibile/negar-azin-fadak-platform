using System.ComponentModel.DataAnnotations;
using NegarAzinFadak.Organization.Domain.Configuration;

namespace NegarAzinFadak.Application.Options;

/// <summary>One setting a newly provisioned tenant starts with.</summary>
/// <remarks>
/// Declared with the kind and the bounds it will be held to from the moment the tenant is created, so the
/// value is validated before it is ever stored and the same validation applies when it is later changed.
/// </remarks>
public sealed class TenantSettingTemplate
{
    /// <summary>Stable setting code.</summary>
    [Required]
    public string Code { get; set; } = string.Empty;

    /// <summary>Value to store.</summary>
    [Required]
    public string Value { get; set; } = string.Empty;

    /// <summary>Declared type of the value.</summary>
    public TenantSettingKind Kind { get; set; } = TenantSettingKind.Text;

    /// <summary>True when the value must be masked whenever it is read back.</summary>
    public bool IsSensitive { get; set; }

    /// <summary>Inclusive lower bound for a numeric setting.</summary>
    public decimal? Minimum { get; set; }

    /// <summary>Inclusive upper bound for a numeric setting.</summary>
    public decimal? Maximum { get; set; }

    /// <summary>Bounds to enforce, unbounded when the template declares none.</summary>
    public NumericRange ToRange() => Minimum is null && Maximum is null
        ? NumericRange.Unbounded
        : new NumericRange(Minimum ?? decimal.MinValue, Maximum ?? decimal.MaxValue);
}

/// <summary>
/// How a tenant is provisioned: the starter configuration it receives and the identity that performs
/// the provisioning.
/// </summary>
/// <remarks>
/// Nothing here is a business value. Currency, thresholds and default terms come from
/// <see cref="PlatformAuthorizationOptions"/> and from the tenant setting templates below, so a
/// deployment decides them and this use case only enforces that what it was given is valid.
/// </remarks>
public sealed class TenantProvisioningOptions
{
    /// <summary>Configuration section name.</summary>
    public const string SectionName = "TenantProvisioning";

    /// <summary>Settings every new tenant starts with.</summary>
    public List<TenantSettingTemplate> Settings { get; set; } = [];

    /// <summary>Whether provisioning also activates the tenant. Off by default: activation is a decision.</summary>
    public bool ActivateOnProvisioning { get; set; }

    /// <summary>Money values are stored with this many decimal places.</summary>
    [Range(0, 6)]
    public int MoneyScale { get; set; } = 0;
}
