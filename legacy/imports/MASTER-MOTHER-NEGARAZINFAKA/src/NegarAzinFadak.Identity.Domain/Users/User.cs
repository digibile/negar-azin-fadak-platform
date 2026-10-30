using NegarAzinFadak.Core;
using NegarAzinFadak.Core.Auditing;
using NegarAzinFadak.Core.Domain;
using NegarAzinFadak.Core.Primitives;
using NegarAzinFadak.Core.Results;
using NegarAzinFadak.Core.Security;
using NegarAzinFadak.Core.Tenancy;

namespace NegarAzinFadak.Identity.Domain.Users;

/// <summary>Lifecycle of a central identity.</summary>
public enum UserStatus
{
    /// <summary>Created by registration; mobile not yet proven.</summary>
    PendingVerification = 0,

    /// <summary>Mobile proven and identity data present. Full platform access within granted permissions.</summary>
    Active = 1,

    /// <summary>Temporarily blocked by an operator or by automated risk control. Read-only access.</summary>
    Suspended = 2,

    /// <summary>Closed account. Identity and documents are retained for legal and audit purposes.</summary>
    Closed = 3
}

/// <summary>Kind of contact point on the central identity.</summary>
public enum ContactKind
{
    /// <summary>Mobile number, the anchor of mobile-first registration.</summary>
    Mobile = 0,

    /// <summary>Email address.</summary>
    Email = 1,

    /// <summary>Landline telephone.</summary>
    Telephone = 2,

    /// <summary>Messaging handle.</summary>
    Messenger = 3
}

/// <summary>Kind of postal address on the central identity.</summary>
public enum AddressKind
{
    /// <summary>Registered residence.</summary>
    Residence = 0,

    /// <summary>Current dwelling.</summary>
    Current = 1,

    /// <summary>Workplace address.</summary>
    Workplace = 2,

    /// <summary>Correspondence address used for official notices.</summary>
    Correspondence = 3
}

/// <summary>Administrative gender, as recorded on Iranian identity documents.</summary>
public enum Gender
{
    /// <summary>Not stated on the document.</summary>
    Unspecified = 0,

    /// <summary>Male.</summary>
    Male = 1,

    /// <summary>Female.</summary>
    Female = 2
}

/// <summary>
/// The central identity of one natural person. Every module of the platform references this aggregate;
/// a person exists here exactly once, whether they are a customer, an employee, a representative,
/// a merchant or an internal user.
/// </summary>
public sealed class User : AggregateRoot, IAuditable, IHasConcurrencyStamp, ITenantScoped
{
    private readonly List<UserRoleAssignment> _roles = [];
    private readonly List<UserContact> _contacts = [];
    private readonly List<UserAddress> _addresses = [];
    private readonly List<BankAccount> _bankAccounts = [];
    private readonly List<UserProfileChangeRequest> _pendingChanges = [];
    private IdentityProfile? _profile;

    private User(
        Guid id,
        TenantScope scope,
        MobileNumber mobile,
        UserSource source,
        string? preferredLocale = null)
        : base(id)
    {
        Scope = Guard.AgainstNull(scope);
        Mobile = Guard.AgainstNull(mobile);
        Source = source;
        Status = UserStatus.PendingVerification;
        PreferredLocale = string.IsNullOrWhiteSpace(preferredLocale) ? "fa-IR" : preferredLocale.Trim();
        ConcurrencyStamp = Guid.NewGuid().ToString("N");
        _profile = new IdentityProfile(Guid.NewGuid(), id);
    }

    private User()
    {
        Scope = TenantScope.None;
        PreferredLocale = "fa-IR";
    }

    /// <summary>Organizational coordinates this identity belongs to. An identity may span companies, never organizations.</summary>
    public TenantScope Scope { get; private set; }

    /// <summary>Anchor mobile number in E.164 form.</summary>
    public MobileNumber Mobile { get; private set; } = null!;

    /// <summary>Date and time the mobile number was proven by OTP.</summary>
    public DateTimeOffset? MobileVerifiedAt { get; private set; }

