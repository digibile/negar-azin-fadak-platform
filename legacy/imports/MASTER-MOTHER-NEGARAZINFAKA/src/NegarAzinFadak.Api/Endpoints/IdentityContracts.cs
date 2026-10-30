using NegarAzinFadak.Application.Identity;
using NegarAzinFadak.Core.Paging;
using NegarAzinFadak.Core.Primitives;
using NegarAzinFadak.Core.Results;
using NegarAzinFadak.Identity.Domain;
using NegarAzinFadak.Identity.Domain.Users;

namespace NegarAzinFadak.Api.Endpoints;

/// <summary>Body of an operator-assisted identity registration.</summary>
/// <param name="Mobile">Anchor mobile number of the person, in any accepted spelling.</param>
/// <param name="DisplayName">Name shown before the master profile is complete.</param>
/// <param name="Password">
/// Optional password. Left out, the identity signs in by one-time code only. Subject to the platform's
/// minimum length; the value is never stored, returned or logged in plain form.
/// </param>
/// <param name="PreferredLocale">BCP-47 locale of the person's interface; defaults to Persian.</param>
public sealed record RegisterIdentityRequest(
    string Mobile,
    string DisplayName,
    string? Password = null,
    string? PreferredLocale = null);

/// <summary>Body of a display-name change.</summary>
public sealed record SetDisplayNameRequest(string DisplayName);

/// <summary>Body of a suspension or a closure.</summary>
/// <param name="Reason">
/// Why the identity is being held or closed. Required for a suspension, optional for a closure, and stored
/// in the audit trail rather than on the identity.
/// </param>
public sealed record IdentityLifecycleRequest(string? Reason);

/// <summary>Body of a role grant or revocation on an identity.</summary>
public sealed record UserRoleAssignmentRequest(string RoleCode);

/// <summary>Query string of the identity directory.</summary>
/// <param name="Page">One-based page number.</param>
/// <param name="PageSize">Records per page, capped by the platform.</param>
/// <param name="Status">Restrict to one lifecycle status.</param>
/// <param name="IsIdentityVerified">Restrict by whether strong verification completed.</param>
/// <param name="Mobile">Restrict to one anchor mobile number.</param>
/// <param name="Text">Free text matched against the display name and the confirmed profile name.</param>
/// <remarks>
/// There is no tenant filter here on purpose, and the reason is worth stating once. A query string that
/// could name an organization would let anyone holding <c>identity.user.read</c> in one tenant read another
/// tenant's customer list by editing one parameter. The tenant is taken from the session, and a filter can
/// only narrow within it.
/// </remarks>
public sealed record IdentitySearchRequest(
    int? Page,
    int? PageSize,
    string? Status,
    bool? IsIdentityVerified,
    string? Mobile,
    string? Text)
{
    /// <summary>Builds the query, reporting an unknown status rather than silently ignoring it.</summary>
    public Result<IdentityQuery> ToQuery()
    {
        UserStatus? status = null;
        if (!string.IsNullOrWhiteSpace(Status))
        {
            if (!Enum.TryParse<UserStatus>(Status, ignoreCase: true, out var parsed))
            {
                return Result<IdentityQuery>.Failure(IdentityErrors.StatusInvalid(Status));
            }

            status = parsed;
        }

        if (!string.IsNullOrWhiteSpace(Mobile)
            && !MobileNumber.TryCreate(Mobile, out _, out var mobileError))
        {
            return Result<IdentityQuery>.Failure(IdentityErrors.MobileInvalid(mobileError));
        }

        return Result<IdentityQuery>.Success(new IdentityQuery(status, IsIdentityVerified, Mobile, Text));
    }

    /// <summary>
    /// Converts the caller's paging into a validated, bounded request.
    /// </summary>
    /// <remarks>
    /// A <see cref="PageRequest"/> throws on a page number below one or a page size outside its bounds,
    /// which is the right behaviour for a value object and the wrong behaviour for a query string a client
    /// controls. It is turned into a validation failure here so that <c>?page=0</c> is answered as a bad
    /// request rather than reaching the exception handler as a defect.
    /// </remarks>
    public Result<PageRequest> ToPageRequest()
    {
        try
        {
            return Result<PageRequest>.Success(new PageRequest(Page ?? 1, PageSize ?? PageRequest.DefaultPageSize));
        }
        catch (ArgumentOutOfRangeException)
        {
            return Result<PageRequest>.Failure(Error.Validation(
                "identity.user.paging_invalid",
                $"Page must be 1 or greater and pageSize between 1 and {PageRequest.MaxPageSize}."));
        }
    }
}

