import test from "node:test";
import assert from "node:assert/strict";
import {query} from "./db.js";

const codes=["governance","identity","master-data","customer-360","smart-calendar","business-rules","sla","accounting-finance","treasury-bank","wallet-ledger","credit-facilities","12-credit-applications","13-loan-contracts","14-installment-schedules","15-installment-collections","16-collateral-guarantees","17-digital-binder","18-identity-verification","19-credit-scoring","20-credit-decisions","21-credit-committee","22-credit-disbursement","23-loan-settlement","24-loan-ledger","25-loan-refunds","26-loan-closure","27-loan-delinquency","28-collection-workflow","29-loan-restructuring","30-loan-relief","31-loan-legal-cases","32-form-builder","33-menu-builder","34-page-builder","35-page-block-editor","36-page-templates","37-frontend-sections","38-navigation-rules","39-frontend-notifications","40-notification-templates","41-documentation","42-document-approvals","43-document-versions","44-document-search","45-document-retention","46-document-distribution","47-document-access-log","48-document-audit-reports","49-document-compliance","50-document-governance"];

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

test("operational menu 01..50 is navigable from the canonical menu tree",async()=>{
 const rows=(await query(`select m.code,mi.id,
   (select count(*) from menu_items c where c.parent_id=mi.id and c.is_active=true)::int child_count
   from unnest($1::text[]) as m(code)
   left join menu_items mi on mi.path='/modules/?code='||m.code and mi.is_active=true
   order by m.code`,[codes])).rows;
 assert.equal(rows.length,50,"expected 50 canonical module menu entries");
 for(const row of rows){
  assert.ok(row.id,`missing menu entry: ${row.code}`);
  assert.ok(row.child_count>=5,`missing operational submenus: ${row.code}`);
 }
});
