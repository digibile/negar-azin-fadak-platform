import test from "node:test";
import assert from "node:assert/strict";
import { addMonthsClamped } from "./lendtech-schedule.js";

const iso = (date: Date) => date.toISOString().slice(0, 10);

test("clamps January 31 to the final day of February in a common year", () => {
  assert.equal(iso(addMonthsClamped(new Date("2025-01-31T00:00:00.000Z"), 1)), "2025-02-28");
});

test("clamps January 31 to February 29 in a leap year", () => {
  assert.equal(iso(addMonthsClamped(new Date("2024-01-31T00:00:00.000Z"), 1)), "2024-02-29");
});

test("preserves the original day when the target month supports it", () => {
  assert.equal(iso(addMonthsClamped(new Date("2025-01-31T00:00:00.000Z"), 2)), "2025-03-31");
});

test("does not drift after a short month", () => {
  const start = new Date("2025-01-31T00:00:00.000Z");
  assert.deepEqual(
    [1, 2, 3].map((month) => iso(addMonthsClamped(start, month))),
    ["2025-02-28", "2025-03-31", "2025-04-30"],
  );
});

test("rejects invalid dates and unsupported month offsets", () => {
  assert.throws(() => addMonthsClamped(new Date("invalid"), 1), /معتبر نیست/);
  assert.throws(() => addMonthsClamped(new Date("2025-01-01T00:00:00.000Z"), 0), /معتبر نیست/);
  assert.throws(() => addMonthsClamped(new Date("2025-01-01T00:00:00.000Z"), 121), /معتبر نیست/);
});
