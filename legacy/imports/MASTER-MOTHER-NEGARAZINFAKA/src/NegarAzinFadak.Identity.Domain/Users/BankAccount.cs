using System.Text.RegularExpressions;
using NegarAzinFadak.Core;
using NegarAzinFadak.Core.Domain;
using NegarAzinFadak.Core.Primitives;
using NegarAzinFadak.Core.Results;

namespace NegarAzinFadak.Identity.Domain.Users;

/// <summary>Ownership of a bank account relative to the identity holder.</summary>
public enum AccountOwnership
{
    /// <summary>The identity holder is the owner of the account.</summary>
    Self = 0,

    /// <summary>Someone else owns the account and the identity holder is a signatory or beneficiary.</summary>
    Other = 1,

    /// <summary>Ownership not established.</summary>
    Unverified = 2
}

/// <summary>
/// Iranian bank account in the person's name. The IBAN (Sheba) is validated at construction because
/// account-based verification, settlement and disbursement all depend on it being correct.
/// </summary>
public sealed partial class BankAccount : Entity, IAuditableEntityMarker
{
    private BankAccount()
    {
        BankCode = string.Empty;
        AccountNumber = string.Empty;
        Iban = null!;
        ConcurrencyStamp = string.Empty;
    }

    public BankAccount(
        Guid id,
        Guid userId,
        string bankCode,
        string accountNumber,
        string iban,
        AccountOwnership ownership = AccountOwnership.Self,
        string? bankName = null,
        string? cardNumber = null)
    {
        AssignId(id);
        UserId = Guard.AgainstEmpty(userId);
        BankCode = Guard.AgainstNullOrWhiteSpace(bankCode).Trim().ToUpperInvariant();
        AccountNumber = Guard.AgainstNullOrWhiteSpace(accountNumber).Trim();
        Iban = IbanNumber.Create(iban);
        Ownership = ownership;
        BankName = string.IsNullOrWhiteSpace(bankName) ? null : bankName.Trim();
        CardNumber = NormalizeCardNumber(cardNumber);
        ConcurrencyStamp = Guid.NewGuid().ToString("N");
    }

    public Guid UserId { get; private set; }

    /// <summary>Data-driven bank code, resolved against the bank table in configuration.</summary>
    public string BankCode { get; private set; }

    /// <summary>Account number as printed on the passbook.</summary>
    public string AccountNumber { get; private set; }

    /// <summary>Validated IBAN in canonical form.</summary>
    public IbanNumber Iban { get; private set; } = null!;

    /// <summary>16-digit bank card number, when supplied.</summary>
    public string? CardNumber { get; private set; }

    public string? BankName { get; private set; }

    public AccountOwnership Ownership { get; private set; }

    public DateTimeOffset? VerifiedAt { get; private set; }

    public bool IsVerified => VerifiedAt.HasValue;

    public string? VerificationMethod { get; private set; }

    public DateTimeOffset CreatedAt { get; set; }

    public Guid? CreatedBy { get; set; }

    public DateTimeOffset? ModifiedAt { get; set; }

    public Guid? ModifiedBy { get; set; }

    public string ConcurrencyStamp { get; set; }

    /// <summary>Marks the account as proven, e.g. by a micro-deposit or a bank statement OCR match.</summary>
    public Result MarkVerified(DateTimeOffset verifiedAt, string verificationMethod)
    {
        if (Ownership == AccountOwnership.Unverified)
        {
            return Result.Failure(IdentityErrors.BankOwnershipUnverified);
        }

        VerifiedAt = verifiedAt;
        VerificationMethod = Guard.AgainstNullOrWhiteSpace(verificationMethod);
        return Result.Success();
    }

    /// <summary>Records that ownership could not be established.</summary>
    public void MarkOwnershipUnverified() => Ownership = AccountOwnership.Unverified;

    /// <summary>Masked account rendering used on screens and receipts.</summary>
    public string MaskedAccountNumber => AccountNumber.Length <= 4
        ? new string('*', AccountNumber.Length)
        : $"{new string('*', AccountNumber.Length - 4)}{AccountNumber[^4..]}";

