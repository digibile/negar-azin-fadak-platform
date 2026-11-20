import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const checkout=fs.readFileSync(new URL("./domain-checkout.ts",import.meta.url),"utf8");
const migration=fs.readFileSync(new URL("../../../database/migrations/999_storefront_return_inspection_receipt.sql",import.meta.url),"utf8");
const page=fs.readFileSync(new URL("../../web/app/marketplace/returns/page.tsx",import.meta.url),"utf8");

test("return inspection is a tenant-scoped, permission-checked warehouse receipt operation",()=>{
 const start=checkout.indexOf('checkoutRouter.post("/api/marketplace/returns/:id/inspect"');
 const end=checkout.indexOf('checkoutRouter.patch("/api/marketplace/returns/:id/status"',start);
 const route=checkout.slice(start,end);
 assert.ok(route.includes('requirePermission("order:manage")'));
 assert.ok(route.includes('requirePermission("modules:23-inventory-warehouse:post")'));
 assert.ok(route.includes("where rr.id=$1 and rr.tenant_id=$2"));
 assert.ok(route.includes('rr.status!=="received"'));
 assert.ok(route.includes("received>Number(rr.requested_quantity)"));
 assert.ok(route.includes("status='active'"));
 assert.ok(route.includes("mil.tenant_id=$1 and mil.product_id=$2"));
 assert.ok(route.includes("for share of mil,ip"));
});

test("only inspected sellable quantity is posted into warehouse stock",()=>{
 const start=checkout.indexOf('checkoutRouter.post("/api/marketplace/returns/:id/inspect"');
 const end=checkout.indexOf('checkoutRouter.patch("/api/marketplace/returns/:id/status"',start);
 const route=checkout.slice(start,end);
 assert.ok(route.includes('restock>0&&!mapping'));
 assert.ok(route.includes("inventory_documents"));
 assert.ok(route.includes("inventory_document_items"));
 assert.ok(route.includes("inventory_stock(tenant_id,warehouse_id,product_id,quantity,reserved_quantity)"));
 assert.ok(route.includes("quantity=inventory_stock.quantity+excluded.quantity"));
 assert.ok(route.includes("status='inspected'"));
 assert.ok(route.includes("inventory_receipt_document_id"));
 assert.ok(route.includes("inventory_events"));
});

test("generic return status route cannot bypass physical inspection and receipt",()=>{
 const start=checkout.indexOf('checkoutRouter.patch("/api/marketplace/returns/:id/status"');
 const end=checkout.indexOf('checkoutRouter.post("/api/marketplace/returns/:id/refund"',start);
 const route=checkout.slice(start,end);
 assert.ok(route.includes('approved:["received","cancelled"]'));
 assert.ok(!route.includes('received:["inspected"]'));
});

test("migration enforces tenant-safe receipt and warehouse references",()=>{
 assert.ok(migration.includes("received_quantity"));
 assert.ok(migration.includes("restock_quantity"));
 assert.ok(migration.includes("foreign key(tenant_id,inspection_warehouse_id)"));
 assert.ok(migration.includes("foreign key(tenant_id,inventory_receipt_document_id)"));
 assert.ok(migration.includes("references inventory_documents(tenant_id,id)"));
 assert.ok(migration.includes("received_quantity numeric(20,3)"));
 assert.ok(migration.indexOf("received_quantity")<migration.indexOf("restock_quantity"));
});

test("returns workspace requires warehouse and separates received from restockable quantity",()=>{
 assert.ok(page.includes("/api/marketplace/returns/"));
 assert.ok(page.includes("/inspect"));
 assert.ok(page.includes("ثبت بازرسی و رسید انبار"));
 assert.ok(page.includes("restockQuantity"));
 assert.ok(page.includes("warehouseId"));
 assert.ok(!page.includes('transition(item,"inspected")'));
 assert.ok(!page.includes("\
 type Warehouse="));
});

test("non-restockable returned quantity is registered in tenant quarantine without saleable stock",()=>{
 const start=checkout.indexOf('checkoutRouter.post("/api/marketplace/returns/:id/inspect"');
 const end=checkout.indexOf('checkoutRouter.patch("/api/marketplace/returns/:id/disposition"',start);
 const route=checkout.slice(start,end);
 assert.ok(route.includes("if(received-restock>0)"));
 assert.ok(route.includes("marketplace_return_quarantine"));
 assert.ok(route.includes("Number((received-restock).toFixed(3))"));
 assert.ok(route.includes("warehouseQuantity"));
});

test("quarantine disposition is tenant-scoped, one-way, permission checked and audited",()=>{
 const start=checkout.indexOf('checkoutRouter.patch("/api/marketplace/returns/:id/disposition"');
 const end=checkout.indexOf('checkoutRouter.patch("/api/marketplace/returns/:id/status"',start);
 const route=checkout.slice(start,end);
 assert.ok(route.includes('requirePermission("order:manage")'));
 assert.ok(route.includes('requirePermission("modules:23-inventory-warehouse:write")'));
 assert.ok(route.includes("q.tenant_id=$1 and q.return_request_id=$2"));
 assert.ok(route.includes('q.status!=="quarantined"'));
 assert.ok(route.includes('["supplier_handover","disposed"]'));
 assert.ok(route.includes("platform_audit_events"));
 assert.ok(route.includes("inventory_events"));
 assert.ok(!route.includes("inventory_stock"));
});

