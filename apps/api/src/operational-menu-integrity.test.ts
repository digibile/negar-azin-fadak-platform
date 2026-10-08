import test from "node:test";
import assert from "node:assert/strict";
import {query} from "./db.js";

const codes=["governance","identity","master-data","customer-360","smart-calendar","business-rules","sla","accounting-finance","treasury-bank","wallet-ledger","credit-facilities","12-credit-applications","13-loan-contracts","14-installment-schedules","15-installment-collections","16-collateral-guarantees","17-digital-binder","18-identity-verification","19-credit-scoring","20-credit-decisions","21-credit-committee","22-credit-disbursement","23-loan-settlement","24-loan-ledger","25-loan-refunds","26-loan-closure","27-loan-delinquency","28-collection-workflow","29-loan-restructuring","30-loan-relief","31-loan-legal-cases","32-form-builder","33-menu-builder","34-page-builder","35-page-block-editor","36-page-templates","37-frontend-sections","38-navigation-rules","39-frontend-notifications","40-notification-templates","41-documentation","42-document-approvals","43-document-versions","44-document-search","45-document-retention","46-document-distribution","47-document-access-log","48-document-audit-reports","49-document-compliance","50-document-governance"];

const nestedMenuKeys=["21-purchasing-supply","22-sales-revenue","23-inventory-warehouse","24-production","25-costing","26-treasury-bank","27-receivables","28-payables","29-wallet-ledger","30-projects-cost-centers","31-fixed-assets","32-tax-e-invoicing","33-budget-financial-control","34-financial-commitments","35-credit-financing","36-loans","37-collateral-guarantees","38-collections","39-human-resources","40-ai-finance","41-ai-documents-ocr","42-audit-internal-control","43-communication-hub","44-marketing-content","45-search-analytics","46-unified-applications","47-contracts-legal","48-shipping-delivery","49-reconciliation","50-release-health"];

test("operational menu 01..50 has a live module runtime, permissions, fields and actions",async()=>{
 const modules=(await query(`select m.code,m.is_active,rt.lifecycle,rt.route,rt.api_prefix,
   (select count(*) from module_permissions mp where mp.module_id=m.id)::int permission_count,
   (select count(*) from module_field_definitions mf where mf.module_id=m.id)::int field_count,
   (select count(*) from module_actions ma where ma.module_id=m.id and ma.is_active=true)::int action_count
   from platform_modules m left join module_runtime rt on rt.module_id=m.id
   where m.code = any($1) order by m.sort_order,m.id`,[codes])).rows;
 assert.equal(modules.length,50,"expected exactly 50 operational module runtimes");
 for(const m of modules){
  assert.equal(m.is_active,true,`inactive module: ${m.code}`);
  assert.equal(m.lifecycle,"active",`inactive runtime: ${m.code}`);
  assert.ok(m.route,`missing route: ${m.code}`);
  assert.ok(m.api_prefix,`missing api prefix: ${m.code}`);
  assert.ok(m.permission_count>=1,`missing permissions: ${m.code}`);
  assert.ok(m.field_count>=1,`missing field definitions: ${m.code}`);
  assert.ok(m.action_count>=1,`missing actions: ${m.code}`);
 }
});

test("canonical navigation has exactly 20 primary panels and keeps 21..50 as nested operational modules",async()=>{
 const panels=["01-dashboard","02-organizations","03-users-access","04-customers-360","05-smart-calendar","06-business-rules","07-sla","08-accounting-finance","09-commerce-stores","10-domains","11-merchants","12-sellers","13-payments-settlement","14-form-builder","15-menu-builder","16-page-builder","17-frontend-management","18-notifications","19-documents-governance","20-system-settings"];
 const roots=(await query(`select menu_key,title,path,permission,parent_id,is_active from menu_items where menu_key=any($1) and parent_id is null and is_active=true order by sort_order`,[panels])).rows;
 assert.equal(roots.length,20,"expected exactly 20 primary panel roots");
 assert.deepEqual(roots.map((r:any)=>r.menu_key),panels,"primary panel order/key mismatch");
 for(const root of roots){ assert.ok(root.path,"missing panel route: "+root.menu_key); assert.ok(root.permission,"missing panel permission: "+root.menu_key); }
 const permissionRows=(await query(`select distinct permission from role_permissions where role in ('admin','manager','viewer') and permission = any($1)`,[roots.map((r:any)=>r.permission)])).rows;
 assert.equal(permissionRows.length,20,"every canonical panel permission must be granted to core roles");

 const nested=(await query(`select menu_key,parent_id,is_active from menu_items where menu_key=any($1) order by menu_key`,[nestedMenuKeys])).rows;
 assert.equal(nested.length,30,"expected exactly 30 nested operational menu modules");
 assert.equal(nested.filter((r:any)=>r.parent_id===null).length,0,"modules 21..50 must not appear as primary navigation roots");
 assert.equal(nested.filter((r:any)=>r.is_active===true).length,30,"modules 21..50 must remain active");
});


