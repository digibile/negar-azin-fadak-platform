using System.Globalization;
using System.Text.Json;
using NegarAzinFadak.Core;
using NegarAzinFadak.Core.Auditing;
using NegarAzinFadak.Core.Domain;
using NegarAzinFadak.Core.Results;
using NegarAzinFadak.Core.Tenancy;

namespace NegarAzinFadak.Organization.Domain.Configuration;

/// <summary>
/// The configuration a tenant has defined for itself: defaults, limits, locales and feature switches,
/// held as typed data instead of being compiled into the platform.
/// </summary>
/// <remarks>
/// <para>
/// This is the single answer to "where does the platform stop hard-coding business values". Anything a
/// tenant can decide — its down-payment default, its non-working weekdays, the days before a document
/// expiry that a warning goes out — is a setting here, declared with a kind and a range, and read through
/// a typed accessor that reports a missing or malformed value as a failure rather than substituting one.
/// </para>
/// <para>
/// Values that are absent are genuinely absent, not defaulted here. A caller that cannot supply a value
/// must decide what its own fallback is, so a missing setting cannot quietly become a platform-wide
/// constant written in one place and believed to be configurable.
/// </para>
/// </remarks>
public sealed class TenantConfiguration : AggregateRoot, IAuditable, IHasConcurrencyStamp, ITenantScoped
{
    private readonly List<TenantSetting> _settings = [];

    private TenantConfiguration()
    {
        Scope = TenantScope.None;
    }

    private TenantConfiguration(Guid id, TenantScope scope)
        : base(id)
    {
        Scope = Guard.AgainstNull(scope);
        Guard.Against(scope.IsEmpty, "A tenant configuration must belong to an organization.");
        ConcurrencyStamp = Guid.NewGuid().ToString("N");
    }

    /// <summary>Organizational coordinates of the owning tenant.</summary>
    public TenantScope Scope { get; private set; }

    public IReadOnlyList<TenantSetting> Settings => _settings.AsReadOnly();

    public DateTimeOffset CreatedAt { get; set; }

    public Guid? CreatedBy { get; set; }

    public DateTimeOffset? ModifiedAt { get; set; }

    public Guid? ModifiedBy { get; set; }

    public string ConcurrencyStamp { get; set; } = string.Empty;

    /// <summary>Creates the configuration document of a tenant. One exists per organization.</summary>
    public static TenantConfiguration ForTenant(Guid id, TenantScope scope) => new(id, scope);

    /// <summary>True when the tenant has defined the setting.</summary>
    public bool Has(string code) => Find(Normalize(code)) is not null;

    /// <summary>Creates or replaces the value of a setting, validating it against <paramref name="kind"/>.</summary>
    /// <remarks>
    /// The kind, sensitivity and range of an existing code are fixed at definition. Changing them in place
    /// would leave every reader that already typed against the old kind holding a value of a different one,
    /// and there is no way to tell which stored rows to reinterpret. The caller is told to remove and
    /// redefine instead, which is a decision the operator makes deliberately.
    /// </remarks>
    public Result Set(string code, string? value, TenantSettingKind kind, bool isSensitive, NumericRange range)
    {
        var normalized = Normalize(code);
        var candidate = value ?? string.Empty;

        var validation = Validate(normalized, candidate, kind, range);
        if (validation.IsFailure)
        {
            return validation;
        }

        var existing = Find(normalized);
        if (existing is null)
        {
            _settings.Add(new TenantSetting(
                Guid.NewGuid(),
                Id,
                normalized,
                candidate,
                kind,
                isSensitive,
                range,
                Scope));
            return Result.Success();
        }

        if (existing.Kind != kind || existing.IsSensitive != isSensitive || existing.Range != range)
        {
            return Result.Failure(TenantConfigurationErrors.SettingDefinitionImmutable(normalized));
        }

        existing.SetValue(candidate);
        return Result.Success();
    }

    /// <summary>
    /// Removes a setting so the code falls back to the caller's own default. Absence is a decision the
    /// tenant can make; a leftover value nobody can explain is not.
    /// </summary>
    public Result Remove(string code)
    {
        var normalized = Normalize(code);
        var existing = Find(normalized);
        if (existing is null)
        {
            return Result.Failure(TenantConfigurationErrors.SettingNotFound(normalized));
        }

        _settings.Remove(existing);
        return Result.Success();
    }

