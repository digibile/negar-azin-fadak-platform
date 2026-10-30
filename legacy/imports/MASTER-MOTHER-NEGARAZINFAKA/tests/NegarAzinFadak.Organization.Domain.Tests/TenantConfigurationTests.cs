using NegarAzinFadak.Core.Tenancy;
using NegarAzinFadak.Organization.Domain.Configuration;

namespace NegarAzinFadak.Organization.Domain.Tests;

/// <summary>
/// How a tenant's configuration refuses bad values, keeps secrets out of read models, and refuses to
/// reinterpret a setting that readers already typed against.
/// </summary>
/// <remarks>
/// A setting is read by money and calendar code, so the type and the bounds are enforced at write time. That
/// is the difference between an operator fixing a bad percentage and a customer discovering it at checkout.
/// </remarks>
public sealed class TenantConfigurationTests
{
    private static readonly TenantScope Scope = new(Guid.Parse("aaaaaaaa-0000-0000-0000-000000000001"));
    private static readonly NumericRange Percent = new(0m, 100m);

    private static TenantConfiguration NewConfiguration() => TenantConfiguration.ForTenant(Guid.NewGuid(), Scope);

    [Fact]
    public void A_tenant_configuration_belongs_to_an_organization()
    {
        Assert.Throws<InvalidOperationException>(() => TenantConfiguration.ForTenant(Guid.NewGuid(), TenantScope.None));
    }

    [Fact]
    public void A_setting_is_stored_with_the_parent_document_id_and_tenant()
    {
        var configuration = NewConfiguration();

        configuration.Set("credit.default.down_payment", "30", TenantSettingKind.Decimal, false, Percent);

        var setting = Assert.Single(configuration.Settings);
        Assert.Equal(configuration.Id, setting.ConfigurationId);
        Assert.Equal(Scope, setting.Scope);
        Assert.Equal("credit.default.down_payment", setting.Code);
    }

    [Fact]
    public void A_value_of_the_wrong_kind_is_refused()
    {
        var configuration = NewConfiguration();

        var applied = configuration.Set(
            "credit.default.down_payment", "thirty percent", TenantSettingKind.Decimal, false, Percent);

        Assert.True(applied.IsFailure);
        Assert.Equal(TenantConfigurationErrors.SettingValueInvalidCode, applied.FirstError.Code);
        Assert.False(configuration.Has("credit.default.down_payment"));
    }

    [Fact]
    public void A_numeric_value_outside_its_range_is_refused()
    {
        var configuration = NewConfiguration();

        var applied = configuration.Set("credit.default.down_payment", "140", TenantSettingKind.Decimal, false, Percent);

        Assert.True(applied.IsFailure);
        Assert.Equal(TenantConfigurationErrors.SettingOutOfRangeCode, applied.FirstError.Code);
        Assert.Empty(configuration.Settings);
    }

    [Fact]
    public void A_json_setting_must_hold_json()
    {
        var configuration = NewConfiguration();

        var applied = configuration.Set("organization.holidays", "{oops", TenantSettingKind.Json, false, NumericRange.Unbounded);

        Assert.True(applied.IsFailure);
        Assert.Equal(TenantConfigurationErrors.SettingValueInvalidCode, applied.FirstError.Code);
    }

    [Fact]
    public void Replacing_a_value_keeps_the_original_definition()
    {
        var configuration = NewConfiguration();
        configuration.Set("credit.default.down_payment", "30", TenantSettingKind.Decimal, false, Percent);

        var applied = configuration.Set("credit.default.down_payment", "35", TenantSettingKind.Decimal, false, Percent);

        Assert.True(applied.IsSuccess);
        var setting = Assert.Single(configuration.Settings);
        Assert.Equal("35", setting.Value);
        Assert.Equal(Percent, setting.Range);
    }

    [Fact]
    public void Changing_a_settings_kind_after_the_fact_is_refused()
    {
        var configuration = NewConfiguration();
        configuration.Set("credit.default.down_payment", "30", TenantSettingKind.Decimal, false, Percent);

        // Every reader of this code already parses a decimal. Re-declaring it as text would leave a stored
        // number being read as a string, and there is no way to tell which stored rows to reinterpret.
        var applied = configuration.Set("credit.default.down_payment", "30", TenantSettingKind.Text, false, Percent);

        Assert.True(applied.IsFailure);
        Assert.Equal(TenantConfigurationErrors.SettingDefinitionImmutableCode, applied.FirstError.Code);
        Assert.Equal(TenantSettingKind.Decimal, Assert.Single(configuration.Settings).Kind);
    }