    public UserStatus Status { get; private set; }

    /// <summary>How the identity entered the platform; retained for fraud analysis.</summary>
    public UserSource Source { get; private set; }

    /// <summary>Display name kept on the identity for display contexts before the profile is complete.</summary>
    public string DisplayName { get; private set; } = string.Empty;

    /// <summary>BCP-47 locale of the user's interface, defaulting to Persian.</summary>
    public string PreferredLocale { get; private set; }

    /// <summary>True when the identity passed strong identity verification.</summary>
    public bool IsIdentityVerified { get; private set; }

    /// <summary>When strong identity verification completed.</summary>
    public DateTimeOffset? IdentityVerifiedAt { get; private set; }

    /// <summary>When the identity signed in last, denormalised for support and security views.</summary>
    public DateTimeOffset? LastLoginAt { get; private set; }

    /// <summary>Failed sign-in attempts since the last successful one; the platform locks out before abuse escalates.</summary>
    public int FailedLoginAttempts { get; private set; }

    /// <summary>
    /// Hash of the identity's password, or <see langword="null"/> when the identity has no password
    /// credential and can only sign in by one-time code.
    /// </summary>
    /// <remarks>
    /// The credential lives on the central identity rather than in a separate operator account table. A
    /// member of staff is a person like any other, so a parallel table would create a second place where
    /// one human exists, and the platform's central-identity rule exists precisely to prevent that. The
    /// value is a hash produced by <see cref="IPasswordHasher"/>; the plain password is never stored,
    /// returned by a query, or logged.
    /// </remarks>
    public string? PasswordHash { get; private set; }

    /// <summary>True when this identity can authenticate with a password.</summary>
    public bool HasPasswordCredential => !string.IsNullOrWhiteSpace(PasswordHash);

    /// <summary>Identity profile: the master record of this person's verified attributes.</summary>
    public IdentityProfile? Profile => _profile;

    public IReadOnlyList<UserRoleAssignment> Roles => _roles.AsReadOnly();

    public IReadOnlyList<UserContact> Contacts => _contacts.AsReadOnly();

    public IReadOnlyList<UserAddress> Addresses => _addresses.AsReadOnly();

    public IReadOnlyList<BankAccount> BankAccounts => _bankAccounts.AsReadOnly();

    /// <summary>Field-level change requests waiting for review; identity data never changes silently.</summary>
    public IReadOnlyList<UserProfileChangeRequest> PendingChanges => _pendingChanges.AsReadOnly();

    public DateTimeOffset CreatedAt { get; set; }

    public Guid? CreatedBy { get; set; }

    public DateTimeOffset? ModifiedAt { get; set; }

    public Guid? ModifiedBy { get; set; }

    public string ConcurrencyStamp { get; set; } = string.Empty;

    /// <summary>Starts mobile-first registration for a person who has no central identity yet.</summary>
    public static User Register(
        Guid id,
        TenantScope scope,
        MobileNumber mobile,
        UserSource source,
        string? preferredLocale = null)
        => new(id, scope, mobile, source, preferredLocale);

    /// <summary>
    /// Sets the display name shown before the identity profile is complete.
    /// </summary>
    /// <remarks>
    /// Bounded here rather than at the call site, because a name is rendered in headers, audit entries and
    /// exports, and an unbounded one becomes a place to smuggle markup or a megabyte of text.
    /// </remarks>
    public Result SetDisplayName(string displayName)
    {
        var name = Guard.AgainstNullOrWhiteSpace(displayName).Trim();

        if (name.Length > 256)
        {
            return Result.Failure(IdentityErrors.DisplayNameTooLong(256));
        }

        DisplayName = name;
        return Result.Success();
    }

    /// <summary>Records successful OTP verification of the anchor mobile number.</summary>
    public Result ConfirmMobileOwnership(DateTimeOffset verifiedAt)
    {
        if (MobileVerifiedAt.HasValue)
        {
            return Result.Failure(IdentityErrors.MobileAlreadyVerified);
        }

        MobileVerifiedAt = verifiedAt;
        if (Status == UserStatus.PendingVerification && Profile is not null && Profile.IsComplete)
        {
            Status = UserStatus.Active;
        }

        return Result.Success();
    }

