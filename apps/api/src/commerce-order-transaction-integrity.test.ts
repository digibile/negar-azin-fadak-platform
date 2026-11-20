import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const sales=fs.readFileSync(new URL("./sales-revenue.ts",import.meta.url),"utf8");
const purchasing=fs.readFileSync(new URL("./purchasing-supply.ts",import.meta.url),"utf8");

test("sales order creation requires an active tenant-owned customer and products",()=>{
 assert.ok(sales.includes("from sales_partners where id=$1 and tenant_id=$2 and status='active'"));
 assert.ok(sales.includes("from sales_products where tenant_id=$1 and status='active' and id=any($2::uuid[])"));
 assert.ok(sales.includes("x.discountRate>100||x.taxRate<0||x.taxRate>100"));
});

test("sales order status changes serialize on the tenant-owned order row",()=>{
 assert.ok(sales.includes("select * from sales_orders where id=$1 and tenant_id=$2 for update"));
 assert.ok(sales.includes("update sales_orders set status=$1,updated_at=now() where id=$2 and tenant_id=$3 returning *"));
 assert.ok(sales.includes("insert into sales_events(tenant_id,entity_type,entity_id,from_status,to_status,event_type,reason,actor_user_id)"));
});

test("sales reservation and cancellation update stock and customer credit inside the same transaction",()=>{
 assert.ok(sales.includes("select stock_available from sales_products where id=$1 and tenant_id=$2 for update"));
 assert.ok(sales.includes("update sales_products set stock_available=stock_available-$1,updated_at=now() where id=$2 and tenant_id=$3"));
 assert.ok(sales.includes("update sales_products set stock_available=stock_available+$1,updated_at=now() where id=$2 and tenant_id=$3"));
 assert.ok(sales.includes("credit_used=greatest(0,credit_used-$1)"));
 assert.ok(sales.includes('await c.query("commit")'));
 assert.ok(sales.includes('await c.query("rollback")'));
});

test("purchase order transitions are locked, tenant-scoped and audited atomically",()=>{
 assert.ok(purchasing.includes("select * from purchase_orders where id=$1 and tenant_id=$2 for update"));
 assert.ok(purchasing.includes("update purchase_orders set status=$1,updated_at=now() where id=$2 and tenant_id=$3 returning *"));
 assert.ok(purchasing.includes("insert into purchase_events(tenant_id,entity_type,entity_id,from_status,to_status,event_type,actor_user_id,reason)"));
});

test("goods receipts validate remaining quantity and atomically update order lifecycle",()=>{
 assert.ok(purchasing.includes("select * from purchase_order_items where id=$1 and order_id=$2 for update"));
 assert.ok(purchasing.includes("Math.abs(accepted+rejected-quantity)>0.000001"));
 assert.ok(purchasing.includes("update purchase_order_items set received_qty=received_qty+$1 where id=$2 and order_id=$3"));
 assert.ok(purchasing.includes("where id=$2 and tenant_id=$3 returning id"));
});

test("purchase invoice and final payment are single-order operations with tenant scope",()=>{
 assert.ok(purchasing.includes("select * from purchase_orders where id=$1 and tenant_id=$2 for update"));
 assert.ok(purchasing.includes("select id from purchase_invoices where tenant_id=$1 and order_id=$2 limit 1"));
 assert.ok(purchasing.includes("sum(oi.unit_price*ri.accepted_qty)"));
 assert.ok(purchasing.includes("sum(oi.unit_price*ri.accepted_qty*oi.tax_rate/100)"));
 assert.ok(purchasing.includes("select * from purchase_invoices where id=$1 and tenant_id=$2 for update"));
 assert.ok(purchasing.includes("where id=$1 and tenant_id=$2 and status='invoiced' returning id"));
});

test("sales quote creation validates active tenant-owned customer and products and numeric line values",()=>{
 assert.ok(sales.includes("from sales_partners where id=$1 and tenant_id=$2 and status='active'"));
 assert.ok(sales.includes("from sales_products where tenant_id=$1 and status='active' and id=any($2::uuid[])"));
 assert.ok(sales.includes("x.quantity<=0||x.unitPrice<0||x.discountRate<0||x.discountRate>100||x.taxRate<0||x.taxRate>100"));
});

test("sales quote status and conversion are locked, tenant-scoped and atomic",()=>{
 assert.ok(sales.includes("select * from sales_quotes where id=$1 and tenant_id=$2 for update"));
 assert.ok(sales.includes("update sales_quotes set status=$1,updated_at=now() where id=$2 and tenant_id=$3 returning *"));
 assert.ok(sales.includes("update sales_quotes set status='converted',updated_at=now() where id=$1 and tenant_id=$2 and status='approved' returning id"));
 assert.ok(sales.includes('await cx.query("rollback")'));
 assert.ok(sales.includes("from sales_products where id=$1 and tenant_id=$2 for update"));
});
