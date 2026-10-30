using NegarAzinFadak.Core;
using NegarAzinFadak.Core.Results;
using NegarAzinFadak.Core.Tenancy;

namespace NegarAzinFadak.Organization.Domain.Configuration;

/// <summary>
/// Declared type of a tenant setting's value, so a reader can reject a mistyped value instead of
/// silently substituting a default.
/// </summary>
/// <remarks>
/// The kind is data, not a hint: a tenant that stores <c>"12"</c> where the platform expects an integer
/// gets a validation failure naming the setting, rather than a comparison that quietly never matches.
/// </remarks>
public enum TenantSettingKind
{
    /// <summary>Free text, e.g. a support address.</summary>
    Text = 0,

    /// <summary>A whole number.</summary>
    Integer = 1,

    /// <summary>A decimal number, e.g. a fee percentage.</summary>
    Decimal = 2,

    /// <summary><c>true</c> or <c>false</c>, case-insensitive.</summary>
    Boolean = 3,

    /// <summary>An opaque JSON document, validated only as JSON here.</summary>
    Json = 4,

    /// <summary>
    /// A value that must never be returned by a read API or written to a log. Stored, but reported only
    /// as present or absent.
    /// </summary>
    Secret = 5
}

/// <summary>A hard bound on a numeric setting, applied at write time so bad configuration cannot be stored.</summary>
/// <param name="Minimum">Inclusive lower bound.</param>
/// <param name="Maximum">Inclusive upper bound.</param>
public readonly record struct NumericRange(decimal Minimum, decimal Maximum)
{
    /// <summary>An unbounded range, used for settings whose limits are not the platform's business.</summary>
    public static NumericRange Unbounded => new(decimal.MinValue, decimal.MaxValue);

    /// <summary>True when <paramref name="value"/> sits inside the range.</summary>
    public bool Contains(decimal value) => value >= Minimum && value <= Maximum;
}

/// <summary>
/// A setting the tenant has defined, together with the type and bounds it is held to.
/// </summary>
/// <remarks>
/// Settings are not free-form strings precisely because a pricing percentage or an installment count will
/// be read by money and calendar code. Declaring the kind and the range once, at write time, moves the
/// failure to the operator who can fix it instead of to the customer at checkout.
/// </remarks>
public sealed class TenantSetting : ITenantScoped
{
    private TenantSetting()
    {
        Code = string.Empty;
        Value = string.Empty;
        Scope = TenantScope.None;
    }

    internal TenantSetting(
        Guid id,
        Guid configurationId,
        string code,
        string value,
        TenantSettingKind kind,
        bool isSensitive,
        NumericRange range,
        TenantScope scope)
    {
        Id = Guard.AgainstEmpty(id);
        ConfigurationId = Guard.AgainstEmpty(configurationId);
        Code = Guard.AgainstNullOrWhiteSpace(code).Trim().ToLowerInvariant();
        Value = value;
        Kind = kind;
        IsSensitive = isSensitive;
        RangeMinimum = range.Minimum;
        RangeMaximum = range.Maximum;
        Scope = Guard.AgainstNull(scope);
    }

    public Guid Id { get; private set; }

    /// <summary>Identifier of the configuration document this setting belongs to.</summary>
    public Guid ConfigurationId { get; private set; }

    /// <summary>Stable setting code, e.g. <c>credit.default.down_payment_percent</c>.</summary>
    public string Code { get; private set; }

    /// <summary>Stored value. Never projected onto a response for a sensitive setting.</summary>
    public string Value { get; private set; }

    public TenantSettingKind Kind { get; private set; }

    /// <summary>True when the value must be masked when read.</summary>
    public bool IsSensitive { get; private set; }

    /// <summary>Inclusive lower bound enforced on a numeric setting.</summary>
    public decimal RangeMinimum { get; private set; }

    /// <summary>Inclusive upper bound enforced on a numeric setting.</summary>
    public decimal RangeMaximum { get; private set; }

    /// <summary>Organizational coordinates of the owning tenant, so the setting is isolated with it.</summary>
    public TenantScope Scope { get; private set; }

    /// <summary>Bounds enforced on this setting.</summary>
    public NumericRange Range => new(RangeMinimum, RangeMaximum);

    /// <summary>Value to report for a sensitive setting in a read model.</summary>
    public const string MaskedValue = "********";

    /// <summary>Applies a new value after it has passed <see cref="TenantConfiguration"/> validation.</summary>
    internal void SetValue(string value) => Value = value;

    /// <summary>Value as it may be exposed: masked when the setting is sensitive.</summary>
    public string DisplayValue => IsSensitive ? MaskedValue : Value;
}