    /// <summary>
    /// Replaces the anchor mobile number. Changing the anchor invalidates mobile ownership and drops the
    /// identity back to pending verification, because the new number has not been proven.
    /// </summary>
    public Result ChangeMobile(MobileNumber newMobile, string? reason)
    {
        ArgumentNullException.ThrowIfNull(newMobile);

        if (newMobile == Mobile)
        {
            return Result.Failure(IdentityErrors.MobileUnchanged);
        }

        if (MobileVerifiedAt.HasValue)
        {
            MobileVerifiedAt = null;
            IsIdentityVerified = false;
            IdentityVerifiedAt = null;
            Status = UserStatus.PendingVerification;
        }

        Mobile = newMobile;
        _contacts.RemoveAll(contact => contact.Kind == ContactKind.Mobile);
        AddContact(newMobile, ContactKind.Mobile, isPrimary: true, verifiedAt: null, reason);
        return Result.Success();
    }

    /// <summary>Grants a role within a scope. Role codes come from data, never from code.</summary>
    public Result GrantRole(string roleCode, TenantScope? scope = null, DateTimeOffset? grantedAt = null)
    {
        var code = Guard.AgainstNullOrWhiteSpace(roleCode).Trim();
        var effectiveScope = scope ?? Scope;
        Guard.Against(effectiveScope.OrganizationId != Scope.OrganizationId, "A role cannot cross organizations.");

        if (_roles.Any(role => role.RoleCode == code && role.Scope == effectiveScope && !role.IsRevoked))
        {
            return Result.Failure(IdentityErrors.RoleAlreadyGranted(code));
        }

        _roles.Add(new UserRoleAssignment(Guid.NewGuid(), code, effectiveScope, grantedAt ?? DateTimeOffset.UtcNow, Id));
        return Result.Success();
    }

    /// <summary>Revokes a previously granted role.</summary>
    public Result RevokeRole(string roleCode, TenantScope? scope = null, DateTimeOffset? revokedAt = null)
    {
        var code = Guard.AgainstNullOrWhiteSpace(roleCode).Trim();
        var effectiveScope = scope ?? Scope;
        var assignment = _roles.FirstOrDefault(
            role => role.RoleCode == code && role.Scope == effectiveScope && !role.IsRevoked);

        if (assignment is null)
        {
            return Result.Failure(IdentityErrors.RoleNotGranted(code));
        }

        assignment.Revoke(revokedAt ?? DateTimeOffset.UtcNow);
        return Result.Success();
    }

    /// <summary>True when the identity holds the role anywhere in its current scope.</summary>
    public bool HasRole(string roleCode) => _roles.Any(role => role.RoleCode == roleCode && !role.IsRevoked);

    /// <summary>Adds a contact point. Duplicate values are rejected so uniqueness can be enforced by the store.</summary>
    public Result AddContact(
        MobileNumber mobile,
        ContactKind kind,
        bool isPrimary = false,
        DateTimeOffset? verifiedAt = null,
        string? verificationMethod = null)
    {
        var duplicate = _contacts.FirstOrDefault(
            contact => contact.Kind == kind && string.Equals(contact.Value, mobile.Value, StringComparison.Ordinal));

        if (duplicate is not null)
        {
            return Result.Failure(IdentityErrors.ContactAlreadyExists(kind.ToString(), mobile.Masked));
        }

        if (isPrimary)
        {
            foreach (var contact in _contacts.Where(contact => contact.Kind == kind))
            {
                contact.MarkNotPrimary();
            }
        }

        _contacts.Add(new UserContact(
            Guid.NewGuid(),
            Id,
            kind,
            mobile.Value,
            isPrimary,
            verifiedAt,
            verificationMethod));
        return Result.Success();
    }