test("return case cannot close while quarantine disposition remains pending",()=>{
 const start=checkout.indexOf('checkoutRouter.patch("/api/marketplace/returns/:id/status"');
 const end=checkout.indexOf('checkoutRouter.post("/api/marketplace/returns/:id/refund"',start);
 const route=checkout.slice(start,end);
 assert.ok(route.includes('if(target==="closed")'));
 assert.ok(route.includes("status='quarantined'"));
 assert.ok(route.includes("ابتدا کالای غیرقابل فروش را از قرنطینه تعیین تکلیف کنید"));
});

test("quarantine migration has tenant-safe return and warehouse references",()=>{
 const q=fs.readFileSync(new URL("../../../database/migrations/zz_marketplace_return_quarantine.sql",import.meta.url),"utf8");
 assert.ok(q.includes("unique(tenant_id,return_request_id)"));
 assert.ok(q.includes("foreign key(tenant_id,return_request_id)"));
 assert.ok(q.includes("foreign key(tenant_id,warehouse_id)"));
 assert.ok(q.includes("inventory_warehouses_tenant_id_uq"));
 assert.ok(q.includes("quarantine_quantity numeric(20,3)"));
 assert.ok(q.includes("supplier_handover"));
 assert.ok(q.includes("disposed"));
});

test("returns workspace exposes quarantine quantities and disposition actions",()=>{
 assert.ok(page.includes("quarantine_quantity"));
 assert.ok(page.includes("ثبت تحویل به تأمین‌کننده"));
 assert.ok(page.includes("ثبت امحا / ضایعات"));
 assert.ok(page.includes("/disposition"));
});

test("returns list exposes quarantine status and custody data from the same tenant",()=>{
 const start=checkout.indexOf('checkoutRouter.get("/api/marketplace/returns"');
 const end=checkout.indexOf('checkoutRouter.post("/api/marketplace/returns/:id/inspect"',start);
 const route=checkout.slice(start,end);
 assert.ok(route.includes("left join marketplace_return_quarantine rq"));
 assert.ok(route.includes("rq.tenant_id=rr.tenant_id"));
 assert.ok(route.includes("rq.quarantine_quantity"));
 assert.ok(route.includes("rq.supplier_name quarantine_supplier_name"));
});

test("supplier handover uses active canonical supplier party and optional same-supplier purchase",()=>{
 const start=checkout.indexOf('checkoutRouter.get("/api/marketplace/returns/suppliers"');
 const end=checkout.indexOf('checkoutRouter.patch("/api/marketplace/returns/:id/status"',start);
 const routes=checkout.slice(start,end);
 assert.ok(routes.includes("accounting_parties"));
 assert.ok(routes.includes("party_type='supplier'"));
 assert.ok(routes.includes("finance_purchases"));
 assert.ok(routes.includes("supplier_id=$2"));
 assert.ok(routes.includes("party_type='supplier' and status='active'"));
 assert.ok(routes.includes("supplierPartyId"));
 assert.ok(routes.includes("purchaseId"));
 assert.ok(routes.includes("source_purchase_id"));
 assert.ok(routes.includes("supplier_party_id"));
});

test("quarantine migration references canonical supplier and purchase records by tenant",()=>{
 const q=fs.readFileSync(new URL("../../../database/migrations/zz_marketplace_return_quarantine.sql",import.meta.url),"utf8");
 assert.ok(q.includes("accounting_parties_tenant_id_uq"));
 assert.ok(q.includes("finance_purchases_tenant_id_uq"));
 assert.ok(q.includes("foreign key(tenant_id,supplier_party_id)"));
 assert.ok(q.includes("references accounting_parties(tenant_id,id)"));
 assert.ok(q.includes("foreign key(tenant_id,source_purchase_id)"));
 assert.ok(q.includes("references finance_purchases(tenant_id,id)"));
});

test("returns workspace uses supplier and purchase selectors instead of free-text supplier names",()=>{
 assert.ok(page.includes("/api/marketplace/returns/suppliers"));
 assert.ok(page.includes("/purchases"));
 assert.ok(page.includes("supplierPartyId"));
 assert.ok(page.includes("فاکتور خرید مرجع"));
 assert.ok(page.includes("ثبت تحویل کالای قرنطینه به تأمین‌کننده"));
});

test("financial inventory mapping migration enforces tenant-safe one-to-one links",()=>{
 const q=fs.readFileSync(new URL("../../../database/migrations/zzz_marketplace_finance_inventory_mapping.sql",import.meta.url),"utf8");
 assert.ok(q.includes("marketplace_finance_product_links"));
 assert.ok(q.includes("marketplace_finance_warehouse_links"));
 assert.ok(q.includes("foreign key(tenant_id,inventory_product_id)"));
 assert.ok(q.includes("foreign key(tenant_id,finance_product_id)"));
 assert.ok(q.includes("foreign key(tenant_id,inventory_warehouse_id)"));
 assert.ok(q.includes("foreign key(tenant_id,finance_warehouse_id)"));
 assert.ok(q.includes("unique(tenant_id,inventory_product_id)"));
 assert.ok(q.includes("unique(tenant_id,inventory_warehouse_id)"));
 assert.ok(q.includes("unique(tenant_id,finance_warehouse_id)"));
});

