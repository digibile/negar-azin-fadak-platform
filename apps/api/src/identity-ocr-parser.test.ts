import test from "node:test";
import assert from "node:assert/strict";
import {parseIranianIdentityText} from "./identity-ocr-parser.js";

test("extracts and checksum-validates a Persian national code without approving KYC",()=>{
 const result=parseIranianIdentityText("نام: علی\nنام خانوادگی: رضایی\nکد ملی: ۱۲۳۴۵۶۷۸۹۱\nتاریخ تولد: ۱۳۷۰/۰۲/۰۳");
 assert.equal(result.status,"completed");
 assert.equal(result.fields.nationalCode,"1234567891");
 assert.equal(result.fields.firstName,"علی");
 assert.equal(result.fields.lastName,"رضایی");
 assert.deepEqual(result.validatedFields,["nationalCode"]);
 assert.match(result.note,/به‌تنهایی احراز هویت/);
});

test("invalid national code remains in human review",()=>{
 const result=parseIranianIdentityText("کد ملی: ۱۲۳۴۵۶۷۸۹۰");
 assert.equal(result.status,"needs_review");
 assert.equal(result.fields.nationalCode,undefined);
});