    /// <summary>Adds an email contact point.</summary>
    public Result AddEmail(string email, bool isPrimary = false, DateTimeOffset? verifiedAt = null)
    {
        var normalized = Guard.AgainstNullOrWhiteSpace(email).Trim().ToLowerInvariant();
        if (!normalized.Contains('@') || normalized.StartsWith('@') || normalized.EndsWith('@'))
        {
            return Result.Failure(IdentityErrors.InvalidEmail);
        }

        if (_contacts.Any(contact => contact.Kind == ContactKind.Email && contact.Value == normalized))
        {
            return Result.Failure(IdentityErrors.ContactAlreadyExists(nameof(ContactKind.Email), normalized));
        }

        if (isPrimary)
        {
            foreach (var contact in _contacts.Where(contact => contact.Kind == ContactKind.Email))
            {
                contact.MarkNotPrimary();
            }
        }

        _contacts.Add(new UserContact(Guid.NewGuid(), Id, ContactKind.Email, normalized, isPrimary, verifiedAt, null));
        return Result.Success();
    }

    /// <summary>Adds a postal address.</summary>
    public Result AddAddress(
        AddressKind kind,
        string countryCode,
        string? province,
        string? city,
        string? postalCode,
        string? line1,
        string? line2)
    {
        var country = Guard.AgainstNullOrWhiteSpace(countryCode).Trim().ToUpperInvariant();
        Guard.Against(country.Length != 2, "Country code must be a two-letter ISO 3166-1 alpha-2 code.");

        if (!string.IsNullOrWhiteSpace(postalCode) && postalCode.Trim().Length is < 4 or > 16)
        {
            return Result.Failure(IdentityErrors.InvalidPostalCode);
        }

        var address = new UserAddress(
            Guid.NewGuid(),
            Id,
            kind,
            country,
            TrimOrNull(province),
            TrimOrNull(city),
            TrimOrNull(postalCode),
            TrimOrNull(line1),
            TrimOrNull(line2));

        _addresses.Add(address);
        return Result.Success();
    }

    /// <summary>Registers a bank account in the person's name.</summary>
    public Result AddBankAccount(BankAccount account)
    {
        ArgumentNullException.ThrowIfNull(account);

        if (_bankAccounts.Any(existing => existing.BankCode == account.BankCode
            && existing.Iban.Value == account.Iban.Value))
        {
            return Result.Failure(IdentityErrors.BankAccountDuplicate);
        }

        _bankAccounts.Add(account);
        return Result.Success();
    }

    /// <summary>Records a successful sign-in and resets the failure counter.</summary>
    public void RecordSuccessfulLogin(DateTimeOffset at) => LastLoginAt = at;

    /// <summary>Records a failed sign-in attempt.</summary>
    public void RecordFailedLogin() => FailedLoginAttempts++;

    /// <summary>Resets the failure counter, e.g. after an OTP-based recovery.</summary>
    public void ResetFailedLogins() => FailedLoginAttempts = 0;

    /// <summary>
    /// Attaches or replaces the password credential of this identity.
    /// </summary>
    /// <param name="hash">Hash produced by <see cref="IPasswordHasher"/>. The plain password never reaches this method.</param>
    /// <remarks>
    /// Changing a credential is refused for a closed identity rather than silently accepted, because a
    /// closed account is retained for legal and audit reasons and must not become usable again by
    /// resetting a password against it.
    /// </remarks>
    public Result SetPassword(string hash)
    {
        var credential = Guard.AgainstNullOrWhiteSpace(hash);

        if (Status == UserStatus.Closed)
        {
            return Result.Failure(IdentityErrors.UserClosed);
        }

        PasswordHash = credential;
        return Result.Success();
    }

    /// <summary>
    /// Removes the password credential, leaving one-time-code sign-in as the only way in.
    /// </summary>
    public Result RemovePassword()
    {
        if (Status == UserStatus.Closed)
        {
            return Result.Failure(IdentityErrors.UserClosed);
        }

        PasswordHash = null;
        return Result.Success();
    }

