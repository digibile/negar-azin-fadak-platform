import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {gunzipSync} from "node:zlib";
import pg from "pg";

const {Pool}=pg;
const here=path.dirname(fileURLToPath(import.meta.url));
const seedPath=path.resolve(here,"../database/seeds/vamcity-loan-products-2026-10-30.json.gz");
if(!process.env.DATABASE_URL)throw new Error("DATABASE_URL is required");
const archive=JSON.parse(gunzipSync(fs.readFileSync(seedPath)).toString("utf8"));
if(archive.source_database!=="vamcityc_vamcity_import_20261028"||archive.source_table!=="dbo.Loans")throw new Error("Unexpected legacy source provenance");
if(!Array.isArray(archive.products)||archive.products.length!==archive.row_count)throw new Error("Legacy product export count mismatch");
const pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:process.env.DATABASE_SSL==="true"?{rejectUnauthorized:true}:undefined});
const client=await pool.connect();
try{
 await client.query("begin");
 const tenant=process.env.LEGACY_IMPORT_TENANT_CODE
  ?await client.query("select id,code from tenants where code=$1 and status='active'",[process.env.LEGACY_IMPORT_TENANT_CODE])
  :await client.query("select id,code from tenants where status='active' order by created_at limit 1");
 if(!tenant.rowCount)throw new Error("No active canonical tenant found; set LEGACY_IMPORT_TENANT_CODE explicitly");
 const tenantRef=tenant.rows[0].id;
 let inserted=0,skipped=0;
 for(const p of archive.products){
  if(!p.legacy_id||!p.legacy_source_table||!p.slug||!p.name)throw new Error("Incomplete legacy product row");
  const values=[
   tenantRef,p.slug,p.slug,p.name,p.title||p.name,p.description||"",p.badge||"",
   Number(p.min_amount??0),Number(p.max_amount??0),Number(p.interval_days??0),
   JSON.stringify(p.tiers||[]),JSON.stringify(p.conditions||{}),JSON.stringify(p.documents||[]),
   p.image_url||"",Boolean(p.is_active),Boolean(p.show_in_list),Boolean(p.send_reminders),
   Number(p.sort_order??0),p.interest_method||"Monthly",Number(p.interest_percent??0),
   Number(p.late_daily_coef??0),Number(p.early_daily_coef??0),JSON.stringify(p.labels||[]),
   JSON.stringify(p.operational_costs||[]),archive.source_database,p.legacy_source_table,
   String(p.legacy_id),JSON.stringify(p),"legacy-import:digibail"
  ];
  const result=await client.query(
   "insert into lendtech_products(tenant_ref,product_code,slug,name,title,description,badge,min_amount,max_amount,interval_days,tiers,conditions,documents,image_url,source_is_active,is_active,show_in_list,send_reminders,sort_order,interest_method,interest_percent,late_daily_coef,early_daily_coef,labels,operational_costs,needs_review,status,legacy_source_database,legacy_source_table,legacy_id,legacy_payload,created_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12::jsonb,$13::jsonb,$14,$15,false,$16,$17,$18,$19,$20,$21,$22,$23::jsonb,$24::jsonb,true,'draft',$25,$26,$27,$28::jsonb,$29) on conflict(tenant_ref,legacy_source_table,legacy_id) do nothing returning id",
   values
  );
  if(result.rowCount)inserted++;else skipped++;
 }
 await client.query("commit");
 process.stdout.write(JSON.stringify({tenantCode:tenant.rows[0].code,sourceDatabase:archive.source_database,sourceTable:archive.source_table,sourceRows:archive.products.length,inserted,skipped,allImportedAsDraft:true,allRequireReview:true})+"\n");
}catch(error){await client.query("rollback");throw error;}finally{client.release();await pool.end();}