    private static string? NormalizeCardNumber(string? cardNumber)
    {
        if (string.IsNullOrWhiteSpace(cardNumber))
        {
            return null;
        }

        var digits = new string(cardNumber.Where(char.IsAsciiDigit).ToArray());
        return digits.Length == 16 ? digits : null;
    }
}

/// <summary>
/// Iranian IBAN (Sheba): <c>IR</c> + 24 digits, where the final 2 digits are a mod-97 check over the
/// rearranged number. Validating here means disbursement and settlement never act on a mistyped IBAN.
/// </summary>
public sealed partial class IbanNumber : ValueObject
{
    private IbanNumber(string value) => Value = value;

    /// <summary>Canonical uppercase form, <c>IR</c> followed by 24 digits.</summary>
    public string Value { get; }

    /// <summary>Masked form, safe for logs and support screens.</summary>
    public string Masked => $"{Value[..6]}******************";

    /// <summary>Creates an IBAN, rejecting anything that fails the mod-97 check.</summary>
    /// <exception cref="FormatException">The value is not a structurally valid, checksum-valid IBAN.</exception>
    public static IbanNumber Create(string value)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(value);

        var normalized = value.Replace(" ", string.Empty, StringComparison.Ordinal)
            .Replace("-", string.Empty, StringComparison.Ordinal)
            .Trim()
            .ToUpperInvariant();

        if (!IbanFormat().IsMatch(normalized))
        {
            throw new FormatException("IBAN must start with IR and contain 24 digits.");
        }

        if (!IsChecksumValid(normalized))
        {
            throw new FormatException("IBAN check digits are invalid.");
        }

        return new IbanNumber(normalized);
    }

    /// <summary>Non-throwing variant used when importing untrusted data.</summary>
    public static bool TryCreate(string? value, out IbanNumber? iban, out string? error)
    {
        iban = null;
        error = null;

        if (string.IsNullOrWhiteSpace(value))
        {
            error = "IBAN is required.";
            return false;
        }

        try
        {
            iban = Create(value);
            return true;
        }
        catch (FormatException exception)
        {
            error = exception.Message;
            return false;
        }
    }

    /// <summary>True when the mod-97 check digits are correct.</summary>
    /// <remarks>
    /// The algorithm moves the first four characters (country code and check digits) to the end and
    /// evaluates the result modulo 97, which must leave 1. The moved block contains the letters
    /// <c>IR</c>, and ISO 13616 requires them to be folded to their numeric values before the arithmetic
    /// — <c>I</c> to 18 and <c>R</c> to 27. Skipping that fold rejects every Iranian IBAN, which would
    /// make it impossible to register a bank account at all.
    /// </remarks>
    public static bool IsChecksumValid(string normalizedIban)
    {
        if (normalizedIban.Length != 26 || !normalizedIban.StartsWith("IR", StringComparison.Ordinal))
        {
            return false;
        }

        var rearranged = normalizedIban[4..] + normalizedIban[..4];
        var remainder = 0;
        foreach (var ch in rearranged)
        {
            switch (ch)
            {
                case >= '0' and <= '9':
                    remainder = (remainder * 10 + (ch - '0')) % 97;
                    break;

                // ISO 13616 numeric form: A=10 … I=18, so I contributes two digits and R (=27) two more.
                case 'I':
                    remainder = (remainder * 100 + 18) % 97;
                    break;

                case 'R':
                    remainder = (remainder * 100 + 27) % 97;
                    break;

                default:
                    return false;
            }
        }

        return remainder == 1;
    }

    protected override IEnumerable<object?> GetEqualityComponents()
    {
        yield return Value;
    }

    public override string ToString() => Value;

    [GeneratedRegex(@"^IR\d{24}$", RegexOptions.CultureInvariant)]
    private static partial Regex IbanFormat();
}

/// <summary>Marker for identity entities that participate in auditing and optimistic concurrency.</summary>
public interface IAuditableEntityMarker : Core.Auditing.IAuditable, Core.Auditing.IHasConcurrencyStamp;
