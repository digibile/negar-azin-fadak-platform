import {randomUUID} from "node:crypto";

type SqlClient={query:(sql:string,params?:unknown[])=>Promise<{rows:any[]}>};
export type CanonicalPartyKind="customer"|"supplier"|"other";

export function normalizeNationalId(value:unknown):string{
 return String(value??"").trim()
  .replace(/[۰-۹]/g,d=>String(d.charCodeAt(0)-0x06f0))
  .replace(/[٠-٩]/g,d=>String(d.charCodeAt(0)-0x0660))
  .replace(/[\s-]/g,"");
}

/** Find one exact tenant-scoped identity match. Must run inside a transaction. */
export async function findCanonicalParty(client:SqlClient,tenantId:string,value:unknown):Promise<string|null>{
 const rawNationalId=String(value||"").trim();
 if(!rawNationalId)return null;
 const nationalId=normalizeNationalId(rawNationalId);
 if(!nationalId||!/^\d+$/.test(nationalId))throw Object.assign(new Error("شناسه ملی باید فقط شامل رقم باشد"),{statusCode:400});
 await client.query("select pg_advisory_xact_lock(hashtext($1),hashtext($2))",[tenantId,nationalId]);
 const matches=await client.query(
  "select id from accounting_parties where tenant_id=$1 and regexp_replace(translate(coalesce(national_id,''),'۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩','01234567890123456789'),'[^0-9]','','g')=$2 order by created_at for update",
  [tenantId,nationalId]
 );
 if(matches.rows.length>1)throw Object.assign(new Error("برای این شناسه ملی چند طرف‌حساب وجود دارد؛ ابتدا تطبیق هویت باید تعیین تکلیف شود"),{statusCode:409});
 return matches.rows.length===1?String(matches.rows[0].id):null;
}

/** Tenant-scoped exact-identifier resolver. Must run inside the caller's transaction. */
export async function ensureCanonicalParty(client:SqlClient,input:{
 tenantId:string; kind:CanonicalPartyKind; title:string; nationalId?:string|null;
 taxId?:string|null; phone?:string|null; email?:string|null; sourceSystem:string;
}):Promise<string>{
 const nationalId=String(input.nationalId||"").trim()?normalizeNationalId(input.nationalId):null;
 const existing=await findCanonicalParty(client,input.tenantId,input.nationalId);
 if(existing)return existing;
 const prefix=input.kind==="customer"?"CUS":input.kind==="supplier"?"SUP":"PTY";
 const created=await client.query(
  "insert into accounting_parties(tenant_id,party_code,party_type,title,national_id,tax_id,phone,email,status,metadata) values($1,$2,$3,$4,$5,$6,$7,$8,'active',$9) returning id",
  [input.tenantId,prefix+"-"+randomUUID().replace(/-/g,"").slice(0,12).toUpperCase(),input.kind,input.title,nationalId,input.taxId||null,input.phone||null,input.email||null,{sourceSystem:input.sourceSystem}]
 );
 return String(created.rows[0].id);
}