test("commerce panels 09..13 keep canonical routes and panel placement",async()=>{
 const panels=[
  ["09-commerce-stores","/modules/?code=09-commerce-stores"],
  ["10-domains","/modules/?code=09-commerce-stores&panel=domains"],
  ["11-merchants","/modules/?code=09-commerce-stores&panel=acceptors"],
  ["12-sellers","/modules/?code=09-commerce-stores&panel=sellers"],
  ["13-payments-settlement","/modules/?code=10-wallet-ledger&panel=payments"]
 ];
 const rows=(await query(`select menu_key,path,is_active,parent_id,permission from menu_items where menu_key=any($1) order by sort_order`,[panels.map(x=>x[0])])).rows;
 assert.equal(rows.length,5,"expected commerce panels 09..13 to exist");
 for(const [key,path] of panels){
  const row=rows.find((x:any)=>x.menu_key===key);
  assert.ok(row,"missing commerce panel: "+key);
  assert.equal(row.is_active,true,"inactive commerce panel: "+key);
  assert.equal(row.parent_id,null,"commerce panel must remain a root: "+key);
  assert.equal(row.path,path,"commerce panel route mismatch: "+key);
  assert.ok(row.permission,"missing commerce panel permission: "+key);
 }
});


test("canonical panels 11..20 keep their panel routes and functional web runtimes",async()=>{
 const panels=[
  ["11-merchants","/modules/?code=09-commerce-stores&panel=acceptors"],
  ["12-sellers","/modules/?code=09-commerce-stores&panel=sellers"],
  ["13-payments-settlement","/modules/?code=10-wallet-ledger&panel=payments"],
  ["14-form-builder","/modules/?code=16-page-builder&panel=form"],
  ["15-menu-builder","/modules/?code=16-page-builder&panel=menu"],
  ["16-page-builder","/modules/?code=16-page-builder"],
  ["17-frontend-management","/modules/?code=16-page-builder&panel=frontend"],
  ["18-notifications","/modules/?code=18-notifications"],
  ["19-documents-governance","/modules/?code=19-documents-governance"],
  ["20-system-settings","/modules/?code=20-system-settings"]
 ];
 const rows=(await query(`select menu_key,path,is_active,parent_id from menu_items where menu_key=any($1) order by sort_order`,[panels.map(x=>x[0])])).rows;
 assert.equal(rows.length,10,"expected panels 11..20 to exist");
 for(const [key,path] of panels){
  const row=rows.find((x:any)=>x.menu_key===key);
  assert.ok(row,"missing panel: "+key);
  assert.equal(row.is_active,true,"inactive panel: "+key);
  assert.equal(row.parent_id,null,"panel must remain a root: "+key);
  assert.equal(row.path,path,"panel route mismatch: "+key);
 }
});

