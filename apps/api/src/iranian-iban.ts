export function normalizeAndValidateIranianIban(value:unknown):string|null{
 const iban=String(value||"")
  .replace(/[۰-۹]/g,d=>String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
  .replace(/[٠-٩]/g,d=>String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
  .replace(/[\\s\\u200c-]/g,"")
  .toUpperCase();
 if(!/^IR[0-9]{24}$/.test(iban))return null;
 const rearranged=iban.slice(4)+iban.slice(0,4);
 const numeric=rearranged.replace(/[A-Z]/g,ch=>String(ch.charCodeAt(0)-55));
 let remainder=0;
 for(const digit of numeric)remainder=(remainder*10+Number(digit))%97;
 return remainder===1?iban:null;
}
