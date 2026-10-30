import test from "node:test";
import assert from "node:assert/strict";
import { calculateLendtechScore } from "./lendtech-scoring.js";

test("normalizes measurable scoring components without inventing identity confidence", () => {
  const result = calculateLendtechScore({
    dtiPercent: 0,
    repaymentCount: 0,
    openDelinquencyCount: 0,
    monthlyIncome: "50000000",
    kycStatus: "verified",
  });

  assert.equal(result.score, 868.75);
  assert.equal(result.band, "A");
  assert.equal(result.inputs.identityConfidenceScore, null);
  assert.equal(result.inputs.modelVersion, "rules-v2");
  assert.equal(
    result.inputs.scoringWeights.paymentHistory +
      result.inputs.scoringWeights.incomeStability +
      result.inputs.scoringWeights.debtToIncome,
    0.8,
  );
});

test("open delinquencies reduce the measurable score", () => {
  const clean = calculateLendtechScore({
    dtiPercent: 40,
    repaymentCount: 0,
    openDelinquencyCount: 0,
    monthlyIncome: "10000000",
    kycStatus: "verified",
  });
  const overdue = calculateLendtechScore({
    dtiPercent: 40,
    repaymentCount: 0,
    openDelinquencyCount: 2,
    monthlyIncome: "10000000",
    kycStatus: "verified",
  });

  assert.ok(overdue.score < clean.score);
  assert.equal(overdue.inputs.paymentHistoryScore, 50);
});

test("requires verified KYC but does not convert it into a confidence percentage", () => {
  assert.throws(() => calculateLendtechScore({
    dtiPercent: 20,
    repaymentCount: 1,
    openDelinquencyCount: 0,
    monthlyIncome: "10000000",
    kycStatus: "pending",
  }), /احراز هویت تأیید نشده/);
});

test("rejects invalid scoring inputs", () => {
  assert.throws(() => calculateLendtechScore({
    dtiPercent: -1,
    repaymentCount: 0,
    openDelinquencyCount: 0,
    monthlyIncome: "10000000",
    kycStatus: "verified",
  }), /نسبت تعهدات معتبر نیست/);
});