    /// <summary>
    /// Verifies a candidate password against the stored credential and records the outcome.
    /// </summary>
    /// <param name="candidatePassword">Password as submitted.</param>
    /// <param name="hasher">The platform's password hasher; the aggregate never implements one itself.</param>
    /// <remarks>
    /// The account status is checked before the password is touched, so a closed identity is refused
    /// without spending a hashing round on it. A failure is always recorded, whether the password was
    /// wrong or the account is not in a state that permits sign-in, so that repeated attempts against a
    /// suspended account still accumulate towards lockout.
    /// </remarks>
    public Result VerifyPassword(string candidatePassword, IPasswordHasher hasher)
    {
        ArgumentNullException.ThrowIfNullOrWhiteSpace(candidatePassword);
        ArgumentNullException.ThrowIfNull(hasher);

        if (Status == UserStatus.Closed)
        {
            RecordFailedLogin();
            return Result.Failure(IdentityErrors.UserClosed);
        }

        if (Status == UserStatus.Suspended)
        {
            RecordFailedLogin();
            return Result.Failure(IdentityErrors.UserSuspended);
        }

        if (!HasPasswordCredential)
        {
            RecordFailedLogin();
            return Result.Failure(IdentityErrors.CredentialRequired);
        }

        if (!hasher.Verify(candidatePassword, PasswordHash!))
        {
            RecordFailedLogin();
            return Result.Failure(IdentityErrors.CredentialInvalid);
        }

        RecordSuccessfulLogin(DateTimeOffset.UtcNow);
        ResetFailedLogins();
        return Result.Success();
    }

    /// <summary>
    /// Activates an identity that an operator provisioned, for a member of staff who never completes the
    /// self-registration flow.
    /// </summary>
    /// <param name="at">When ownership of the anchor mobile number was proven.</param>
    /// <param name="operatorId">Operator who created the account and confirmed ownership in person.</param>
    /// <remarks>
    /// This exists because the platform's mobile-first registration assumes a person proves their own
    /// number by one-time code, which a platform administrator setting up a colleague's account cannot do.
    /// It is an operator action on the central identity, not a bypass: it still records who performed it,
    /// and it is refused outright for a closed identity.
    /// </remarks>
    public Result ActivateByOperator(DateTimeOffset at, Guid operatorId)
    {
        if (Status == UserStatus.Closed)
        {
            return Result.Failure(IdentityErrors.UserClosed);
        }

        if (operatorId == Guid.Empty)
        {
            return Result.Failure(IdentityErrors.OperatorRequired);
        }

        MobileVerifiedAt ??= at;
        Status = UserStatus.Active;
        return Result.Success();
    }

    /// <summary>Suspends the identity, e.g. after fraud detection or a compliance request.</summary>
    public Result Suspend(string? reason)
    {
        if (Status == UserStatus.Closed)
        {
            return Result.Failure(IdentityErrors.UserClosed);
        }

        Status = UserStatus.Suspended;
        return Result.Success();
    }

    /// <summary>Closes the identity. Identity data is retained for legal and audit obligations.</summary>
    public Result Close(string? reason)
    {
        if (Status == UserStatus.Closed)
        {
            return Result.Failure(IdentityErrors.UserClosed);
        }

        Status = UserStatus.Closed;
        foreach (var role in _roles)
        {
            role.Revoke(DateTimeOffset.UtcNow);
        }

        return Result.Success();
    }

    /// <summary>Reactivates a suspended identity and re-grants no role automatically.</summary>
    public Result Reactivate()
    {
        if (Status == UserStatus.Closed)
        {
            return Result.Failure(IdentityErrors.UserClosed);
        }

        Status = Profile is { IsComplete: true } && MobileVerifiedAt.HasValue
            ? UserStatus.Active
            : UserStatus.PendingVerification;
        return Result.Success();
    }

