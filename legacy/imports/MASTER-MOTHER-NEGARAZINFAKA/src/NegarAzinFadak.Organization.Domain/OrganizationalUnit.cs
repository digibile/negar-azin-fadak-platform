using NegarAzinFadak.Core;
using NegarAzinFadak.Core.Auditing;
using NegarAzinFadak.Core.Results;
using NegarAzinFadak.Core.Tenancy;

namespace NegarAzinFadak.Organization.Domain;

/// <summary>Lifecycle of an organizational node. Deactivation is preferred over deletion for audit integrity.</summary>
public enum OrganizationalUnitStatus
{
    /// <summary>Created but not yet operational.</summary>
    Draft = 0,

    /// <summary>Fully operational and accepting business operations.</summary>
    Active = 1,

    /// <summary>Temporarily suspended; historical data is retained and readable.</summary>
    Suspended = 2,

    /// <summary>Closed; no new business operations, historical data retained.</summary>
    Closed = 3
}

/// <summary>Shared behaviour of every level of the organizational tree.</summary>
/// <remarks>
/// Each level is its own aggregate root because they are created, named and deactivated independently
/// on different cadences. All of them carry the full <see cref="TenantScope"/> coordinates so that a
/// single global tenant filter can isolate reads without per-table bespoke logic.
/// </remarks>
public abstract class OrganizationalUnit : Core.Domain.AggregateRoot, IAuditable, IHasConcurrencyStamp, ITenantScoped
{
    private readonly List<string> _codeHistory = [];
    private readonly List<OrganizationalUnitStatusChange> _statusHistory = [];

    protected OrganizationalUnit(
        Guid id,
        TenantScope scope,
        string code,
        string name,
        string? legalName = null,
        Guid? parentId = null)
        : base(id)
    {
        Scope = Guard.AgainstNull(scope);
        Guard.Against(scope.IsEmpty, "An organizational unit must belong to an organization.");
        ParentId = parentId;
        Code = NormalizeCode(code);
        Name = Guard.AgainstNullOrWhiteSpace(name);
        LegalName = string.IsNullOrWhiteSpace(legalName) ? Name : legalName.Trim();
        Status = OrganizationalUnitStatus.Draft;
        ConcurrencyStamp = Guid.NewGuid().ToString("N");
    }

    protected OrganizationalUnit()
    {
    }

    /// <summary>Organizational coordinates of this unit. The organization level is always present.</summary>
    public TenantScope Scope { get; private set; } = TenantScope.None;

    /// <summary>
    /// Identifier of the unit one level up, or <see langword="null"/> for the organization itself.
    /// </summary>
    /// <remarks>
    /// This exists alongside <see cref="Scope"/> rather than instead of it. Scope is the security
    /// boundary: a single serialized value that every read is filtered by. Parent is the structural
    /// relationship: "which children does this unit have", asked constantly by the hierarchy screens.
    /// It cannot be answered from the scope string — a value-converted member access does not translate to
    /// SQL — so it is stored as a plain indexed Guid column, which is also what makes a uniqueness rule
    /// "code is unique among siblings" expressible in the database.
    /// </remarks>
    public Guid? ParentId { get; private set; }

    /// <summary>Short unique code within the parent, used in imports, labels and external references.</summary>
    public string Code { get; private set; } = string.Empty;

    /// <summary>Display name.</summary>
    public string Name { get; private set; } = string.Empty;

    /// <summary>Legal name used on contracts and official documents; defaults to <see cref="Name"/>.</summary>
    public string LegalName { get; private set; } = string.Empty;

    public OrganizationalUnitStatus Status { get; private set; }

    public bool IsActive => Status == OrganizationalUnitStatus.Active;

    /// <summary>Free-form note kept for operational context, never for identity data.</summary>
    public string? Description { get; private set; }

    /// <summary>Previous codes, so historical documents that reference an old code still resolve.</summary>
    public IReadOnlyList<string> CodeHistory => _codeHistory.AsReadOnly();

    public DateTimeOffset CreatedAt { get; set; }

    public Guid? CreatedBy { get; set; }

    public DateTimeOffset? ModifiedAt { get; set; }

    public Guid? ModifiedBy { get; set; }

    public string ConcurrencyStamp { get; set; } = string.Empty;

    /// <summary>Renames the unit. Codes are operational identifiers and are not changed here.</summary>
    public Result Rename(string name, string? legalName = null)
    {
        var newName = Guard.AgainstNullOrWhiteSpace(name).Trim();
        var newLegalName = string.IsNullOrWhiteSpace(legalName) ? newName : legalName.Trim();

        Name = newName;
        LegalName = newLegalName;
        return Result.Success();
    }

    /// <summary>Activates the unit, allowing it to take part in business operations.</summary>
    public Result Activate() => Activate(null, null, null);

    /// <summary>Activates the unit, recording who did it and when.</summary>
    public Result Activate(Guid? actorId, DateTimeOffset? at = null, string? reason = null)
    {
        if (IsActive)
        {
            return Result.Success();
        }

        if (Status == OrganizationalUnitStatus.Closed)
        {
            return Result.Failure(OrganizationErrors.UnitClosed(Code));
        }

        TransitionTo(OrganizationalUnitStatus.Active, reason, actorId, at);
        return Result.Success();
    }