    /// <summary>
    /// Reads a text setting.
    /// </summary>
    /// <remarks>
    /// Only <see cref="TenantSettingKind.Text"/> is served here, deliberately. This reader is what a read
    /// model and an endpoint call, and accepting a secret through it would turn every "show me this
    /// setting" screen into a secret disclosure. Secrets are served by <see cref="GetSecret"/>, which a
    /// caller has to ask for by name.
    /// </remarks>
    public Result<string> GetText(string code)
    {
        var setting = Require(code);
        return setting is null
            ? Result<string>.Failure(TenantConfigurationErrors.SettingNotFound(Normalize(code)))
            : setting.Kind == TenantSettingKind.Text
                ? Result<string>.Success(setting.Value)
                : Result<string>.Failure(TenantConfigurationErrors.SettingKindMismatch(setting.Code, setting.Kind, TenantSettingKind.Text));
    }

    /// <summary>Reads an integer setting.</summary>
    public Result<int> GetInteger(string code)
    {
        var setting = Require(code);
        if (setting is null)
        {
            return Result<int>.Failure(TenantConfigurationErrors.SettingNotFound(Normalize(code)));
        }

        if (setting.Kind != TenantSettingKind.Integer)
        {
            return Result<int>.Failure(TenantConfigurationErrors.SettingKindMismatch(setting.Code, setting.Kind, TenantSettingKind.Integer));
        }

        return int.TryParse(setting.Value, NumberStyles.Integer, CultureInfo.InvariantCulture, out var parsed)
            ? Result<int>.Success(parsed)
            : Result<int>.Failure(TenantConfigurationErrors.SettingValueInvalid(setting.Code, setting.Kind));
    }

    /// <summary>Reads a decimal setting.</summary>
    public Result<decimal> GetDecimal(string code)
    {
        var setting = Require(code);
        if (setting is null)
        {
            return Result<decimal>.Failure(TenantConfigurationErrors.SettingNotFound(Normalize(code)));
        }

        if (setting.Kind != TenantSettingKind.Decimal)
        {
            return Result<decimal>.Failure(TenantConfigurationErrors.SettingKindMismatch(setting.Code, setting.Kind, TenantSettingKind.Decimal));
        }

        return decimal.TryParse(setting.Value, NumberStyles.Number, CultureInfo.InvariantCulture, out var parsed)
            ? Result<decimal>.Success(parsed)
            : Result<decimal>.Failure(TenantConfigurationErrors.SettingValueInvalid(setting.Code, setting.Kind));
    }

    /// <summary>Reads a boolean setting.</summary>
    public Result<bool> GetBoolean(string code)
    {
        var setting = Require(code);
        if (setting is null)
        {
            return Result<bool>.Failure(TenantConfigurationErrors.SettingNotFound(Normalize(code)));
        }

        if (setting.Kind != TenantSettingKind.Boolean)
        {
            return Result<bool>.Failure(TenantConfigurationErrors.SettingKindMismatch(setting.Code, setting.Kind, TenantSettingKind.Boolean));
        }

        return bool.TryParse(setting.Value, out var parsed)
            ? Result<bool>.Success(parsed)
            : Result<bool>.Failure(TenantConfigurationErrors.SettingValueInvalid(setting.Code, setting.Kind));
    }

    /// <summary>Reads a JSON setting as a document.</summary>
    public Result<JsonDocument> GetJson(string code)
    {
        var setting = Require(code);
        if (setting is null)
        {
            return Result<JsonDocument>.Failure(TenantConfigurationErrors.SettingNotFound(Normalize(code)));
        }

        if (setting.Kind != TenantSettingKind.Json)
        {
            return Result<JsonDocument>.Failure(TenantConfigurationErrors.SettingKindMismatch(setting.Code, setting.Kind, TenantSettingKind.Json));
        }

        try
        {
            return Result<JsonDocument>.Success(JsonDocument.Parse(setting.Value));
        }
        catch (JsonException)
        {
            return Result<JsonDocument>.Failure(TenantConfigurationErrors.SettingValueInvalid(setting.Code, setting.Kind));
        }
    }

