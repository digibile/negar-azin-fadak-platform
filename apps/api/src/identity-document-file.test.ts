import test from "node:test";
import assert from "node:assert/strict";
import {decodeIdentityDocument,safeDocumentFileName} from "./identity-document-file.js";

const encode=(bytes:Buffer)=>bytes.toString("base64");

test("accepts only supported file signatures regardless of client MIME",()=>{
 assert.equal(decodeIdentityDocument(encode(Buffer.from("%PDF-1.7\n")))?.mimeType,"application/pdf");
 assert.equal(decodeIdentityDocument(encode(Buffer.from([0xff,0xd8,0xff,0xdb])))?.mimeType,"image/jpeg");
 assert.equal(decodeIdentityDocument(encode(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a])))?.mimeType,"image/png");
 assert.equal(decodeIdentityDocument(encode(Buffer.from("RIFFxxxxWEBP")))?.mimeType,"image/webp");
});

test("rejects forged MIME payloads, invalid base64, empty files and oversized documents",()=>{
 assert.equal(decodeIdentityDocument("data:image/png;base64,PHNjcmlwdD4="),null);
 assert.equal(decodeIdentityDocument("%%%not-base64%%%"),null);
 assert.equal(decodeIdentityDocument(""),null);
 assert.equal(decodeIdentityDocument(encode(Buffer.alloc(8*1024*1024+1,1))),null);
});

test("sanitizes path separators and control characters from file names",()=>{
 assert.equal(safeDocumentFileName("../passport"+String.fromCharCode(0)+".pdf"),".._passport_.pdf");
});