    /// <summary>
    /// Suspends the unit, recording who did it and when.
    /// </summary>
    /// <remarks>
    /// A reason is mandatory, and there is deliberately no reason-less overload. Suspension decides
    /// whether a tenant may trade, so an unexplained hold is indistinguishable from a defect when the
    /// tenant asks why.
    /// </remarks>
    public Result Suspend(string reason, Guid? actorId, DateTimeOffset? at = null)
    {
        if (Status == OrganizationalUnitStatus.Closed)
        {
            return Result.Failure(OrganizationErrors.UnitClosed(Code));
        }

        if (string.IsNullOrWhiteSpace(reason))
        {
            return Result.Failure(OrganizationErrors.SuspensionReasonRequired(Code));
        }

        TransitionTo(OrganizationalUnitStatus.Suspended, reason, actorId, at);
        return Result.Success();
    }

    /// <summary>Closes the unit permanently for new business.</summary>
    public Result Close() => Close(null, null, null);

    /// <summary>Closes the unit permanently, optionally recording why.</summary>
    public Result Close(string? reason) => Close(reason, null, null);

    /// <summary>Closes the unit permanently, recording who did it and when.</summary>
    public Result Close(string? reason, Guid? actorId, DateTimeOffset? at = null)
    {
        if (Status == OrganizationalUnitStatus.Closed)
        {
            return Result.Failure(OrganizationErrors.AlreadyClosed(Code));
        }

        TransitionTo(OrganizationalUnitStatus.Closed, reason, actorId, at);
        Description = string.IsNullOrWhiteSpace(reason) ? Description : reason.Trim();
        return Result.Success();
    }

    /// <summary>Recorded lifecycle transitions, oldest first.</summary>
    public IReadOnlyList<OrganizationalUnitStatusChange> StatusHistory => _statusHistory.AsReadOnly();

    /// <summary>Description of the unit, set by an operator for operational context.</summary>
    public Result SetDescription(string? description)
    {
        Description = string.IsNullOrWhiteSpace(description) ? null : description.Trim();
        return Result.Success();
    }

    private void TransitionTo(OrganizationalUnitStatus next, string? reason, Guid? actorId, DateTimeOffset? at)
    {
        _statusHistory.Add(new OrganizationalUnitStatusChange(
            Guid.NewGuid(),
            Id,
            Status,
            next,
            reason,
            actorId,
            at ?? DateTimeOffset.UtcNow,
            Scope));

        Status = next;
    }

    /// <summary>
    /// The canonical stored form of a code.
    /// </summary>
    /// <remarks>
    /// Exposed because a lookup has to normalize exactly the way construction does. When this rule lived only
    /// inside the constructor, a read path that trimmed but did not upper-case would quietly stop finding
    /// tenants that plainly exist — a failure that looks like a missing record rather than a mismatched rule.
    /// </remarks>
    public static string NormalizeCodeForStorage(string code) => NormalizeCode(code);

    private static string NormalizeCode(string code)
    {
        var trimmed = Guard.AgainstNullOrWhiteSpace(code).Trim();
        if (trimmed.Length > 64)
        {
            throw new ArgumentException("Code must not exceed 64 characters.", nameof(code));
        }

        return trimmed.ToUpperInvariant();
    }
}

/// <summary>The root of the tenant hierarchy: the legal and operational boundary of all data.</summary>
public sealed class Organization : OrganizationalUnit
{
    public Organization(Guid id, string code, string name, string? legalName = null)
        : base(id, new TenantScope(id), code, name, legalName)
    {
    }

    private Organization()
    {
    }

    /// <summary>Economic identification code of the organization, when it is a legal entity.</summary>
    public string? EconomicCode { get; private set; }

    /// <summary>National registration number of the organization, when it is a legal entity.</summary>
    public string? NationalRegistrationNumber { get; private set; }

    /// <summary>Default currency of the organization, as an ISO 4217 code. Configured, never hard-coded downstream.</summary>
    public string DefaultCurrencyCode { get; private set; } = "IRR";

    /// <summary>Records the organization's economic identifiers.</summary>
    public Result SetLegalIdentifiers(string? economicCode, string? nationalRegistrationNumber)
    {
        EconomicCode = Normalize(economicCode);
        NationalRegistrationNumber = Normalize(nationalRegistrationNumber);
        return Result.Success();
    }

    /// <summary>Sets the currency used when no transaction specifies one.</summary>
    public Result SetDefaultCurrency(string isoCurrencyCode)
    {
        var code = Guard.AgainstNullOrWhiteSpace(isoCurrencyCode).Trim().ToUpperInvariant();
        if (code.Length is not (3 or 6))
        {
            return Result.Failure(OrganizationErrors.InvalidCurrency(code));
        }

        DefaultCurrencyCode = code;
        return Result.Success();
    }

