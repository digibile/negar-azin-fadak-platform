import {randomUUID} from "node:crypto";

type SqlClient={query:(sql:string,params?:unknown[])=>Promise<{rows:any[]}>};
export type CanonicalPartyKind="customer"|"supplier"|"other";

/** Tenant-scoped exact-identifier resolver. Must run inside the caller's transaction. */
export async function ensureCanonicalParty(client:SqlClient,input:{
 tenantId:string; kind:CanonicalPartyKind; title:string; nationalId?:string|null;
 taxId?:string|null; phone?:string|null; email?:string|null; sourceSystem:string;
}):Promise<string>{
 const nationalId=String(input.nationalId||"").trim()||null;
 if(nationalId){
  await client.query("select pg_advisory_xact_lock(hashtext($1),hashtext($2))",[input.tenantId,nationalId]);
  const matches=await client.query("select id from accounting_parties where tenant_id=$1 and national_id=$2 order by created_at for update",[input.tenantId,nationalId]);
  if(matches.rows.length>1)throw Object.assign(new Error("برای این شناسه ملی چند طرف‌حساب وجود دارد؛ ابتدا تطبیق هویت باید تعیین تکلیف شود"),{statusCode:409});
  if(matches.rows.length===1)return String(matches.rows[0].id);
 }
 const prefix=input.kind==="customer"?"CUS":input.kind==="supplier"?"SUP":"PTY";
 const created=await client.query(
  "insert into accounting_parties(tenant_id,party_code,party_type,title,national_id,tax_id,phone,email,status,metadata) values($1,$2,$3,$4,$5,$6,$7,$8,'active',$9) returning id",
  [input.tenantId,prefix+"-"+randomUUID().replace(/-/g,"").slice(0,12).toUpperCase(),input.kind,input.title,nationalId,input.taxId||null,input.phone||null,input.email||null,{sourceSystem:input.sourceSystem}]
 );
 return String(created.rows[0].id);
}