/// <summary>One row of the identity directory, as read by a client.</summary>
/// <param name="Id">Identifier of the identity.</param>
/// <param name="DisplayName">Name shown in list contexts.</param>
/// <param name="FullName">Confirmed profile name, empty while the profile is incomplete.</param>
/// <param name="MobileMasked">Anchor mobile number, masked. The directory never returns it in full.</param>
/// <param name="Status">Lifecycle status of the identity.</param>
/// <param name="Source">How the identity entered the platform.</param>
/// <param name="VerificationStatus">State of the master identity profile.</param>
/// <param name="IsIdentityVerified">True when strong identity verification completed.</param>
/// <param name="HasPasswordCredential">Whether the identity can sign in with a password.</param>
/// <param name="RoleCount">How many role assignments are currently in force.</param>
/// <param name="CreatedAt">When the identity was registered.</param>
/// <param name="LastLoginAt">When the identity last signed in, or null if it never has.</param>
public sealed record IdentitySummaryResponse(
    Guid Id,
    string DisplayName,
    string FullName,
    string MobileMasked,
    string Status,
    string Source,
    string VerificationStatus,
    bool IsIdentityVerified,
    bool HasPasswordCredential,
    int RoleCount,
    DateTimeOffset CreatedAt,
    DateTimeOffset? LastLoginAt)
{
    /// <summary>Projects a directory row onto the wire shape.</summary>
    public static IdentitySummaryResponse From(IdentitySummary summary)
    {
        ArgumentNullException.ThrowIfNull(summary);

        return new IdentitySummaryResponse(
            summary.Id,
            summary.DisplayName,
            summary.FullName,
            summary.MobileMasked,
            summary.Status.ToString(),
            summary.Source.ToString(),
            summary.VerificationStatus.ToString(),
            summary.IsIdentityVerified,
            summary.HasPasswordCredential,
            summary.RoleCount,
            summary.CreatedAt,
            summary.LastLoginAt);
    }
}

/// <summary>A role assignment held by an identity.</summary>
public sealed record IdentityRoleGrantResponse(string RoleCode, bool IsRevoked, DateTimeOffset GrantedAt, DateTimeOffset? RevokedAt)
{
    /// <summary>Projects a grant onto the wire shape.</summary>
    public static IdentityRoleGrantResponse From(IdentityRoleGrant grant)
    {
        ArgumentNullException.ThrowIfNull(grant);
        return new IdentityRoleGrantResponse(grant.RoleCode, grant.IsRevoked, grant.GrantedAt, grant.RevokedAt);
    }
}

/// <summary>A contact point on the identity.</summary>
public sealed record IdentityContactResponse(string Kind, string Value, bool IsPrimary, DateTimeOffset? VerifiedAt)
{
    /// <summary>Projects a contact onto the wire shape.</summary>
    public static IdentityContactResponse From(IdentityContact contact)
    {
        ArgumentNullException.ThrowIfNull(contact);
        return new IdentityContactResponse(contact.Kind.ToString(), contact.Value, contact.IsPrimary, contact.VerifiedAt);
    }
}

/// <summary>A postal address on the identity.</summary>
public sealed record IdentityAddressResponse(
    string Kind,
    string CountryCode,
    string? Province,
    string? City,
    string? PostalCode,
    string? Line1,
    string? Line2)
{
    /// <summary>Projects an address onto the wire shape.</summary>
    public static IdentityAddressResponse From(IdentityAddress address)
    {
        ArgumentNullException.ThrowIfNull(address);

        return new IdentityAddressResponse(
            address.Kind.ToString(),
            address.CountryCode,
            address.Province,
            address.City,
            address.PostalCode,
            address.Line1,
            address.Line2);
    }
}

/// <summary>Provenance of one identity attribute.</summary>
public sealed record IdentityFieldProvenanceResponse(string Field, string Provenance)
{
    /// <summary>Projects a provenance pair onto the wire shape.</summary>
    public static IdentityFieldProvenanceResponse From(IdentityFieldProvenance field)
    {
        ArgumentNullException.ThrowIfNull(field);
        return new IdentityFieldProvenanceResponse(field.Field, field.Provenance);
    }
}

