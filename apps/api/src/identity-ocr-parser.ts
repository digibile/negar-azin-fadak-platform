import {isValidIranianNationalCode,normalizeIranianDigits} from "./iranian-validation.js";

export type IdentityOcrResult={
 fields:Record<string,string>;
 validatedFields:string[];
 status:"completed"|"needs_review";
 note:string;
};

function normalizedText(value:string){
 return normalizeIranianDigits(value.normalize("NFKC"))
  .replace(/[يى]/g,"ی").replace(/ك/g,"ک")
  .replace(/[\u200c\u200f\u202a-\u202e]/g," ")
  .replace(/[ \t]+/g," ");
}

function capture(text:string,labels:string):string|undefined{
 const re=new RegExp("(?:^|[\\r\\n \\t:：])(?:"+labels+")[ \\t]*[:：\\-]?[ \\t]*([\\u0600-\\u06ff]{2,}(?:[ \\t]+[\\u0600-\\u06ff]{2,}){0,2})","i");
 const match=text.match(re);
 return match?.[1]?.trim();
}

export function parseIranianIdentityText(raw:string):IdentityOcrResult{
 const text=normalizedText(raw);
 const candidates=Array.from(text.matchAll(/(?:^|\D)(\d{10})(?=\D|$)/g),m=>m[1]);
 const nationalCode=candidates.find(isValidIranianNationalCode);
 const fields:Record<string,string>={};
 if(nationalCode)fields.nationalCode=nationalCode;
 const firstName=capture(text,"نام(?![ \\t]*خانوادگی)");
 const lastName=capture(text,"نام[ \\t]*خانوادگی");
 const fatherName=capture(text,"نام[ \\t]*پدر");
 const birthDate=text.match(/(?:تاریخ[ \t]*تولد|تولد)[ \t]*[:：\-]?[ \t]*(1[34]\d{2}[\/\-]\d{1,2}[\/\-]\d{1,2})/i)?.[1];
 if(firstName)fields.firstName=firstName;
 if(lastName)fields.lastName=lastName;
 if(fatherName)fields.fatherName=fatherName;
 if(birthDate)fields.birthDate=birthDate;
 const validatedFields=nationalCode?["nationalCode"]:[];
 return {
  fields,
  validatedFields,
  status:nationalCode?"completed":"needs_review",
  note:nationalCode
   ?"کد ملی از متن استخراج و کنترل رقم بررسی شد؛ این نتیجه به‌تنهایی احراز هویت یا تأیید KYC نیست."
   :"متن استخراج شد اما کد ملی معتبر پیدا نشد؛ بررسی انسانی لازم است."
 };
}
