using NegarAzinFadak.Core.Primitives;
using NegarAzinFadak.Core.Tenancy;
using NegarAzinFadak.Identity.Domain;
using NegarAzinFadak.Identity.Domain.Users;

namespace NegarAzinFadak.Identity.Domain.Tests;

/// <summary>
/// Covers the password credential on the central identity: the rules that decide who may authenticate, and
/// the fact that a wrong guess is always recorded.
/// </summary>
public sealed class UserCredentialTests
{
    private const string Password = "correct-horse-battery";

    private static User NewIdentity(out TenantScope scope)
    {
        scope = new TenantScope(Guid.NewGuid());
        return User.Register(Guid.NewGuid(), scope, MobileNumber.Create("+989121112233"), UserSource.OperatorAssisted);
    }

    [Fact]
    public void An_identity_starts_with_no_password_credential()
    {
        var user = NewIdentity(out _);

        Assert.False(user.HasPasswordCredential);
        Assert.Null(user.PasswordHash);
    }

    [Fact]
    public void A_correct_password_authenticates_and_records_the_sign_in()
    {
        var user = NewIdentity(out _);
        user.SetPassword(FakeHasher.HashOf(Password));
        var before = DateTimeOffset.UtcNow;

        var result = user.VerifyPassword(Password, FakeHasher.Default);

        Assert.True(result.IsSuccess);
        Assert.Equal(0, user.FailedLoginAttempts);
        Assert.NotNull(user.LastLoginAt);
        Assert.True(user.LastLoginAt >= before);
    }

    [Fact]
    public void A_wrong_password_is_refused_and_counted()
    {
        var user = NewIdentity(out _);
        user.SetPassword(FakeHasher.HashOf(Password));

        var result = user.VerifyPassword("not-the-password", FakeHasher.Default);

        Assert.True(result.IsFailure);
        Assert.Equal(IdentityErrors.CredentialInvalidCode, result.FirstError.Code);
        Assert.Equal(1, user.FailedLoginAttempts);
        Assert.Null(user.LastLoginAt);
    }

    [Fact]
    public void An_identity_without_a_credential_cannot_sign_in_with_a_password()
    {
        // This is the state of every identity registered by one-time code, and it must be a refusal rather
        // than a crash or, worse, a success.
        var user = NewIdentity(out _);

        var result = user.VerifyPassword(Password, FakeHasher.Default);

        Assert.True(result.IsFailure);
        Assert.Equal(IdentityErrors.CredentialRequiredCode, result.FirstError.Code);
        Assert.Equal(1, user.FailedLoginAttempts);
    }

    [Fact]
    public void A_suspended_identity_cannot_sign_in_and_the_attempt_still_counts()
    {
        var user = NewIdentity(out _);
        user.SetPassword(FakeHasher.HashOf(Password));
        user.Suspend("under review");

        var result = user.VerifyPassword(Password, FakeHasher.Default);

        Assert.True(result.IsFailure);
        Assert.Equal(IdentityErrors.UserSuspendedCode, result.FirstError.Code);

        // Counting a correct password against a suspended account is deliberate: otherwise a suspended
        // identity's real password could be probed without ever tripping the lockout threshold.
        Assert.Equal(1, user.FailedLoginAttempts);
    }

    [Fact]
    public void A_closed_identity_cannot_sign_in_and_cannot_have_its_password_reset()
    {
        var user = NewIdentity(out _);
        user.SetPassword(FakeHasher.HashOf(Password));
        user.Close("closed by the operator");

        Assert.True(user.VerifyPassword(Password, FakeHasher.Default).IsFailure);
        Assert.Equal(IdentityErrors.UserClosedCode, user.VerifyPassword(Password, FakeHasher.Default).FirstError.Code);

        // A closed account is retained for legal reasons, so it must not become usable again by having its
        // credential replaced.
        var reset = user.SetPassword(FakeHasher.HashOf("a-brand-new-password"));

        Assert.True(reset.IsFailure);
        Assert.Equal(IdentityErrors.UserClosedCode, reset.FirstError.Code);
    }

