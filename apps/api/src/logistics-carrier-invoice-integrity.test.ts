import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const routeSource=fs.readFileSync(new URL("./logistics.ts",import.meta.url),"utf8");
const migration=fs.readFileSync(new URL("../../../database/migrations/zzzzz_logistics_carrier_invoice_allocations.sql",import.meta.url),"utf8");
const start=routeSource.indexOf('logisticsRouter.post("/api/logistics/carrier-invoices"');
const route=start<0?"":routeSource.slice(start,routeSource.indexOf('logisticsRouter.get("/api/logistics/reports"',start));

test("carrier invoice registration is permission-protected and tenant-scoped",()=>{
 assert.ok(start>=0);
 assert.match(route,/requireAuth,requirePermission\("modules:12-logistics-supply:write"\)/);
 assert.match(route,/accounting_parties where id=\$1 and tenant_id=\$2 and party_type='supplier' and status='active'/);
 assert.match(route,/sh\.tenant_id=\$1/);
 assert.match(route,/so\.marketplace_order_id/);
 assert.match(route,/mo\.currency/);
});

test("carrier invoice allocations must exactly reconcile to the invoice total",()=>{
 assert.match(route,/normalized\.reduce\(\(sum:number,x:any\)=>sum\+cents\(x\.amount\),0\)!==invoiceTotal/);
 assert.match(route,/new Set\(normalized\.map\(\(x:any\)=>x\.shipmentId\)\)\.size!==normalized\.length/);
 assert.match(route,/accountingStatus:"not_posted"/);
});

test("carrier invoice schema enforces tenant-safe supplier and shipment references",()=>{
 assert.match(migration,/foreign key\(tenant_id,carrier_party_id\)\s+references accounting_parties\(tenant_id,id\)/);
 assert.match(migration,/foreign key\(tenant_id,shipment_id\)\s+references logistics_shipments\(tenant_id,id\)/);
 assert.match(migration,/unique\(tenant_id,carrier_party_id,invoice_no\)/);
 assert.match(migration,/unique\(tenant_id,invoice_id,shipment_id\)/);
 assert.match(migration,/total_amount>0 and total_amount=subtotal\+tax_amount/);
});
