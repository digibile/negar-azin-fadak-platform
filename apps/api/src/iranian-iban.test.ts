import test from "node:test";
import assert from "node:assert/strict";
import {normalizeAndValidateIranianIban} from "./iranian-iban.js";

const valid="IR820540102680020817909002";

test("accepts a valid Iranian IBAN and normalizes casing and separators",()=>{
 assert.equal(normalizeAndValidateIranianIban(valid),valid);
 assert.equal(normalizeAndValidateIranianIban("ir 8205-4010 2680 0208 1790 9002"),valid);
});

test("normalizes Persian and Arabic numerals before MOD-97 validation",()=>{
 const persian=valid.replace(/[0-9]/g,d=>"۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
 const arabic=valid.replace(/[0-9]/g,d=>"٠١٢٣٤٥٦٧٨٩"[Number(d)]);
 assert.equal(normalizeAndValidateIranianIban(persian),valid);
 assert.equal(normalizeAndValidateIranianIban(arabic),valid);
});

test("rejects incorrect check digits, malformed lengths and non-Iranian IBANs",()=>{
 assert.equal(normalizeAndValidateIranianIban("IR810540102680020817909002"),null);
 assert.equal(normalizeAndValidateIranianIban("IR82054010268002081790900"),null);
 assert.equal(normalizeAndValidateIranianIban("DE89370400440532013000"),null);
 assert.equal(normalizeAndValidateIranianIban(""),null);
});
