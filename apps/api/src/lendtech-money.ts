/**
 * Exact money arithmetic for PostgreSQL numeric(20,2) values.
 * Amounts are represented as integer minor units (cents/rials according to
 * the persisted currency unit); no JavaScript floating-point math is used.
 */
export type AmortizationRow = {
  principalDue: bigint;
  interestDue: bigint;
  totalDue: bigint;
};

const MAX_INTEGER_DIGITS = 18;
const RATE_SCALE = 10_000n;
const MONTHLY_RATE_DENOMINATOR = 12n * 100n * RATE_SCALE;

export function parseMoneyToMinorUnits(value: unknown): bigint | null {
  if (typeof value !== "string" && typeof value !== "number" && typeof value !== "bigint") return null;
  if (typeof value === "number" && (!Number.isFinite(value) || !Number.isSafeInteger(Math.round(value * 100)))) return null;
  const raw = String(value).trim();
  const match = /^([+-]?)(\d+)(?:\.(\d{1,2}))?$/.exec(raw);
  if (!match || match[2].length > MAX_INTEGER_DIGITS) return null;
  const fraction = BigInt((match[3] ?? "").padEnd(2, "0") || "0");
  const absolute = BigInt(match[2]) * 100n + fraction;
  return match[1] === "-" ? -absolute : absolute;
}

export function formatMinorUnits(value: bigint): string {
  const negative = value < 0n;
  const absolute = negative ? -value : value;
  const integer = absolute / 100n;
  const fraction = String(absolute % 100n).padStart(2, "0");
  return `${negative ? "-" : ""}${integer}.${fraction}`;
}

export function roundRatioHalfUp(numerator: bigint, denominator: bigint): bigint {
  if (denominator <= 0n || numerator < 0n) throw new Error("نسبت مالی نامعتبر است");
  return (numerator + denominator / 2n) / denominator;
}

export function parsePercentToScaledInteger(value: unknown): bigint | null {
  if (typeof value !== "string" && typeof value !== "number" && typeof value !== "bigint") return null;
  const raw = String(value).trim();
  const match = /^(\d{1,4})(?:\.(\d{1,4}))?$/.exec(raw);
  if (!match) return null;
  return BigInt(match[1]) * RATE_SCALE + BigInt((match[2] ?? "").padEnd(4, "0") || "0");
}

/**
 * Builds an amortization schedule from exact principal minor units and a
 * numeric(8,4) annual percentage rate. Monthly interest and the regular
 * payment are rounded half-up to the currency's minor unit; the final
 * principal installment absorbs the remaining principal exactly.
 */
export function buildAmortizationSchedule(
  principal: bigint,
  annualInterestPercent: unknown,
  months: number,
): { payment: bigint; rows: AmortizationRow[] } {
  const rateScaled = parsePercentToScaledInteger(annualInterestPercent);
  if (principal <= 0n || rateScaled === null || !Number.isInteger(months) || months < 1 || months > 120) {
    throw new Error("پارامترهای بازسازی تسهیلات نامعتبر است");
  }

  const rateNumerator = rateScaled;
  const rateDenominator = MONTHLY_RATE_DENOMINATOR;
  let payment: bigint;

  if (rateNumerator === 0n) {
    payment = roundRatioHalfUp(principal, BigInt(months));
  } else {
    const growthNumerator = (rateDenominator + rateNumerator) ** BigInt(months);
    const baseNumerator = rateDenominator ** BigInt(months);
    const numerator = principal * rateNumerator * growthNumerator;
    const denominator = rateDenominator * (growthNumerator - baseNumerator);
    payment = roundRatioHalfUp(numerator, denominator);
  }

  let balance = principal;
  const rows: AmortizationRow[] = [];
  for (let index = 1; index <= months; index += 1) {
    const interestDue = rateNumerator === 0n
      ? 0n
      : roundRatioHalfUp(balance * rateNumerator, rateDenominator);
    const principalDue = index === months
      ? balance
      : payment > interestDue ? (payment - interestDue > balance ? balance : payment - interestDue) : 0n;
    balance -= principalDue;
    rows.push({
      principalDue,
      interestDue,
      totalDue: principalDue + interestDue,
    });
  }

  if (balance !== 0n || rows.some((row) => row.principalDue < 0n || row.interestDue < 0n)) {
    throw new Error("ساخت برنامه بازپرداخت دقیقاً قابل تطبیق نیست");
  }
  return { payment, rows };
}

export type InstallmentQuote = {
  downPayment: bigint;
  financedAmount: bigint;
  serviceFee: bigint;
  totalInstallments: bigint;
  totalPayable: bigint;
  installments: { number: number; amount: bigint }[];
};

/** Exact quote arithmetic. Percentages are accepted to four decimal places. */
export function calculateInstallmentQuote(
  amount: bigint,
  downPaymentPercent: unknown,
  feePercent: unknown,
  months: number,
): InstallmentQuote {
  const downRate = parsePercentToScaledInteger(downPaymentPercent);
  const feeRate = parsePercentToScaledInteger(feePercent);
  const percentDenominator = 100n * RATE_SCALE;
  if (amount <= 0n || downRate === null || downRate < 0n || downRate > percentDenominator ||
      feeRate === null || feeRate < 0n || !Number.isInteger(months) || months < 1 || months > 120) {
    throw new Error("پارامترهای محاسبه اقساط معتبر نیستند");
  }
  const downPayment = roundRatioHalfUp(amount * downRate, percentDenominator);
  const financedAmount = amount - downPayment;
  const serviceFee = roundRatioHalfUp(financedAmount * feeRate, percentDenominator);
  const totalInstallments = financedAmount + serviceFee;
  const regular = (totalInstallments + BigInt(months) - 1n) / BigInt(months);
  let remaining = totalInstallments;
  const installments = Array.from({ length: months }, (_, index) => {
    const due = index === months - 1 ? remaining : (regular < remaining ? regular : remaining);
    remaining -= due;
    return { number: index + 1, amount: due };
  });
  if (remaining !== 0n || installments.reduce((sum, row) => sum + row.amount, 0n) !== totalInstallments) {
    throw new Error("جمع اقساط با مبلغ قرارداد تطبیق ندارد");
  }
  return {
    downPayment,
    financedAmount,
    serviceFee,
    totalInstallments,
    totalPayable: downPayment + totalInstallments,
    installments,
  };
}