/// <summary>The master identity profile, including how each value was established.</summary>
public sealed record IdentityProfileResponse(
    string? FirstName,
    string? LastName,
    string? FatherName,
    string? MotherName,
    string? NationalId,
    string? DateOfBirth,
    string Gender,
    string? PlaceOfBirth,
    string? Occupation,
    string? NationalityCode,
    string VerificationStatus,
    bool IsComplete,
    bool HasConfirmedCoreFields,
    DateTimeOffset? VerifiedAt,
    string? VerificationMethod,
    IReadOnlyList<IdentityFieldProvenanceResponse> Fields)
{
    /// <summary>Projects the master profile onto the wire shape.</summary>
    public static IdentityProfileResponse From(IdentityProfileView profile)
    {
        ArgumentNullException.ThrowIfNull(profile);

        return new IdentityProfileResponse(
            profile.FirstName,
            profile.LastName,
            profile.FatherName,
            profile.MotherName,
            profile.NationalId,
            profile.DateOfBirth,
            profile.Gender,
            profile.PlaceOfBirth,
            profile.Occupation,
            profile.NationalityCode,
            profile.VerificationStatus,
            profile.IsComplete,
            profile.HasConfirmedCoreFields,
            profile.VerifiedAt,
            profile.VerificationMethod,
            [.. profile.Fields.Select(IdentityFieldProvenanceResponse.From)]);
    }
}

/// <summary>The full record of one central identity.</summary>
/// <param name="Id">Identifier of the identity.</param>
/// <param name="DisplayName">Name shown before the master profile is complete.</param>
/// <param name="Mobile">Anchor mobile number in full. Reached only through the detail read.</param>
/// <param name="MobileMasked">The same number, masked.</param>
/// <param name="Status">Lifecycle status of the identity.</param>
/// <param name="Source">How the identity entered the platform.</param>
/// <param name="PreferredLocale">BCP-47 locale of the person's interface.</param>
/// <param name="HasPasswordCredential">Whether the identity can sign in with a password as well as by code.</param>
/// <param name="IsIdentityVerified">True when strong identity verification completed.</param>
/// <param name="IdentityVerifiedAt">When strong verification completed, or null.</param>
/// <param name="MobileVerifiedAt">When ownership of the anchor mobile number was proven, or null.</param>
/// <param name="LastLoginAt">When the identity last signed in, or null if it never has.</param>
/// <param name="FailedLoginAttempts">Consecutive failed sign-in attempts since the last success.</param>
/// <param name="CreatedAt">When the identity was registered.</param>
/// <param name="ModifiedAt">When the record was last changed, or null.</param>
/// <param name="Profile">The master identity profile with per-field provenance.</param>
/// <param name="Roles">Role assignments, revoked ones included as history.</param>
/// <param name="Contacts">Contact points on the identity.</param>
/// <param name="Addresses">Postal addresses attached to the identity.</param>
public sealed record IdentityResponse(
    Guid Id,
    string DisplayName,
    string Mobile,
    string MobileMasked,
    string Status,
    string Source,
    string PreferredLocale,
    bool HasPasswordCredential,
    bool IsIdentityVerified,
    DateTimeOffset? IdentityVerifiedAt,
    DateTimeOffset? MobileVerifiedAt,
    DateTimeOffset? LastLoginAt,
    int FailedLoginAttempts,
    DateTimeOffset CreatedAt,
    DateTimeOffset? ModifiedAt,
    IdentityProfileResponse? Profile,
    IReadOnlyList<IdentityRoleGrantResponse> Roles,
    IReadOnlyList<IdentityContactResponse> Contacts,
    IReadOnlyList<IdentityAddressResponse> Addresses)
{
    /// <summary>Projects an identity onto the wire shape.</summary>
    public static IdentityResponse From(IdentityDetails identity)
    {
        ArgumentNullException.ThrowIfNull(identity);

        return new IdentityResponse(
            identity.Id,
            identity.DisplayName,
            identity.Mobile,
            identity.MobileMasked,
            identity.Status.ToString(),
            identity.Source.ToString(),
            identity.PreferredLocale,
            identity.HasPasswordCredential,
            identity.IsIdentityVerified,
            identity.IdentityVerifiedAt,
            identity.MobileVerifiedAt,
            identity.LastLoginAt,
            identity.FailedLoginAttempts,
            identity.CreatedAt,
            identity.ModifiedAt,
            identity.Profile is null ? null : IdentityProfileResponse.From(identity.Profile),
            [.. identity.Roles.Select(IdentityRoleGrantResponse.From)],
            [.. identity.Contacts.Select(IdentityContactResponse.From)],
            [.. identity.Addresses.Select(IdentityAddressResponse.From)]);
    }
}
