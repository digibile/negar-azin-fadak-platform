import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import {moneyToMinorUnits,minorUnitsToMoney} from "./ledger.js";

test("money conversion preserves exact two-decimal values",()=>{
 assert.equal(moneyToMinorUnits("0.10"),10n);
 assert.equal(moneyToMinorUnits("0.20"),20n);
 assert.equal(minorUnitsToMoney(moneyToMinorUnits("0.10")+moneyToMinorUnits("0.20")),"0.30");
});

test("money conversion supports large numeric(20,2) values without floating point",()=>{
 const value="999999999999999999.99";
 assert.equal(minorUnitsToMoney(moneyToMinorUnits(value)),value);
});

test("money conversion normalizes whole and one-decimal values",()=>{
 assert.equal(minorUnitsToMoney(moneyToMinorUnits("12")),"12.00");
 assert.equal(minorUnitsToMoney(moneyToMinorUnits("12.3")),"12.30");
});

test("money conversion rejects invalid precision and non-finite numbers",()=>{
 assert.throws(()=>moneyToMinorUnits("1.234"));
 assert.throws(()=>moneyToMinorUnits("not-a-number"));
 assert.throws(()=>moneyToMinorUnits(Number.NaN));
});

test("ledger source compares exact minor units and does not use a floating tolerance",()=>{
 const source=fs.readFileSync(new URL("./ledger.ts",import.meta.url),"utf8");
 assert.ok(source.includes("totalDebit!==totalCredit"));
 assert.ok(!source.includes("Math.abs(totalDebit-totalCredit)"));
});
