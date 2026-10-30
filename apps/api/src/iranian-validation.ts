export function normalizeIranianDigits(value:unknown):string{
 if(typeof value!=="string")return "";
 return value.replace(/[۰-۹]/g,d=>String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[٠-٩]/g,d=>String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}

export function isValidIranianNationalCode(value:unknown):boolean{
 const digits=normalizeIranianDigits(value).replace(/\D/g,"");
 if(!/^\d{10}$/.test(digits)||new Set(digits).size===1)return false;
 let sum=0;
 for(let i=0;i<9;i++)sum+=Number(digits[i])*(10-i);
 const remainder=sum%11,control=Number(digits[9]);
 return remainder<2?control===remainder:control===11-remainder;
}
