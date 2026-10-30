import test from "node:test";
import assert from "node:assert/strict";
import {createOtpCode,normalizeIranMobile,otpDigest,verifyOtpDigest} from "./otp.js";

const pepper="test-only-otp-pepper-with-more-than-24-characters";

test("normalizes Iranian mobile numbers and Persian digits",()=>{
 assert.equal(normalizeIranMobile("۰۹۱۲۳۴۵۶۷۸۹"),"09123456789");
 assert.equal(normalizeIranMobile("+98 912 345 6789"),"09123456789");
 assert.equal(normalizeIranMobile("00989123456789"),"09123456789");
 assert.equal(normalizeIranMobile("02112345678"),"");
});

test("creates six digit OTP codes",()=>{
 for(let i=0;i<50;i++)assert.match(createOtpCode(),/^\d{6}$/);
});

test("stores and verifies keyed OTP digests without accepting a different code",()=>{
 const phone="09123456789",code="042731";
 const digest=otpDigest(phone,code,pepper);
 assert.match(digest,/^[a-f0-9]{64}$/);
 assert.equal(verifyOtpDigest(digest,phone,code,pepper),true);
 assert.equal(verifyOtpDigest(digest,phone,"042732",pepper),false);
 assert.equal(verifyOtpDigest(digest,"09123456780",code,pepper),false);
});
