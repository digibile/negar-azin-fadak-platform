import test from "node:test";
import assert from "node:assert/strict";
import {isValidIranianNationalCode,normalizeIranianDigits} from "./iranian-validation.js";

test("normalizes Persian and Arabic digits",()=>{
 assert.equal(normalizeIranianDigits("۱۲۳۴۵۶۷۸۹۰"),"1234567890");
 assert.equal(normalizeIranianDigits("١٢٣٤٥٦٧٨٩٠"),"1234567890");
});

test("validates national-code checksum instead of accepting any ten digits",()=>{
 assert.equal(isValidIranianNationalCode("1234567891"),true);
 assert.equal(isValidIranianNationalCode("۱۲۳۴۵۶۷۸۹۱"),true);
 assert.equal(isValidIranianNationalCode("1234567890"),false);
 assert.equal(isValidIranianNationalCode("1111111111"),false);
 assert.equal(isValidIranianNationalCode("123456789"),false);
});