test("nested operational modules 21..50 have canonical runtime identities and web-compatible routes",async()=>{
 const nested=[
 "21-purchasing-supply","22-sales-revenue","23-inventory-warehouse","24-production","25-costing","26-treasury-bank",
 "27-receivables","28-payables","29-wallet-ledger","30-projects-cost-centers","31-fixed-assets","32-tax-e-invoicing",
 "33-budget-financial-control","34-financial-commitments","35-credit-financing","36-loans","37-collateral-guarantees",
 "38-collections","39-human-resources","40-ai-finance","41-ai-documents-ocr","42-audit-internal-control","43-communication-hub",
 "44-marketing-content","45-search-analytics","46-unified-applications","47-contracts-legal","48-shipping-delivery",
 "49-reconciliation","50-release-health"
 ];
 const rows=(await query(`select m.code,m.is_active,rt.lifecycle,rt.route,rt.api_prefix,
   (select count(*) from module_permissions mp where mp.module_id=m.id)::int permission_count,
   (select count(*) from module_field_definitions mf where mf.module_id=m.id)::int field_count,
   (select count(*) from module_actions ma where ma.module_id=m.id and ma.is_active=true)::int action_count
   from platform_modules m join module_runtime rt on rt.module_id=m.id
   where m.code=any($1) order by m.sort_order`,[nested])).rows;
 assert.equal(rows.length,30,"expected runtime identities for nested modules 21..50");
 for(const m of rows){
  assert.equal(m.is_active,true,`inactive nested module: ${m.code}`);
  assert.equal(m.lifecycle,"active",`inactive nested runtime: ${m.code}`);
  assert.equal(m.route,`/modules/?code=${m.code}`,`web route mismatch: ${m.code}`);
  assert.equal(m.api_prefix,`/api/platform/modules/${m.code}`,`API prefix mismatch: ${m.code}`);
  assert.ok(m.permission_count>=3,`missing CRUD permissions: ${m.code}`);
  assert.ok(m.field_count>=3,`missing field definitions: ${m.code}`);
  assert.ok(m.action_count>=3,`missing CRUD actions: ${m.code}`);
 }
 const expectedParents:Record<string,string>={
  "21-purchasing-supply":"09-commerce-stores","22-sales-revenue":"09-commerce-stores","23-inventory-warehouse":"09-commerce-stores",
  "24-production":"02-organizations","25-costing":"08-accounting-finance","26-treasury-bank":"08-accounting-finance",
  "27-receivables":"08-accounting-finance","28-payables":"08-accounting-finance","29-wallet-ledger":"13-payments-settlement",
  "30-projects-cost-centers":"02-organizations","31-fixed-assets":"08-accounting-finance","32-tax-e-invoicing":"08-accounting-finance",
  "33-budget-financial-control":"08-accounting-finance","34-financial-commitments":"08-accounting-finance","35-credit-financing":"08-accounting-finance",
  "36-loans":"08-accounting-finance","37-collateral-guarantees":"08-accounting-finance","38-collections":"08-accounting-finance",
  "39-human-resources":"02-organizations","40-ai-finance":"08-accounting-finance","41-ai-documents-ocr":"19-documents-governance",
  "42-audit-internal-control":"19-documents-governance","43-communication-hub":"18-notifications","44-marketing-content":"04-customers-360",
  "45-search-analytics":"01-dashboard","46-unified-applications":"20-system-settings","47-contracts-legal":"19-documents-governance",
  "48-shipping-delivery":"09-commerce-stores","49-reconciliation":"13-payments-settlement","50-release-health":"20-system-settings"
 };
 const parentRows=(await query(`select c.menu_key,p.menu_key as parent_key,c.parent_id
   from menu_items c join menu_items p on p.id=c.parent_id
   where c.menu_key=any($1)`,[nested])).rows;
 assert.equal(parentRows.length,30,"every nested module must have a canonical parent panel");
 for(const row of parentRows) assert.equal(row.parent_key,expectedParents[row.menu_key],`wrong menu parent: ${row.menu_key}`);
 const runtimeParents=(await query(`select c.code,p.code as parent_code
   from platform_modules c join platform_modules p on p.id=c.parent_id
   where c.code=any($1)`,[nested])).rows;
 assert.equal(runtimeParents.length,30,"every nested runtime must have a canonical parent panel");
 for(const row of runtimeParents) assert.equal(row.parent_code,expectedParents[row.code],`wrong runtime parent: ${row.code}`);
});


test("form builder 14 has real storage, tenant isolation, workflow permissions and submission runtime",async()=>{
 const cols=(await query(`select column_name from information_schema.columns where table_schema='public' and table_name='form_definitions' and column_name=any($1)`,[["tenant_id","code","schema","status","version","published_at"]])).rows;
 assert.equal(cols.length,6,"form_definitions must expose the canonical runtime columns");
 const submission=(await query(`select count(*)::int as n from information_schema.tables where table_schema='public' and table_name='form_submissions'`)).rows[0].n;
 assert.equal(submission,1,"form_submissions table is required");
 const perms=(await query(`select role,permission from role_permissions where permission=any($1) order by role,permission`,[["form:view","form:manage","form:publish","form:submission:view","form:submission:manage"]])).rows;
 assert.ok(perms.some((r:any)=>r.role==='admin'&&r.permission==='form:manage'),"admin form management permission missing");
 assert.ok(perms.some((r:any)=>r.role==='admin'&&r.permission==='form:publish'),"admin form publish permission missing");
 assert.ok(perms.some((r:any)=>r.role==='manager'&&r.permission==='form:manage'),"manager form management permission missing");
 assert.ok(perms.some((r:any)=>r.role==='viewer'&&r.permission==='form:view'),"viewer form view permission missing");
 assert.ok(perms.some((r:any)=>r.role==='viewer'&&r.permission==='form:submission:view'),"viewer submission view permission missing");
});
