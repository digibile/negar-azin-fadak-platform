import test from "node:test";
import assert from "node:assert/strict";
import {
  buildAmortizationSchedule,
  formatMinorUnits,
  parseMoneyToMinorUnits,
  roundRatioHalfUp,
} from "./lendtech-money.js";

test("parses and formats numeric(20,2) values without floating point", () => {
  assert.equal(parseMoneyToMinorUnits("999999999999999999.99"), 99999999999999999999n);
  assert.equal(formatMinorUnits(99999999999999999999n), "999999999999999999.99");
  assert.equal(parseMoneyToMinorUnits("0.1"), 10n);
  assert.equal(parseMoneyToMinorUnits("-12.34"), -1234n);
});

test("rejects values outside the persisted two-decimal money contract", () => {
  assert.equal(parseMoneyToMinorUnits("1.001"), null);
  assert.equal(parseMoneyToMinorUnits("1000000000000000000.00"), null);
  assert.equal(parseMoneyToMinorUnits("1e6"), null);
  assert.equal(parseMoneyToMinorUnits(Number.NaN), null);
});

test("rounds exact ratios half-up", () => {
  assert.equal(roundRatioHalfUp(105n, 10n), 11n);
  assert.equal(roundRatioHalfUp(104n, 10n), 10n);
});

test("zero-interest schedule reconciles principal to the last minor unit", () => {
  const result = buildAmortizationSchedule(10000n, "0.0000", 3);
  assert.equal(result.rows.reduce((sum, row) => sum + row.principalDue, 0n), 10000n);
  assert.equal(result.rows.at(-1)?.principalDue, 3334n);
  assert.ok(result.rows.every((row) => row.interestDue === 0n));
});

test("positive-rate schedule reconciles principal and calculates exact totals", () => {
  const result = buildAmortizationSchedule(1000000000n, "18.0000", 12);
  assert.equal(result.rows.reduce((sum, row) => sum + row.principalDue, 0n), 1000000000n);
  assert.ok(result.rows.every((row) => row.totalDue === row.principalDue + row.interestDue));
  assert.ok(result.rows.every((row) => row.principalDue >= 0n && row.interestDue >= 0n));
});

test("supports maximum contractual term and rejects invalid rates", () => {
  const result = buildAmortizationSchedule(1n, "9999.9999", 120);
  assert.equal(result.rows.length, 120);
  assert.throws(() => buildAmortizationSchedule(100n, "-1", 12), /نامعتبر/);
});