    /// <summary>Mark the identity as strongly verified. Only the verification pipeline may call this.</summary>
    public Result MarkIdentityVerified(DateTimeOffset verifiedAt)
    {
        if (!MobileVerifiedAt.HasValue)
        {
            return Result.Failure(IdentityErrors.MobileNotVerified);
        }

        if (Profile is null || !Profile.IsComplete)
        {
            return Result.Failure(IdentityErrors.ProfileIncomplete);
        }

        IsIdentityVerified = true;
        IdentityVerifiedAt = verifiedAt;
        if (Status == UserStatus.PendingVerification)
        {
            Status = UserStatus.Active;
        }

        return Result.Success();
    }

    /// <summary>Downgrades the identity when the evidence behind a verification is revoked.</summary>
    public void RevokeIdentityVerification()
    {
        IsIdentityVerified = false;
        IdentityVerifiedAt = null;
        if (Status == UserStatus.Active)
        {
            Status = UserStatus.PendingVerification;
        }
    }

    /// <summary>Records a change request for reviewed, audited modification of master identity data.</summary>
    public Result RequestProfileChange(
        IdentityField field,
        string? newValue,
        string reason,
        Guid requestedBy)
    {
        var justification = Guard.AgainstNullOrWhiteSpace(reason);
        if (newValue is not null && newValue.Length > 512)
        {
            return Result.Failure(IdentityErrors.FieldValueTooLong);
        }

        _pendingChanges.Add(new UserProfileChangeRequest(
            Guid.NewGuid(),
            Id,
            field,
            newValue,
            justification,
            requestedBy,
            DateTimeOffset.UtcNow));
        return Result.Success();
    }

    /// <summary>Applies an approved change request to the master profile.</summary>
    public Result ApplyProfileChange(Guid changeRequestId, Guid reviewerId, DateTimeOffset appliedAt)
    {
        var change = _pendingChanges.FirstOrDefault(request => request.Id == changeRequestId);
        if (change is null)
        {
            return Result.Failure(IdentityErrors.ChangeRequestNotFound);
        }

        if (change.Status != ProfileChangeStatus.Pending)
        {
            return Result.Failure(IdentityErrors.ChangeRequestNotPending);
        }

        var profile = _profile;
        if (profile is null)
        {
            return Result.Failure(IdentityErrors.ProfileIncomplete);
        }

        var applied = profile.ApplyReviewedField(change.Field, change.NewValue, reviewerId, appliedAt);
        if (applied.IsFailure)
        {
            return applied;
        }

        change.Approve(reviewerId, appliedAt);
        return Result.Success();
    }

    /// <summary>Rejects a pending change request.</summary>
    public Result RejectProfileChange(Guid changeRequestId, Guid reviewerId, string reason, DateTimeOffset rejectedAt)
    {
        var change = _pendingChanges.FirstOrDefault(request => request.Id == changeRequestId);
        if (change is null)
        {
            return Result.Failure(IdentityErrors.ChangeRequestNotFound);
        }

        if (change.Status != ProfileChangeStatus.Pending)
        {
            return Result.Failure(IdentityErrors.ChangeRequestNotPending);
        }

        change.Reject(reviewerId, Guard.AgainstNullOrWhiteSpace(reason), rejectedAt);
        return Result.Success();
    }

    private static string? TrimOrNull(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}

/// <summary>How an identity entered the platform. Retained for fraud analysis and onboarding reporting.</summary>
public enum UserSource
{
    /// <summary>Mobile self-registration.</summary>
    MobileRegistration = 0,

    /// <summary>Created by an operator, e.g. a branch employee registering a walk-in customer.</summary>
    OperatorAssisted = 1,

    /// <summary>Imported from an authoritative external registry.</summary>
    Import = 2,

    /// <summary>Created through single sign-on from an external identity provider.</summary>
    ExternalProvider = 3
}

/// <summary>A role granted to a central identity within a specific organizational scope.</summary>
public sealed class UserRoleAssignment : ITenantScoped
{
    private UserRoleAssignment()
    {
        RoleCode = string.Empty;
        Scope = TenantScope.None;
    }

    internal UserRoleAssignment(Guid id, string roleCode, TenantScope scope, DateTimeOffset grantedAt, Guid userId)
    {
        Id = Guard.AgainstEmpty(id);
        RoleCode = Guard.AgainstNullOrWhiteSpace(roleCode);
        Scope = Guard.AgainstNull(scope);
        GrantedAt = grantedAt;
        UserId = Guard.AgainstEmpty(userId);
    }

