export interface LendtechScoringInput {
  dtiPercent: number;
  repaymentCount: number;
  openDelinquencyCount: number;
  monthlyIncome: number;
  kycStatus: string;
}

export interface LendtechScoringResult {
  score: number;
  band: "A" | "B" | "C" | "D";
  inputs: {
    modelVersion: "rules-v2";
    monthlyIncome: number;
    dtiPercent: number;
    kycStatus: string;
    paymentHistoryScore: number;
    incomeStabilityScore: number;
    dtiScore: number;
    repaymentCount: number;
    openDelinquencyCount: number;
    scoringWeights: { paymentHistory: 0.35; incomeStability: 0.20; debtToIncome: 0.25 };
    identityConfidenceScore: null;
  };
}

/**
 * Deterministic policy score. KYC is a prerequisite, not a fabricated confidence
 * percentage. The three measurable components are normalized to their combined
 * 80% weight so the resulting score remains on a 0..1000 scale.
 */
export function calculateLendtechScore(input: LendtechScoringInput): LendtechScoringResult {
  const { dtiPercent, repaymentCount, openDelinquencyCount, monthlyIncome, kycStatus } = input;
  if (!Number.isFinite(dtiPercent) || dtiPercent < 0) throw new Error("نسبت تعهدات معتبر نیست");
  if (!Number.isInteger(repaymentCount) || repaymentCount < 0) throw new Error("تعداد بازپرداخت معتبر نیست");
  if (!Number.isInteger(openDelinquencyCount) || openDelinquencyCount < 0) throw new Error("تعداد معوقات معتبر نیست");
  if (!Number.isFinite(monthlyIncome) || monthlyIncome <= 0) throw new Error("درآمد ماهانه معتبر نیست");
  if (kycStatus !== "verified") throw new Error("احراز هویت تأیید نشده است");

  const paymentHistoryScore = openDelinquencyCount > 0
    ? Math.max(20, 70 - Math.min(50, openDelinquencyCount * 10))
    : Math.min(100, 70 + Math.min(30, repaymentCount * 5));
  const dtiScore = Math.max(0, 100 - dtiPercent * 1.5);
  const incomeStabilityScore = Math.max(0, Math.min(100, 100 - dtiPercent));
  const weightedScore = paymentHistoryScore * 0.35 + incomeStabilityScore * 0.20 + dtiScore * 0.25;
  const score = Number(((weightedScore / 0.80) * 10).toFixed(2));
  const band = score >= 800 ? "A" : score >= 700 ? "B" : score >= 600 ? "C" : "D";

  return {
    score,
    band,
    inputs: {
      modelVersion: "rules-v2",
      monthlyIncome,
      dtiPercent,
      kycStatus,
      paymentHistoryScore,
      incomeStabilityScore,
      dtiScore,
      repaymentCount,
      openDelinquencyCount,
      scoringWeights: { paymentHistory: 0.35, incomeStability: 0.20, debtToIncome: 0.25 },
      identityConfidenceScore: null,
    },
  };
}