    private static string? Normalize(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}

/// <summary>A legal or operational entity inside an organization, e.g. a legal subsidiary.</summary>
public sealed class Company : OrganizationalUnit
{
    public Company(Guid id, Guid organizationId, string code, string name, string? legalName = null)
        : base(id, new TenantScope(organizationId), code, name, legalName, organizationId)
    {
    }

    private Company()
    {
    }

    /// <summary>Default currency of this company.</summary>
    public string DefaultCurrencyCode { get; private set; } = "IRR";

    /// <summary>Sets the currency used when no transaction specifies one.</summary>
    public Result SetDefaultCurrency(string isoCurrencyCode)
    {
        var code = Guard.AgainstNullOrWhiteSpace(isoCurrencyCode).Trim().ToUpperInvariant();
        if (code.Length is not (3 or 6))
        {
            return Result.Failure(OrganizationErrors.InvalidCurrency(code));
        }

        DefaultCurrencyCode = code;
        return Result.Success();
    }
}

/// <summary>A commercial brand under a company. Brands own the product catalogue and pricing policies.</summary>
public sealed class Brand : OrganizationalUnit
{
    public Brand(Guid id, TenantScope parentScope, string code, string name, string? legalName = null)
        : base(
            id,
            Guard.Ensure(
                parentScope.CompanyId.HasValue && parentScope.BrandId is null,
                parentScope,
                "A brand must belong to a company and to nothing below it."),
            code,
            name,
            legalName,
            parentScope.CompanyId)
    {
    }

    private Brand()
    {
    }
}

/// <summary>A physical or administrative branch of a brand, e.g. a regional office.</summary>
public sealed class Branch : OrganizationalUnit
{
    public Branch(Guid id, TenantScope parentScope, string code, string name, string? legalName = null)
        : base(
            id,
            Guard.Ensure(
                parentScope.BrandId.HasValue && parentScope.BranchId is null,
                parentScope,
                "A branch must belong to a brand and to nothing below it."),
            code,
            name,
            legalName,
            parentScope.BrandId)
    {
    }

    private Branch()
    {
    }

    /// <summary>Geographic coordinates of the branch, when known.</summary>
    public string? City { get; private set; }

    /// <summary>Telephone number of the branch, in international format when possible.</summary>
    public string? PhoneNumber { get; private set; }

    /// <summary>Records the branch contact details.</summary>
    public Result SetContact(string? city, string? phoneNumber)
    {
        City = string.IsNullOrWhiteSpace(city) ? null : city.Trim();
        PhoneNumber = string.IsNullOrWhiteSpace(phoneNumber) ? null : phoneNumber.Trim();
        return Result.Success();
    }
}

/// <summary>A point of sale or a stock-keeping location; the narrowest tenant boundary in the platform.</summary>
public sealed class Store : OrganizationalUnit
{
    public Store(Guid id, TenantScope parentScope, string code, string name, string? legalName = null)
        : base(
            id,
            Guard.Ensure(
                parentScope.BranchId.HasValue && parentScope.StoreId is null,
                parentScope,
                "A store must belong to a branch and to nothing below it."),
            code,
            name,
            legalName,
            parentScope.BranchId)
    {
    }

    private Store()
    {
    }

    /// <summary>True when the location also serves customers, i.e. it is a retail store rather than a warehouse.</summary>
    public bool IsRetail { get; private set; } = true;

    /// <summary>Marks the location as retail-facing or warehouse-only.</summary>
    public Result SetRetailFlag(bool isRetail)
    {
        IsRetail = isRetail;
        return Result.Success();
    }
}

/// <summary>Stable error codes of the organization module, shared by domain and API layers.</summary>
public static class OrganizationErrors
{
    public const string UnitClosedCode = "organization.unit.closed";
    public const string AlreadyClosedCode = "organization.unit.already_closed";
    public const string InvalidCurrencyCode = "organization.unit.currency_invalid";
    public const string DuplicateCodeCode = "organization.unit.duplicate_code";
    public const string NotFoundCode = "organization.unit.not_found";
    public const string NotOperableCode = "organization.unit.not_operable";
    public const string SuspensionReasonRequiredCode = "organization.unit.suspension_reason_required";

    public static Error UnitClosed(string code)
        => Error.DomainRule(UnitClosedCode, $"Organizational unit '{code}' is closed and cannot be reactivated.");

    public static Error AlreadyClosed(string code)
        => Error.DomainRule(AlreadyClosedCode, $"Organizational unit '{code}' is already closed.");

    public static Error InvalidCurrency(string code)
        => Error.Validation(InvalidCurrencyCode, $"'{code}' is not a valid ISO 4217 currency code.");

    public static Error DuplicateCode(string code, string parentCode)
        => Error.Conflict(DuplicateCodeCode, $"Code '{code}' already exists under '{parentCode}'.");

    public static Error NotFound(string code)
        => Error.NotFound(NotFoundCode, $"Organizational unit '{code}' was not found in the current scope.");

    public static Error NotOperable(string code)
        => Error.DomainRule(NotOperableCode, $"Organizational unit '{code}' must be active to perform this operation.");

    public static Error SuspensionReasonRequired(string code)
        => Error.Validation(
            SuspensionReasonRequiredCode,
            $"A reason is required to suspend organizational unit '{code}'.");
}
