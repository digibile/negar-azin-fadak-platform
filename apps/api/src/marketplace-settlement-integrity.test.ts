import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const source=fs.readFileSync(new URL("./domain-settlement.ts",import.meta.url),"utf8");

test("settlement generation keeps caller reference for a single seller",()=>{
 assert.match(source,/bySeller\.size>1\?requestedSettlementNo\+"-"\+sellerId:requestedSettlementNo/);
});

test("settlement generation scopes a shared caller reference by the full seller id",()=>{
 assert.match(source,/requestedSettlementNo\+"-"\+sellerId/);
 assert.match(source,/\("SET-"\+Date\.now\(\)\+"-"\+sellerId\)/);
 assert.ok(!source.includes('sellerId.slice(0,8)'));
});