test("finance mapping APIs validate active records in the same tenant and audit changes",()=>{
 const start=checkout.indexOf('checkoutRouter.get("/api/marketplace/returns/finance-mappings"');
 const end=checkout.indexOf('checkoutRouter.get("/api/marketplace/returns/suppliers"',start);
 const routes=checkout.slice(start,end);
 assert.ok(routes.includes('requirePermission("accounting-finance.read")'));
 assert.ok(routes.includes('requirePermission("accounting-finance.write")'));
 assert.ok(routes.includes('requirePermission("modules:23-inventory-warehouse:write")'));
 assert.ok(routes.includes("ip.tenant_id=$3 and ip.status='active' and fp.is_active=true"));
 assert.ok(routes.includes("iw.tenant_id=$3 and iw.status='active' and fw.status='active'"));
 assert.ok(routes.includes("platform_audit_events"));
 assert.ok(routes.includes("quantityFactor"));
});

test("financial inventory mapping API and workspace expose explicit product and warehouse mapping",()=>{
 const start=checkout.indexOf('checkoutRouter.get("/api/marketplace/returns/finance-mappings"');
 const end=checkout.indexOf('checkoutRouter.get("/api/marketplace/returns/suppliers"',start);
 const routes=checkout.slice(start,end);
 assert.ok(routes.includes("inventoryProducts:inventoryProducts.rows"));
 assert.ok(routes.includes("financeProducts:financeProducts.rows"));
 assert.ok(routes.includes("inventoryWarehouses:inventoryWarehouses.rows"));
 assert.ok(routes.includes("financeWarehouses:financeWarehouses.rows"));
 assert.ok(page.includes("تنظیم اتصال کالا و انبار به دفتر موجودی مالی"));
 assert.ok(page.includes("/api/marketplace/returns/finance-mappings/products"));
 assert.ok(page.includes("/api/marketplace/returns/finance-mappings/warehouses"));
 assert.ok(page.includes("ضریب تبدیل مقدار"));
});

test("finance mapping endpoints never post stock or create accounting documents",()=>{
 const start=checkout.indexOf('checkoutRouter.get("/api/marketplace/returns/finance-mappings"');
 const end=checkout.indexOf('checkoutRouter.get("/api/marketplace/returns/suppliers"',start);
 const routes=checkout.slice(start,end);
 assert.ok(!routes.includes("finance_inventory_documents"));
 assert.ok(!routes.includes("finance_inventory_balances"));
 assert.ok(!routes.includes("inventory_stock"));
});

test("supplier handover validates purchase product mapping and cumulative quantity under purchase lock",()=>{
 const start=checkout.indexOf('checkoutRouter.patch("/api/marketplace/returns/:id/disposition"');
 const end=checkout.indexOf('checkoutRouter.patch("/api/marketplace/returns/:id/status"',start);
 const route=checkout.slice(start,end);
 assert.ok(route.includes("finance_purchase_lines"));
 assert.ok(route.includes("marketplace_inventory_product_links"));
 assert.ok(route.includes("marketplace_finance_product_links"));
 assert.ok(route.includes("for update"));
 assert.ok(route.includes("priorReturns"));
 assert.ok(route.includes("purchaseQuantity"));
 assert.ok(route.includes("financeQuantity"));
 assert.ok(route.includes("mil.quantity_factor"));
 assert.ok(route.includes("mfl.quantity_factor"));
 assert.ok(route.includes("مقدار کالای قرنطینه از مقدار باقیمانده ردیف کالای فاکتور خرید بیشتر است"));
});

test("supplier handover persists financial quantity snapshot for stable cumulative limits",()=>{
 const migration=fs.readFileSync(new URL("../../../database/migrations/zzzz_marketplace_return_finance_handover_trace.sql",import.meta.url),"utf8");
 assert.ok(migration.includes("finance_product_id uuid"));
 assert.ok(migration.includes("finance_quantity numeric(20,4)"));
 assert.ok(migration.includes("foreign key(tenant_id,finance_product_id)"));
 assert.ok(migration.includes("references finance_products(tenant_id,id)"));
 const start=checkout.indexOf('checkoutRouter.patch("/api/marketplace/returns/:id/disposition"');
 const end=checkout.indexOf('checkoutRouter.patch("/api/marketplace/returns/:id/status"',start);
 const route=checkout.slice(start,end);
 assert.ok(route.includes("finance_product_id=$3 and pq.status='supplier_handover'"));
 assert.ok(route.includes("sum(pq.finance_quantity)"));
 assert.ok(route.includes("finance_product_id=$4,finance_quantity=$5"));
 assert.ok(route.includes("handoverFinanceProductId"));
 assert.ok(route.includes("handoverFinanceQuantity"));
});