    [Fact]
    public void A_successful_sign_in_clears_the_failure_counter()
    {
        var user = NewIdentity(out _);
        user.SetPassword(FakeHasher.HashOf(Password));
        user.VerifyPassword("wrong", FakeHasher.Default);
        user.VerifyPassword("also-wrong", FakeHasher.Default);
        Assert.Equal(2, user.FailedLoginAttempts);

        Assert.True(user.VerifyPassword(Password, FakeHasher.Default).IsSuccess);
        Assert.Equal(0, user.FailedLoginAttempts);
    }

    [Fact]
    public void Removing_the_credential_leaves_only_one_time_code_sign_in()
    {
        var user = NewIdentity(out _);
        user.SetPassword(FakeHasher.HashOf(Password));

        Assert.True(user.RemovePassword().IsSuccess);
        Assert.False(user.HasPasswordCredential);
        Assert.Equal(IdentityErrors.CredentialRequiredCode, user.VerifyPassword(Password, FakeHasher.Default).FirstError.Code);
    }

    [Fact]
    public void An_operator_activated_identity_can_sign_in()
    {
        var user = NewIdentity(out _);
        user.SetPassword(FakeHasher.HashOf(Password));
        user.ActivateByOperator(DateTimeOffset.UtcNow, Guid.NewGuid());

        Assert.Equal(UserStatus.Active, user.Status);
        Assert.True(user.VerifyPassword(Password, FakeHasher.Default).IsSuccess);
    }

    [Fact]
    public void Operator_activation_must_name_the_operator()
    {
        // An unattributed activation is an identity nobody can account for.
        var user = NewIdentity(out _);

        var result = user.ActivateByOperator(DateTimeOffset.UtcNow, Guid.Empty);

        Assert.True(result.IsFailure);
        Assert.Equal(IdentityErrors.OperatorRequiredCode, result.FirstError.Code);
        Assert.Equal(UserStatus.PendingVerification, user.Status);
    }

    [Fact]
    public void A_closed_identity_cannot_be_reactivated_by_an_operator()
    {
        var user = NewIdentity(out _);
        user.Close("closed");

        var result = user.ActivateByOperator(DateTimeOffset.UtcNow, Guid.NewGuid());

        Assert.True(result.IsFailure);
        Assert.Equal(IdentityErrors.UserClosedCode, result.FirstError.Code);
    }

    [Fact]
    public void A_display_name_longer_than_the_limit_is_refused()
    {
        var user = NewIdentity(out _);

        var result = user.SetDisplayName(new string('x', 257));

        Assert.True(result.IsFailure);
        Assert.Equal(IdentityErrors.DisplayNameTooLongCode, result.FirstError.Code);
        Assert.Equal(string.Empty, user.DisplayName);
    }

    [Fact]
    public void A_role_may_be_granted_within_the_identities_own_organization()
    {
        // Regression guard. The scope check on this path was inverted, so it fired when the scope matched the
        // identity's organization — which is every legitimate grant — and role granting could never succeed.
        // Nothing caught it because no test granted a role.
        var user = NewIdentity(out var scope);

        var granted = user.GrantRole("tenant_admin", scope);

        Assert.True(granted.IsSuccess);
        Assert.Contains(user.Roles, assignment => assignment.RoleCode == "tenant_admin");
    }

    [Fact]
    public void A_role_cannot_be_granted_across_organizations()
    {
        var user = NewIdentity(out var scope);
        var foreign = new TenantScope(Guid.NewGuid());

        Assert.Throws<InvalidOperationException>(() => user.GrantRole("tenant_admin", foreign));
        Assert.Empty(user.Roles);
    }

    /// <summary>
    /// A stand-in for the PBKDF2 hasher. The aggregate must delegate hashing rather than implement it, and
    /// this proves it: a hasher that compares the raw strings is enough to test every rule above, and keeps
    /// these domain tests from spending 210,000 iterations per assertion.
    /// </summary>
    private sealed class FakeHasher : Core.Security.IPasswordHasher
    {
        internal static readonly FakeHasher Default = new();

        internal static string HashOf(string password) => $"hash-of:{password}";

        public string Hash(string password) => HashOf(password);

        public bool Verify(string password, string hash) => string.Equals(HashOf(password), hash, StringComparison.Ordinal);

        public bool NeedsRehash(string hash) => false;
    }
}
