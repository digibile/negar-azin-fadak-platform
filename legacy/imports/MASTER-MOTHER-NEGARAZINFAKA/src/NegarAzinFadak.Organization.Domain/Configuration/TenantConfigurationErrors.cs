using NegarAzinFadak.Core.Results;

namespace NegarAzinFadak.Organization.Domain.Configuration;

/// <summary>Stable error codes of the tenant configuration module.</summary>
public static class TenantConfigurationErrors
{
    public const string NotFoundCode = "tenant.configuration.not_found";
    public const string SettingNotFoundCode = "tenant.configuration.setting_not_found";
    public const string SettingValueInvalidCode = "tenant.configuration.setting_value_invalid";
    public const string SettingKindMismatchCode = "tenant.configuration.setting_kind_mismatch";
    public const string SettingOutOfRangeCode = "tenant.configuration.setting_out_of_range";
    public const string SettingValueTooLongCode = "tenant.configuration.setting_value_too_long";
    public const string SettingCodeInvalidCode = "tenant.configuration.setting_code_invalid";
    public const string SettingDefinitionImmutableCode = "tenant.configuration.setting_definition_immutable";
    public const string AlreadyExistsCode = "tenant.configuration.already_exists";
    public const string OutsideTenantCode = "tenant.configuration.outside_tenant";

    public static Error NotFound()
        => Error.NotFound(NotFoundCode, "This tenant has no configuration document.");

    public static Error SettingNotFound(string code)
        => Error.NotFound(SettingNotFoundCode, $"Setting '{code}' is not defined for this tenant.");

    public static Error SettingValueInvalid(string code, TenantSettingKind kind)
        => Error.Validation(SettingValueInvalidCode, $"The value supplied for '{code}' is not a valid {kind} value.");

    public static Error SettingKindMismatch(string code, TenantSettingKind actual, TenantSettingKind expected)
        => Error.Validation(
            SettingKindMismatchCode,
            $"Setting '{code}' is stored as {actual} and cannot be read as {expected}.");

    public static Error SettingOutOfRange(string code, NumericRange range)
        => Error.Validation(
            SettingOutOfRangeCode,
            $"Setting '{code}' must be between {range.Minimum} and {range.Maximum}.");

    public static Error SettingValueTooLong(string code, int maxLength)
        => Error.Validation(SettingValueTooLongCode, $"Setting '{code}' must not exceed {maxLength} characters.");

    public static Error SettingCodeInvalid
        => Error.Validation(SettingCodeInvalidCode, "The setting code is not valid.");

    public static Error SettingDefinitionImmutable(string code)
        => Error.Conflict(
            SettingDefinitionImmutableCode,
            $"Setting '{code}' is already defined. Its kind, sensitivity and range are fixed at definition; remove the setting and define it again to change them.");

    public static Error AlreadyExists
        => Error.Conflict(AlreadyExistsCode, "This tenant already has a configuration document.");

    public static Error OutsideTenant
        => Error.Forbidden(OutsideTenantCode, "The configuration belongs to another tenant.");
}
