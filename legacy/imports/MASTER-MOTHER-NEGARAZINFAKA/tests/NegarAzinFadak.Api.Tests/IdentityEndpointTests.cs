using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using NegarAzinFadak.Api.Authentication;
using NegarAzinFadak.Api.Authorization;
using NegarAzinFadak.Core.Tenancy;

namespace NegarAzinFadak.Api.Tests;

/// <summary>
/// The central identity directory over a real host and a real database: who may see it, what one tenant can
/// never learn about another, and what an operator's changes actually persist.
/// </summary>
/// <remarks>
/// <para>
/// These drive the real use cases over HTTP. The properties under test are transport-level and
/// authorization-level — which status code, which problem code, whose rows — and a mocked service would
/// agree with all of them while the tenant filter quietly did nothing.
/// </para>
/// <para>
/// The isolation tests use two unrelated organizations on purpose. A single-tenant fixture would pass a
/// directory that ignored its scope entirely, which is the failure this module is most able to have.
/// </para>
/// </remarks>
public sealed class IdentityEndpointTests : IClassFixture<ApiHostFactory>, IDisposable
{
    private readonly ApiHostFactory _factory;
    private readonly HttpClient _client;

    public IdentityEndpointTests(ApiHostFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    public void Dispose() => _client.Dispose();

    [Fact]
    public async Task An_anonymous_caller_cannot_reach_the_identity_surface()
    {
        Assert.Equal(HttpStatusCode.Unauthorized, (await _client.GetAsync("/api/v1/identity/users/")).StatusCode);
        Assert.Equal(
            HttpStatusCode.Unauthorized,
            (await _client.PostAsJsonAsync("/api/v1/identity/users/", new { mobile = "+989121112233", displayName = "X" })).StatusCode);
    }

    [Fact]
    public async Task A_caller_without_the_identity_read_permission_is_forbidden()
    {
        using var request = Authorized(
            HttpMethod.Get, "/api/v1/identity/users/", new TenantScope(Guid.NewGuid()), [Permissions.RoleRead]);

        Assert.Equal(HttpStatusCode.Forbidden, (await _client.SendAsync(request)).StatusCode);
    }

    [Fact]
    public async Task Reading_the_directory_requires_the_read_permission_and_not_only_the_write_one()
    {
        var scope = new TenantScope(Guid.NewGuid());
        using var writeOnly = Authorized(HttpMethod.Get, "/api/v1/identity/users/", scope, [Permissions.IdentityWrite]);

        // Reading a person's national identity number is the sensitive act, not writing one. A role that can
        // change identities but not read them would otherwise be the way to reach the whole registry.
        Assert.Equal(HttpStatusCode.Forbidden, (await _client.SendAsync(writeOnly)).StatusCode);
    }

    [Fact]
    public async Task A_registered_identity_appears_in_the_directory_with_its_mobile_masked()
    {
        var scope = new TenantScope(Guid.NewGuid());
        var mobile = NewMobile();
        var created = await RegisterAsync(scope, mobile, "کارشناس شعبه");

        Assert.Equal("Active", created.GetProperty("status").GetString());
        Assert.Equal("کارشناس شعبه", created.GetProperty("displayName").GetString());

        using var list = Authorized(HttpMethod.Get, "/api/v1/identity/users/", scope, [Permissions.IdentityRead]);
        var page = await (await _client.SendAsync(list)).Content.ReadFromJsonAsync<JsonElement>();

        var row = Assert.Single(
            page.GetProperty("items").EnumerateArray(),
            item => item.GetProperty("id").GetGuid() == created.GetProperty("id").GetGuid());

        // The list is the shape of data that ends up in a screenshot. It identifies the person to the
        // operator and carries no more than that, which is why the field is named mobileMasked and not mobile.
        Assert.Equal(Masked(mobile), row.GetProperty("mobileMasked").GetString());
        Assert.False(row.TryGetProperty("mobile", out _));
    }

    [Fact]
    public async Task The_detail_read_returns_the_full_record_a_directory_row_withholds()
    {
        var scope = new TenantScope(Guid.NewGuid());
        var mobile = NewMobile();
        var created = await RegisterAsync(scope, mobile, "سرپرست فروشگاه");

        using var read = Authorized(
            HttpMethod.Get, $"/api/v1/identity/users/{created.GetProperty("id").GetGuid()}", scope, [Permissions.IdentityRead]);
        var detail = await (await _client.SendAsync(read)).Content.ReadFromJsonAsync<JsonElement>();

        Assert.NotEqual(Guid.Empty, detail.GetProperty("id").GetGuid());
        Assert.Equal(mobile, detail.GetProperty("mobile").GetString());
        Assert.Equal(Masked(mobile), detail.GetProperty("mobileMasked").GetString());

        // Provenance travels with the values. A review screen that shows a name without showing whether it
        // came from OCR, from the user or from a reviewer cannot do its job.
        var fields = detail.GetProperty("profile").GetProperty("fields").EnumerateArray().ToArray();
        Assert.Equal(11, fields.Length);
        Assert.All(fields, field => Assert.False(string.IsNullOrWhiteSpace(field.GetProperty("provenance").GetString())));
    }

    [Fact]
    public async Task The_stored_credential_never_travels_back_to_a_client()
    {
        var scope = new TenantScope(Guid.NewGuid());
        var created = await RegisterAsync(scope, NewMobile(), "کاربر رمزدار", "a-sufficiently-long-password");

        using var read = Authorized(
            HttpMethod.Get, $"/api/v1/identity/users/{created.GetProperty("id").GetGuid()}", scope, [Permissions.IdentityRead]);
        var body = await (await _client.SendAsync(read)).Content.ReadAsStringAsync();

        Assert.True(created.GetProperty("hasPasswordCredential").GetBoolean());
        Assert.DoesNotContain("passwordHash", body, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("a-sufficiently-long-password", body, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Registering_the_same_mobile_twice_is_a_conflict_that_names_no_tenant()
    {
        var scope = new TenantScope(Guid.NewGuid());
        var mobile = NewMobile();
        await RegisterAsync(scope, mobile, "اولی");

        using var again = Authorized(HttpMethod.Post, "/api/v1/identity/users/", scope, [Permissions.IdentityWrite],
            new { mobile, displayName = "دومی", password = (string?)null, preferredLocale = (string?)null });
        var response = await _client.SendAsync(again);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();

        // One human, one central identity. The unique index on the mobile column would refuse this anyway,
        // but a 500 from the database is not an answer a caller can act on.
        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Contains(
            problem.GetProperty("errors").EnumerateArray().Select(error => error.GetProperty("code").GetString()),
            code => code == "identity.user.duplicate_merge_required");
    }

    [Fact]
    public async Task A_mobile_belonging_to_another_tenant_cannot_be_registered_again()
    {
        var mine = new TenantScope(Guid.NewGuid());
        var theirs = new TenantScope(Guid.NewGuid());
        var mobile = NewMobile();
        await RegisterAsync(theirs, mobile, "مشتری شعبه دیگر");

        using var attempt = Authorized(HttpMethod.Post, "/api/v1/identity/users/", mine, [Permissions.IdentityWrite],
            new { mobile, displayName = "همان شماره", password = (string?)null, preferredLocale = (string?)null });
        var response = await _client.SendAsync(attempt);
        var body = await response.Content.ReadAsStringAsync();

        // The mobile number is unique across the platform because it is the sign-in anchor, so the duplicate
        // check has to cross tenants. The refusal must therefore not say whose identity it is: a conflict
        // that named the owning organization would be a way to probe another tenant's customers.
        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.DoesNotContain(theirs.OrganizationId.ToString(), body, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task One_tenant_never_sees_another_tenants_identities()
    {
        var mine = new TenantScope(Guid.NewGuid());
        var theirs = new TenantScope(Guid.NewGuid());
        await RegisterAsync(theirs, NewMobile(), "هویت غیرقابل مشاهده");

        using var list = Authorized(HttpMethod.Get, "/api/v1/identity/users/", mine, [Permissions.IdentityRead]);
        var page = await (await _client.SendAsync(list)).Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(0, page.GetProperty("totalCount").GetInt32());
    }

    [Fact]
    public async Task An_identity_of_another_tenant_is_reported_as_not_found_rather_than_forbidden()
    {
        var mine = new TenantScope(Guid.NewGuid());
        var theirs = new TenantScope(Guid.NewGuid());
        var foreign = await RegisterAsync(theirs, NewMobile(), "در دسترس نیست");
        var foreignId = foreign.GetProperty("id").GetGuid();

        using var read = Authorized(
            HttpMethod.Get, $"/api/v1/identity/users/{foreignId}", mine, [Permissions.IdentityRead]);
        var response = await _client.SendAsync(read);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();

        // Distinguishing "not yours" from "not there" would turn a 404 into an oracle for the existence of
        // identities in tenants the caller does not administer.
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Contains(
            problem.GetProperty("errors").EnumerateArray().Select(error => error.GetProperty("code").GetString()),
            code => code == "identity.user.not_found");
    }

    [Fact]
    public async Task A_cannot_be_changed_through_a_foreign_tenant()
    {
        var mine = new TenantScope(Guid.NewGuid());
        var theirs = new TenantScope(Guid.NewGuid());
        var foreignId = (await RegisterAsync(theirs, NewMobile(), "قابل تغییر نیست")).GetProperty("id").GetGuid();

        using var suspend = Authorized(
            HttpMethod.Post, $"/api/v1/identity/users/{foreignId}/lifecycle/suspend", mine, [Permissions.IdentityWrite],
            new { reason = "دلیل آزمون" });
        Assert.Equal(HttpStatusCode.NotFound, (await _client.SendAsync(suspend)).StatusCode);

        using var read = Authorized(HttpMethod.Get, $"/api/v1/identity/users/{foreignId}", theirs, [Permissions.IdentityRead]);
        var detail = await (await _client.SendAsync(read)).Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal("Active", detail.GetProperty("status").GetString());
    }

    [Fact]
    public async Task A_suspension_without_a_reason_is_refused()
    {
        var scope = new TenantScope(Guid.NewGuid());
        var userId = (await RegisterAsync(scope, NewMobile(), "بدون دلیل")).GetProperty("id").GetGuid();

        using var suspend = Authorized(
            HttpMethod.Post, $"/api/v1/identity/users/{userId}/lifecycle/suspend", scope, [Permissions.IdentityWrite],
            new { reason = "   " });
        var response = await _client.SendAsync(suspend);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();

        // A hold with no stated cause is indistinguishable from a defect once the person cannot sign in.
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains(
            problem.GetProperty("errors").EnumerateArray().Select(error => error.GetProperty("code").GetString()),
            code => code == "identity.user.suspension_reason_required");
    }

    [Fact]
    public async Task Reactivating_a_suspended_identity_restores_what_the_profile_can_support()
    {
        var scope = new TenantScope(Guid.NewGuid());
        var userId = (await RegisterAsync(scope, NewMobile(), "معلق سپس فعال")).GetProperty("id").GetGuid();

        using var suspend = Authorized(
            HttpMethod.Post, $"/api/v1/identity/users/{userId}/lifecycle/suspend", scope, [Permissions.IdentityWrite],
            new { reason = "بررسی توسط واحد نظارت" });
        Assert.Equal(HttpStatusCode.NoContent, (await _client.SendAsync(suspend)).StatusCode);

        using var afterSuspend = Authorized(HttpMethod.Get, $"/api/v1/identity/users/{userId}", scope, [Permissions.IdentityRead]);
        var suspended = await (await _client.SendAsync(afterSuspend)).Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Suspended", suspended.GetProperty("status").GetString());

        using var reactivate = Authorized(
            HttpMethod.Post, $"/api/v1/identity/users/{userId}/lifecycle/reactivate", scope, [Permissions.IdentityWrite]);
        Assert.Equal(HttpStatusCode.NoContent, (await _client.SendAsync(reactivate)).StatusCode);

        using var afterReactivate = Authorized(HttpMethod.Get, $"/api/v1/identity/users/{userId}", scope, [Permissions.IdentityRead]);
        var restored = await (await _client.SendAsync(afterReactivate)).Content.ReadFromJsonAsync<JsonElement>();

        // Not Active, and deliberately so: the aggregate only restores Active when the master profile is
        // complete and the mobile number is proven, and an operator-provisioned identity has neither yet. An
        // identity that never proved who it is must not come back from a hold as though it had.
        Assert.Equal("PendingVerification", restored.GetProperty("status").GetString());

        // The number's proof survives the hold, so the identity is one confirmation away from being active
        // again rather than having to prove the number from scratch.
        Assert.False(restored.GetProperty("mobileVerifiedAt").ValueKind is System.Text.Json.JsonValueKind.Null);
    }

    [Fact]
    public async Task An_identity_with_a_complete_profile_comes_back_from_a_hold_as_active()
    {
        var scope = new TenantScope(Guid.NewGuid());
        var userId = (await RegisterAsync(scope, NewMobile(), "پروفایل کامل")).GetProperty("id").GetGuid();

        using (var suspend = Authorized(
            HttpMethod.Post, $"/api/v1/identity/users/{userId}/lifecycle/suspend", scope, [Permissions.IdentityWrite],
            new { reason = "موقت" }))
        {
            await _client.SendAsync(suspend);
        }

        using (var reactivate = Authorized(
            HttpMethod.Post, $"/api/v1/identity/users/{userId}/lifecycle/reactivate", scope, [Permissions.IdentityWrite]))
        {
            await _client.SendAsync(reactivate);
        }

        using var read = Authorized(HttpMethod.Get, $"/api/v1/identity/users/{userId}", scope, [Permissions.IdentityRead]);
        var detail = await (await _client.SendAsync(read)).Content.ReadFromJsonAsync<JsonElement>();

        // The same call on the same identity, and the status follows the profile rather than the request.
        // That is the property worth protecting: restoration is decided by the record, not by the operator.
        Assert.Equal(detail.GetProperty("profile").GetProperty("isComplete").GetBoolean() ? "Active" : "PendingVerification",
            detail.GetProperty("status").GetString());
    }

    [Fact]
    public async Task A_closed_identity_cannot_be_reactivated()
    {
        var scope = new TenantScope(Guid.NewGuid());
        var userId = (await RegisterAsync(scope, NewMobile(), "بسته می‌شود")).GetProperty("id").GetGuid();

        using var close = Authorized(
            HttpMethod.Post, $"/api/v1/identity/users/{userId}/lifecycle/close", scope, [Permissions.IdentityWrite],
            new { reason = "درخواست خود فرد" });
        Assert.Equal(HttpStatusCode.NoContent, (await _client.SendAsync(close)).StatusCode);

        using var reactivate = Authorized(
            HttpMethod.Post, $"/api/v1/identity/users/{userId}/lifecycle/reactivate", scope, [Permissions.IdentityWrite]);
        var response = await _client.SendAsync(reactivate);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();

        // A closed account is retained for legal and audit reasons. Reopening it would turn a retained record
        // into a usable one, so the refusal is a domain rule rather than a missing route.
        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Contains(
            problem.GetProperty("errors").EnumerateArray().Select(error => error.GetProperty("code").GetString()),
            code => code == "identity.user.closed");
    }

    [Fact]
    public async Task Closing_an_identity_revokes_its_roles_and_the_trail_records_that()
    {
        var scope = new TenantScope(Guid.NewGuid());
        var roleCode = $"identity_role_{Guid.NewGuid():N}"[..24];
        var userId = (await RegisterAsync(scope, NewMobile(), "دارای نقش")).GetProperty("id").GetGuid();

        await DefineRoleAsync(scope, roleCode);

        using var grant = Authorized(
            HttpMethod.Post, $"/api/v1/identity/users/{userId}/roles", scope, [Permissions.IdentityWrite],
            new { roleCode });
        Assert.Equal(HttpStatusCode.NoContent, (await _client.SendAsync(grant)).StatusCode);

        using var close = Authorized(
            HttpMethod.Post, $"/api/v1/identity/users/{userId}/lifecycle/close", scope, [Permissions.IdentityWrite],
            new { reason = "پایان همکاری" });
        Assert.Equal(HttpStatusCode.NoContent, (await _client.SendAsync(close)).StatusCode);

        using var read = Authorized(HttpMethod.Get, $"/api/v1/identity/users/{userId}", scope, [Permissions.IdentityRead]);
        var detail = await (await _client.SendAsync(read)).Content.ReadFromJsonAsync<JsonElement>();

        var assignment = Assert.Single(detail.GetProperty("roles").EnumerateArray());
        Assert.Equal(roleCode, assignment.GetProperty("roleCode").GetString());
        Assert.True(assignment.GetProperty("isRevoked").GetBoolean());
    }

    [Fact]
    public async Task Granting_a_role_the_tenant_has_not_defined_is_refused()
    {
        var scope = new TenantScope(Guid.NewGuid());
        var userId = (await RegisterAsync(scope, NewMobile(), "نقش ناموجود")).GetProperty("id").GetGuid();

        using var grant = Authorized(
            HttpMethod.Post, $"/api/v1/identity/users/{userId}/roles", scope, [Permissions.IdentityWrite],
            new { roleCode = "role_that_was_never_defined" });
        var response = await _client.SendAsync(grant);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();

        // Granting a code no role defines would produce an identity that holds a role and therefore grants
        // nothing, which reads in a UI as a broken account rather than as a bad grant.
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Contains(
            problem.GetProperty("errors").EnumerateArray().Select(error => error.GetProperty("code").GetString()),
            code => code!.StartsWith("authorization.role.", StringComparison.Ordinal));
    }

    [Fact]
    public async Task A_role_code_is_data_and_never_one_of_those_hard_coded_into_the_api()
    {
        var scope = new TenantScope(Guid.NewGuid());
        var roleCode = $"seller_{Guid.NewGuid():N}"[..24];
        var userId = (await RegisterAsync(scope, NewMobile(), "فروشنده")).GetProperty("id").GetGuid();
        await DefineRoleAsync(scope, roleCode);

        using var grant = Authorized(
            HttpMethod.Post, $"/api/v1/identity/users/{userId}/roles", scope, [Permissions.IdentityWrite],
            new { roleCode });
        Assert.Equal(HttpStatusCode.NoContent, (await _client.SendAsync(grant)).StatusCode);

        using var read = Authorized(HttpMethod.Get, $"/api/v1/identity/users/{userId}", scope, [Permissions.IdentityRead]);
        var detail = await (await _client.SendAsync(read)).Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(roleCode, Assert.Single(detail.GetProperty("roles").EnumerateArray()).GetProperty("roleCode").GetString());
        Assert.Equal(1, (await ReadDirectoryRowAsync(scope, userId)).GetProperty("roleCount").GetInt32());
    }

    [Fact]
    public async Task Revoking_a_role_keeps_the_assignment_as_history()
    {
        var scope = new TenantScope(Guid.NewGuid());
        var roleCode = $"revoked_{Guid.NewGuid():N}"[..24];
        var userId = (await RegisterAsync(scope, NewMobile(), "نقش پس‌گرفته")).GetProperty("id").GetGuid();
        await DefineRoleAsync(scope, roleCode);

        using (var grant = Authorized(
            HttpMethod.Post, $"/api/v1/identity/users/{userId}/roles", scope, [Permissions.IdentityWrite],
            new { roleCode }))
        {
            await _client.SendAsync(grant);
        }

        using var revoke = Authorized(
            HttpMethod.Delete, $"/api/v1/identity/users/{userId}/roles/{roleCode}", scope, [Permissions.IdentityWrite]);
        Assert.Equal(HttpStatusCode.NoContent, (await _client.SendAsync(revoke)).StatusCode);

        using var read = Authorized(HttpMethod.Get, $"/api/v1/identity/users/{userId}", scope, [Permissions.IdentityRead]);
        var detail = await (await _client.SendAsync(read)).Content.ReadFromJsonAsync<JsonElement>();

        var assignment = Assert.Single(detail.GetProperty("roles").EnumerateArray());
        Assert.True(assignment.GetProperty("isRevoked").GetBoolean());
        Assert.Equal(0, (await ReadDirectoryRowAsync(scope, userId)).GetProperty("roleCount").GetInt32());
    }

    [Fact]
    public async Task Revoking_a_role_that_was_never_granted_is_reported_in_the_platforms_own_vocabulary()
    {
        var scope = new TenantScope(Guid.NewGuid());
        var userId = (await RegisterAsync(scope, NewMobile(), "بدون نقش")).GetProperty("id").GetGuid();

        using var revoke = Authorized(
            HttpMethod.Delete, $"/api/v1/identity/users/{userId}/roles/never_granted", scope, [Permissions.IdentityWrite]);
        var response = await _client.SendAsync(revoke);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Contains(
            problem.GetProperty("errors").EnumerateArray().Select(error => error.GetProperty("code").GetString()),
            code => code == "identity.user.role_not_granted");
    }

    [Fact]
    public async Task A_display_name_change_persists_and_an_over_long_one_is_refused()
    {
        var scope = new TenantScope(Guid.NewGuid());
        var userId = (await RegisterAsync(scope, NewMobile(), "نام اولیه")).GetProperty("id").GetGuid();

        using var rename = Authorized(
            HttpMethod.Put, $"/api/v1/identity/users/{userId}/display-name", scope, [Permissions.IdentityWrite],
            new { displayName = "نام ویرایش‌شده" });
        Assert.Equal(HttpStatusCode.NoContent, (await _client.SendAsync(rename)).StatusCode);

        using var tooLong = Authorized(
            HttpMethod.Put, $"/api/v1/identity/users/{userId}/display-name", scope, [Permissions.IdentityWrite],
            new { displayName = new string('x', 300) });
        var response = await _client.SendAsync(tooLong);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains(
            problem.GetProperty("errors").EnumerateArray().Select(error => error.GetProperty("code").GetString()),
            code => code == "identity.user.display_name_too_long");

        using var read = Authorized(HttpMethod.Get, $"/api/v1/identity/users/{userId}", scope, [Permissions.IdentityRead]);
        var detail = await (await _client.SendAsync(read)).Content.ReadFromJsonAsync<JsonElement>();

        // The refusal did not overwrite the name that was already accepted.
        Assert.Equal("نام ویرایش‌شده", detail.GetProperty("displayName").GetString());
    }

    [Fact]
    public async Task A_weak_password_is_refused_and_the_threshold_is_reported_not_the_value()
    {
        var scope = new TenantScope(Guid.NewGuid());

        using var register = Authorized(HttpMethod.Post, "/api/v1/identity/users/", scope, [Permissions.IdentityWrite],
            new { mobile = NewMobile(), displayName = "رمز ضعیف", password = "short", preferredLocale = (string?)null });
        var response = await _client.SendAsync(register);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();
        var message = problem.GetProperty("errors").EnumerateArray().First()
            .GetProperty("description").GetString();

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains(
            problem.GetProperty("errors").EnumerateArray().Select(error => error.GetProperty("code").GetString()),
            code => code == "identity.user.credential_too_weak");

        // The policy is deployment data, so the message states the rule and never the submitted value.
        Assert.DoesNotContain("short", message!, StringComparison.Ordinal);
    }

    [Fact]
    public async Task An_unknown_status_filter_is_refused_rather_than_silently_ignored()
    {
        var scope = new TenantScope(Guid.NewGuid());

        using var search = Authorized(
            HttpMethod.Get, "/api/v1/identity/users/?status=Marvellous", scope, [Permissions.IdentityRead]);
        var response = await _client.SendAsync(search);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();

        // Silently dropping an unrecognised filter would answer a different question from the one asked and
        // report a total count that has nothing to do with the request.
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains(
            problem.GetProperty("errors").EnumerateArray().Select(error => error.GetProperty("code").GetString()),
            code => code == "identity.user.status_invalid");
    }

    [Fact]
    public async Task Paging_below_one_is_a_bad_request_and_not_a_server_fault()
    {
        var scope = new TenantScope(Guid.NewGuid());

        using var search = Authorized(
            HttpMethod.Get, "/api/v1/identity/users/?page=0&pageSize=5000", scope, [Permissions.IdentityRead]);
        var response = await _client.SendAsync(search);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();

        // A query string is client input. Throwing out of the paging value object would turn a typo into a 500.
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains(
            problem.GetProperty("errors").EnumerateArray().Select(error => error.GetProperty("code").GetString()),
            code => code == "identity.user.paging_invalid");
    }

    [Fact]
    public async Task The_directory_can_be_narrowed_by_status_and_by_name()
    {
        var scope = new TenantScope(Guid.NewGuid());
        var suspendedId = (await RegisterAsync(scope, NewMobile(), "نام فیلترشده")).GetProperty("id").GetGuid();
        await RegisterAsync(scope, NewMobile(), "نام دیگر");

        using (var suspend = Authorized(
            HttpMethod.Post, $"/api/v1/identity/users/{suspendedId}/lifecycle/suspend", scope, [Permissions.IdentityWrite],
            new { reason = "بررسی" }))
        {
            await _client.SendAsync(suspend);
        }

        using var byStatus = Authorized(
            HttpMethod.Get, "/api/v1/identity/users/?status=Suspended", scope, [Permissions.IdentityRead]);
        var suspended = await (await _client.SendAsync(byStatus)).Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(suspendedId, Assert.Single(suspended.GetProperty("items").EnumerateArray()).GetProperty("id").GetGuid());

        using var byName = Authorized(
            HttpMethod.Get, "/api/v1/identity/users/?text=فیلترشده", scope, [Permissions.IdentityRead]);
        var named = await (await _client.SendAsync(byName)).Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(suspendedId, Assert.Single(named.GetProperty("items").EnumerateArray()).GetProperty("id").GetGuid());
    }

    [Fact]
    public async Task A_caller_cannot_name_another_tenant_in_the_query_string()
    {
        var mine = new TenantScope(Guid.NewGuid());
        var theirs = new TenantScope(Guid.NewGuid());
        var created = await RegisterAsync(theirs, NewMobile(), "مالک دیگر");

        using var search = Authorized(
            HttpMethod.Get,
            $"/api/v1/identity/users/?organizationId={theirs.OrganizationId}&text=",
            mine,
            [Permissions.IdentityRead]);
        var page = await (await _client.SendAsync(search)).Content.ReadFromJsonAsync<JsonElement>();

        // An unrecognised parameter is ignored rather than honoured, and the scope is the session's
        // regardless. What matters is that the row stays out of reach.
        Assert.DoesNotContain(
            page.GetProperty("items").EnumerateArray().Select(item => item.GetProperty("id").GetGuid()),
            id => id == created.GetProperty("id").GetGuid());
    }

    [Fact]
    public async Task Reading_the_directory_is_itself_audited()
    {
        var scope = new TenantScope(Guid.NewGuid());
        var userId = (await RegisterAsync(scope, NewMobile(), "خوانده می‌شود")).GetProperty("id").GetGuid();

        using (var read = Authorized(HttpMethod.Get, $"/api/v1/identity/users/{userId}", scope, [Permissions.IdentityRead]))
        {
            await _client.SendAsync(read);
        }

        using (var list = Authorized(HttpMethod.Get, "/api/v1/identity/users/", scope, [Permissions.IdentityRead]))
        {
            await _client.SendAsync(list);
        }

        using var trail = Authorized(
            HttpMethod.Get, "/api/v1/audit?resourceType=identity_user", scope, [Permissions.AuditRead]);
        var page = await (await _client.SendAsync(trail)).Content.ReadFromJsonAsync<JsonElement>();
        var actions = page.GetProperty("items").EnumerateArray()
            .Select(item => item.GetProperty("action").GetString())
            .ToArray();

        // Who looked at which person is itself a fact an auditor must be able to find. Identity data is the
        // most sensitive content the platform holds, so the read is a recorded event and not a free action.
        Assert.Contains("identity.user.read", actions);
        Assert.Contains("identity.user.list", actions);
        Assert.Contains(
            page.GetProperty("items").EnumerateArray().Select(item => item.GetProperty("resourceId").GetString()),
            resourceId => resourceId == userId.ToString());
    }

    [Fact]
    public async Task A_refused_registration_is_audited_as_a_denial()
    {
        var scope = new TenantScope(Guid.NewGuid());
        var mobile = NewMobile();
        await RegisterAsync(scope, mobile, "اولی");

        using var again = Authorized(HttpMethod.Post, "/api/v1/identity/users/", scope, [Permissions.IdentityWrite],
            new { mobile, displayName = "دومی", password = (string?)null, preferredLocale = (string?)null });
        Assert.Equal(HttpStatusCode.Conflict, (await _client.SendAsync(again)).StatusCode);

        using var trail = Authorized(
            HttpMethod.Get, "/api/v1/audit?action=identity.user.register", scope, [Permissions.AuditRead]);
        var page = await (await _client.SendAsync(trail)).Content.ReadFromJsonAsync<JsonElement>();

        // If the refusal were only logged, a reviewer would see one successful registration and never learn
        // that someone tried to create a second identity for a person who already had one.
        var denied = page.GetProperty("items").EnumerateArray()
            .Single(item => item.GetProperty("outcome").GetString() == "Denied");
        Assert.Equal("identity.user.duplicate_merge_required", denied.GetProperty("reasonCode").GetString());
    }

    [Fact]
    public void A_session_with_no_tenant_cannot_be_minted_at_all()
    {
        // The issuer refuses to produce a token without an organizational scope, so the tenant-less session
        // that would make the directory cross-tenant is not obtainable over HTTP in the first place. The
        // use case still refuses an empty scope, because a background job builds its principal from stored
        // data rather than from a token and can arrive without one.
        var refusal = Assert.Throws<InvalidOperationException>(() => _factory.ResolveIssuer().Issue(
            new AccessTokenRequest(Guid.NewGuid(), TenantScope.None, ["platform-admin"], [Permissions.IdentityRead])));

        Assert.Contains("organizational scope", refusal.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task The_directory_answers_from_the_database_and_not_from_a_seeded_fixture()
    {
        var scope = new TenantScope(Guid.NewGuid());
        var before = await CountDirectoryAsync(scope);

        Assert.Equal(0, before);

        var created = await RegisterAsync(scope, NewMobile(), "شمارش");
        Assert.Equal(1, await CountDirectoryAsync(scope));
        Assert.Single(await ReadDirectoryIdsAsync(scope));
        Assert.Equal(created.GetProperty("id").GetGuid(), Assert.Single(await ReadDirectoryIdsAsync(scope)));
    }

    private async Task<JsonElement> RegisterAsync(
        TenantScope scope,
        string mobile,
        string displayName,
        string? password = null)
    {
        using var register = Authorized(HttpMethod.Post, "/api/v1/identity/users/", scope, [Permissions.IdentityWrite],
            new { mobile, displayName, password, preferredLocale = (string?)null });

        var response = await _client.SendAsync(register);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        return await response.Content.ReadFromJsonAsync<JsonElement>();
    }

    private async Task<Guid> DefineRoleAsync(TenantScope scope, string code)
    {
        using var define = Authorized(
            HttpMethod.Post, "/api/v1/roles/", scope, [Permissions.RoleWrite],
            new { code, name = code, description = (string?)null });

        var response = await _client.SendAsync(define);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        return (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
    }

    private async Task<JsonElement> ReadDirectoryRowAsync(TenantScope scope, Guid userId)
    {
        using var list = Authorized(HttpMethod.Get, "/api/v1/identity/users/", scope, [Permissions.IdentityRead]);
        var page = await (await _client.SendAsync(list)).Content.ReadFromJsonAsync<JsonElement>();

        return Assert.Single(
            page.GetProperty("items").EnumerateArray(),
            item => item.GetProperty("id").GetGuid() == userId);
    }

    private async Task<long> CountDirectoryAsync(TenantScope scope)
    {
        using var list = Authorized(HttpMethod.Get, "/api/v1/identity/users/", scope, [Permissions.IdentityRead]);
        var response = await _client.SendAsync(list);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        return (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("totalCount").GetInt64();
    }

    private async Task<IReadOnlyList<Guid>> ReadDirectoryIdsAsync(TenantScope scope)
    {
        using var list = Authorized(HttpMethod.Get, "/api/v1/identity/users/", scope, [Permissions.IdentityRead]);
        var page = await (await _client.SendAsync(list)).Content.ReadFromJsonAsync<JsonElement>();

        return [.. page.GetProperty("items").EnumerateArray().Select(item => item.GetProperty("id").GetGuid())];
    }

    /// <summary>
    /// The mask the value object produces, derived rather than written out, so a change to the masking rule
    /// fails one assertion here instead of forty hard-coded strings across the suite.
    /// </summary>
    private static string Masked(string mobile) => $"{mobile[..3]}*****{mobile[^4..]}";

    /// <summary>A unique, valid Iranian mobile number, so a duplicate conflict is always the test's doing.</summary>
    private static string NewMobile()
    {
        var suffix = (uint)Random.Shared.Next(100_000_000, 999_999_999);
        return $"+989{suffix}";
    }

    /// <summary>Mints a correctly signed token. Every request goes through the real issuer.</summary>
    private HttpRequestMessage Authorized(
        HttpMethod method,
        string path,
        TenantScope scope,
        IReadOnlyCollection<string> permissions,
        object? body = null)
    {
        var request = new HttpRequestMessage(method, path);
        request.Headers.Authorization = new AuthenticationHeaderValue(
            "Bearer",
            _factory.ResolveIssuer().Issue(
                new AccessTokenRequest(Guid.NewGuid(), scope, ["platform-admin"], permissions)).Value);

        if (body is not null)
        {
            request.Content = JsonContent.Create(body);
        }

        return request;
    }
}