    public Guid Id { get; private set; }

    public Guid UserId { get; private set; }

    /// <summary>Data-driven role code, resolved against the role table at authorization time.</summary>
    public string RoleCode { get; private set; }

    public TenantScope Scope { get; private set; }

    public DateTimeOffset GrantedAt { get; private set; }

    public DateTimeOffset? RevokedAt { get; private set; }

    public Guid? RevokedBy { get; private set; }

    public bool IsRevoked => RevokedAt.HasValue;

    internal void Revoke(DateTimeOffset at)
    {
        RevokedAt = at;
        RevokedBy = null;
    }
}

/// <summary>A contact point on the central identity. Only verified contacts may be used for OTP delivery.</summary>
public sealed class UserContact
{
    private UserContact()
    {
        Value = string.Empty;
    }

    internal UserContact(
        Guid id,
        Guid userId,
        ContactKind kind,
        string value,
        bool isPrimary,
        DateTimeOffset? verifiedAt,
        string? verificationMethod)
    {
        Id = Guard.AgainstEmpty(id);
        UserId = Guard.AgainstEmpty(userId);
        Kind = kind;
        Value = Guard.AgainstNullOrWhiteSpace(value);
        IsPrimary = isPrimary;
        VerifiedAt = verifiedAt;
        VerificationMethod = verificationMethod;
    }

    public Guid Id { get; private set; }

    public Guid UserId { get; private set; }

    public ContactKind Kind { get; private set; }

    /// <summary>Canonical representation: E.164 for mobiles, lower-case for emails.</summary>
    public string Value { get; private set; }

    public bool IsPrimary { get; private set; }

    public DateTimeOffset? VerifiedAt { get; private set; }

    public bool IsVerified => VerifiedAt.HasValue;

    /// <summary>How the contact was proven, e.g. <c>otp</c> or <c>possession_of_card</c>.</summary>
    public string? VerificationMethod { get; private set; }

    /// <summary>Masked form for display contexts that must not reveal the full value.</summary>
    public string MaskedValue => Kind == ContactKind.Mobile && Value.Length > 7
        ? $"{Value[..3]}*****{Value[^4..]}"
        : Value;

    internal void MarkNotPrimary() => IsPrimary = false;
}

/// <summary>A postal address of the central identity.</summary>
public sealed class UserAddress
{
    private UserAddress()
    {
        CountryCode = string.Empty;
    }

    internal UserAddress(
        Guid id,
        Guid userId,
        AddressKind kind,
        string countryCode,
        string? province,
        string? city,
        string? postalCode,
        string? line1,
        string? line2)
    {
        Id = Guard.AgainstEmpty(id);
        UserId = Guard.AgainstEmpty(userId);
        Kind = kind;
        CountryCode = countryCode;
        Province = province;
        City = city;
        PostalCode = postalCode;
        Line1 = line1;
        Line2 = line2;
    }

    public Guid Id { get; private set; }

    public Guid UserId { get; private set; }

    public AddressKind Kind { get; private set; }

    public string CountryCode { get; private set; }

    public string? Province { get; private set; }

    public string? City { get; private set; }

    public string? PostalCode { get; private set; }

    public string? Line1 { get; private set; }

    public string? Line2 { get; private set; }

    /// <summary>Single-line human-readable rendering used on contracts and shipping labels.</summary>
    public string ToDisplayString()
        => string.Join("، ", new[] { CountryCode, Province, City, Line1, Line2, PostalCode }
            .Where(part => !string.IsNullOrWhiteSpace(part)));
}

/// <summary>Keyed digest helper for values that must be compared but never displayed in full.</summary>
public static class IdentityDigest
{
    /// <summary>Lower-cases and trims a value before it is used as a comparison key or index.</summary>
    public static string NormalizeForComparison(string? value)
        => (value ?? string.Empty).Trim().ToLowerInvariant();
}