    /// <summary>Reads a sensitive setting. The value is available to trusted server-side code only.</summary>
    public Result<string> GetSecret(string code)
    {
        var setting = Require(code);
        if (setting is null)
        {
            return Result<string>.Failure(TenantConfigurationErrors.SettingNotFound(Normalize(code)));
        }

        return setting.Kind == TenantSettingKind.Secret
            ? Result<string>.Success(setting.Value)
            : Result<string>.Failure(TenantConfigurationErrors.SettingKindMismatch(setting.Code, setting.Kind, TenantSettingKind.Secret));
    }

    /// <summary>Read model of the configuration: values are masked where they must be.</summary>
    public IReadOnlyList<TenantSettingView> Describe() => _settings
        .OrderBy(setting => setting.Code, StringComparer.Ordinal)
        .Select(setting => new TenantSettingView(
            setting.Code,
            setting.Kind,
            setting.IsSensitive,
            setting.DisplayValue,
            setting.Range))
        .ToArray()
        .AsReadOnly();

    /// <summary>
    /// Returns the stored setting for a code, normalized the same way <see cref="Set"/> normalizes it, or
    /// <see langword="null"/> when there is none.
    /// </summary>
    /// <remarks>
    /// Offered so that a caller reading back what it just wrote does not have to reimplement code
    /// normalization. Two normalizations that disagree would let a use case look up a code the domain stored
    /// under a different spelling and conclude the write had not happened.
    /// </remarks>
    public TenantSetting? Setting(string code) => Find(Normalize(code));

    private TenantSetting? Find(string normalizedCode)
        => _settings.FirstOrDefault(setting => setting.Code == normalizedCode);

    private TenantSetting? Require(string code) => Find(Normalize(code));

    private static Result Validate(string code, string value, TenantSettingKind kind, NumericRange range)
    {
        if (value.Length > 4096)
        {
            return Result.Failure(TenantConfigurationErrors.SettingValueTooLong(code, 4096));
        }

        switch (kind)
        {
            case TenantSettingKind.Integer:
                if (!int.TryParse(value, NumberStyles.Integer, CultureInfo.InvariantCulture, out var integer))
                {
                    return Result.Failure(TenantConfigurationErrors.SettingValueInvalid(code, kind));
                }

                return !range.Contains(integer)
                    ? Result.Failure(TenantConfigurationErrors.SettingOutOfRange(code, range))
                    : Result.Success();

            case TenantSettingKind.Decimal:
                if (!decimal.TryParse(value, NumberStyles.Number, CultureInfo.InvariantCulture, out var number))
                {
                    return Result.Failure(TenantConfigurationErrors.SettingValueInvalid(code, kind));
                }

                return !range.Contains(number)
                    ? Result.Failure(TenantConfigurationErrors.SettingOutOfRange(code, range))
                    : Result.Success();

            case TenantSettingKind.Boolean:
                return bool.TryParse(value, out _)
                    ? Result.Success()
                    : Result.Failure(TenantConfigurationErrors.SettingValueInvalid(code, kind));

            case TenantSettingKind.Json:
                try
                {
                    using var _ = JsonDocument.Parse(value);
                    return Result.Success();
                }
                catch (JsonException)
                {
                    return Result.Failure(TenantConfigurationErrors.SettingValueInvalid(code, kind));
                }

            case TenantSettingKind.Text:
            case TenantSettingKind.Secret:
                return Result.Success();

            default:
                return Result.Failure(TenantConfigurationErrors.SettingValueInvalid(code, kind));
        }
    }

    private static string Normalize(string code)
    {
        var trimmed = Guard.AgainstNullOrWhiteSpace(code).Trim().ToLowerInvariant();
        if (trimmed.Length > 128)
        {
            throw new ArgumentException("A setting code must not exceed 128 characters.", nameof(code));
        }

        return trimmed;
    }
}

/// <summary>A tenant setting as exposed to a read model, with a sensitive value already masked.</summary>
/// <param name="Code">Stable setting code.</param>
/// <param name="Kind">Declared type of the value.</param>
/// <param name="IsSensitive">True when the value is masked in <paramref name="DisplayValue"/>.</param>
/// <param name="DisplayValue">The value, or a mask when the setting is sensitive.</param>
/// <param name="Range">Bounds enforced on a numeric setting.</param>
public sealed record TenantSettingView(
    string Code,
    TenantSettingKind Kind,
    bool IsSensitive,
    string DisplayValue,
    NumericRange Range);