    [Fact]
    public void A_sensitive_value_is_masked_in_the_read_model()
    {
        var configuration = NewConfiguration();
        configuration.Set("integration.partner.api_key", "sk-live-very-secret", TenantSettingKind.Secret, true, NumericRange.Unbounded);

        var described = Assert.Single(configuration.Describe());

        Assert.True(described.IsSensitive);
        Assert.Equal(TenantSetting.MaskedValue, described.DisplayValue);

        // Masking is a property of the read model, not of storage: trusted server-side code still needs the
        // value, or the integration that stored it could never call the partner.
        Assert.Equal("sk-live-very-secret", configuration.GetSecret("integration.partner.api_key").Value);
    }

    [Fact]
    public void A_secret_cannot_be_read_as_an_ordinary_text_setting()
    {
        var configuration = NewConfiguration();
        configuration.Set("integration.partner.api_key", "sk-live", TenantSettingKind.Secret, true, NumericRange.Unbounded);

        var read = configuration.GetText("integration.partner.api_key");

        Assert.True(read.IsFailure);
        Assert.Equal(TenantConfigurationErrors.SettingKindMismatchCode, read.FirstError.Code);
    }

    [Fact]
    public void A_setting_can_be_read_through_its_declared_type()
    {
        var configuration = NewConfiguration();
        configuration.Set("credit.installment.months", "12", TenantSettingKind.Integer, false, new NumericRange(1, 60));
        configuration.Set("credit.markup", "1.075", TenantSettingKind.Decimal, false, new NumericRange(1m, 2m));
        configuration.Set("credit.auto_issue", "true", TenantSettingKind.Boolean, false, NumericRange.Unbounded);

        Assert.Equal(12, configuration.GetInteger("credit.installment.months").Value);
        Assert.Equal(1.075m, configuration.GetDecimal("credit.markup").Value);
        Assert.True(configuration.GetBoolean("credit.auto_issue").Value);
    }

    [Fact]
    public void Reading_a_setting_as_the_wrong_type_is_refused_rather_than_defaulted()
    {
        var configuration = NewConfiguration();
        configuration.Set("credit.installment.months", "12", TenantSettingKind.Integer, false, new NumericRange(1, 60));

        var read = configuration.GetDecimal("credit.installment.months");

        Assert.True(read.IsFailure);
        Assert.Equal(TenantConfigurationErrors.SettingKindMismatchCode, read.FirstError.Code);
    }

    [Fact]
    public void A_missing_setting_is_reported_and_never_substituted()
    {
        var configuration = NewConfiguration();

        var read = configuration.GetInteger("credit.default.grace_days");

        // Absent means absent. A caller that cannot supply a value must decide its own fallback, or a missing
        // setting quietly becomes a platform-wide constant written in one place and believed configurable.
        Assert.True(read.IsFailure);
        Assert.Equal(TenantConfigurationErrors.SettingNotFoundCode, read.FirstError.Code);
    }

    [Fact]
    public void Removing_a_setting_lets_the_caller_fall_back()
    {
        var configuration = NewConfiguration();
        configuration.Set("credit.default.grace_days", "7", TenantSettingKind.Integer, false, new NumericRange(0, 30));

        var removed = configuration.Remove("credit.default.grace_days");

        Assert.True(removed.IsSuccess);
        Assert.False(configuration.Has("credit.default.grace_days"));
    }

    [Fact]
    public void Removing_an_absent_setting_is_reported_as_not_found()
    {
        var configuration = NewConfiguration();

        var removed = configuration.Remove("credit.default.grace_days");

        Assert.True(removed.IsFailure);
        Assert.Equal(TenantConfigurationErrors.SettingNotFoundCode, removed.FirstError.Code);
    }

    [Fact]
    public void Setting_codes_are_normalized_so_a_caller_cannot_create_two_spellings()
    {
        var configuration = NewConfiguration();
        configuration.Set("credit.default.grace_days", "7", TenantSettingKind.Integer, false, new NumericRange(0, 30));

        configuration.Set("  Credit.Default.Grace_DAYS  ", "14", TenantSettingKind.Integer, false, new NumericRange(0, 30));

        var setting = Assert.Single(configuration.Settings);
        Assert.Equal("credit.default.grace_days", setting.Code);
        Assert.Equal("14", setting.Value);
    }
}
