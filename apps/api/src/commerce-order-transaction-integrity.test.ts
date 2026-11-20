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
 assert.ok(sales.includes("approved:[\"cancelled\"]"));
});

test("purchase order creation validates each line and locks tenant-owned supplier, request and selected quote",()=>{
 assert.ok(purchasing.includes("select id from purchase_suppliers where id=$1 and tenant_id=$2 and status='active' for update"));
 assert.ok(purchasing.includes("select id,status from purchase_requests where id=$1 and tenant_id=$2 for update"));
 assert.ok(purchasing.includes("where q.id=$1 and r.tenant_id=$2 for update of q,r"));
 assert.ok(purchasing.includes("quote.rows[0].supplier_id!==b.supplierId"));
 assert.ok(purchasing.includes("linkedRequestId!==quote.rows[0].request_id"));
 assert.ok(purchasing.includes("linkedRequestId=quote.rows[0].request_id"));
 assert.ok(purchasing.includes("x.quantity<=0||x.unitPrice<0||x.taxRate<0||x.taxRate>100"));
});

test("sales invoice issuance locks a delivered tenant order and rejects duplicate invoices",()=>{
 assert.ok(sales.includes("select * from sales_orders where id=$1 and tenant_id=$2 for update"));
 assert.ok(sales.includes("if(x.status!==\"delivered\")"));
 assert.ok(sales.includes("select id from sales_invoices where tenant_id=$1 and order_id=$2 limit 1"));
 assert.ok(sales.includes("where id=$1 and tenant_id=$2 and status='delivered' returning id"));
});

test("sales invoice payments lock the invoice, validate outstanding balance and commit atomically",()=>{
 assert.ok(sales.includes("select * from sales_invoices where id=$1 and tenant_id=$2 for update"));
 assert.ok(sales.includes("paidBefore+amount>total+0.000001"));
 assert.ok(sales.includes("update sales_invoices set paid_total=$1,status=$2,updated_at=now() where id=$3 and tenant_id=$4 returning id"));
 assert.ok(sales.includes("if(!updated.rowCount){await c.query(\"rollback\")"));
});

test("sales return requests reserve only paid invoice balance under an invoice lock",()=>{
 assert.ok(sales.includes("select * from sales_invoices where id=$1 and tenant_id=$2 for update"));
 assert.ok(sales.includes("select coalesce(sum(amount),0)::numeric amount from sales_returns where tenant_id=$1 and invoice_id=$2 and status not in ('rejected','cancelled')"));
 assert.ok(sales.includes("amount+reservedAmount>paid+0.000001"));
});

test("sales refunds update invoice net receipts and create a financial refund event atomically",()=>{
 assert.ok(sales.includes("update sales_returns set status=$1 where id=$2 and tenant_id=$3 returning *"));
 assert.ok(sales.includes("update sales_invoices set paid_total=$1,status=$2,updated_at=now() where id=$3 and tenant_id=$4"));
 assert.ok(sales.includes("'customer_refund'"));
 assert.ok(sales.includes('await c.query("commit")'));
 assert.ok(sales.includes('await c.query("rollback")'));
});

test("purchase supplier quote selection locks tenant RFQ and only selects an active received offer",()=>{
 assert.ok(purchasing.includes("for update of q,r"));
 assert.ok(purchasing.includes('selected.status!=="received"||!["sent","quoting","compared"].includes(selected.rfq_status)'));
 assert.ok(purchasing.includes("select id from purchase_suppliers where id=$1 and tenant_id=$2 and status='active' for update"));
 assert.ok(purchasing.includes("where id=$1 and tenant_id=$2 and status in ('sent','quoting','compared') returning id"));
 assert.ok(purchasing.includes("'supplier_selected'"));
 assert.ok(purchasing.includes("select id,status from purchase_requests where id=$1 and tenant_id=$2 for update"));
 assert.ok(purchasing.includes('request.rows[0].status!=="rfq"'));
 assert.ok(purchasing.includes("where id=$1 and tenant_id=$2 and status='rfq' returning id"));
});

test("supplier quote submission requires an invited active supplier and a locked open tenant RFQ",()=>{
 assert.ok(purchasing.includes("select * from purchase_rfqs where id=$1 and tenant_id=$2 for update"));
 assert.ok(purchasing.includes("select id from purchase_suppliers where id=$1 and tenant_id=$2 and status='active' for update"));
 assert.ok(purchasing.includes("select status from purchase_rfq_suppliers where rfq_id=$1 and supplier_id=$2 for update"));
 assert.ok(purchasing.includes('invitation.rows[0].status!=="invited"'));
 assert.ok(purchasing.includes("unique(rfq_id,supplier_id)")===false || purchasing.includes("insert into purchase_supplier_quotes"));
});

test("supplier quote line totals, shipping and quality values are validated before transactional insert",()=>{
 assert.ok(purchasing.includes("x.quantity<=0||x.unitPrice<0||x.taxRate<0||x.taxRate>100"));
 assert.ok(purchasing.includes("shipping<0"));
 assert.ok(purchasing.includes("quality>100"));
 assert.ok(purchasing.includes("insert into purchase_events(tenant_id,entity_type,entity_id,to_status,event_type,actor_user_id)"));
});

test("purchase return creation locks an invoiced tenant order and reserves only remaining invoice value",()=>{
 assert.ok(purchasing.includes("select * from purchase_orders where id=$1 and tenant_id=$2 for update"));
 assert.ok(purchasing.includes('if(!["invoiced","paid"].includes(old.status))'));
 assert.ok(purchasing.includes("select * from purchase_invoices where order_id=$1 and tenant_id=$2 for update"));
 assert.ok(purchasing.includes("amount+already>invoiceTotal+0.000001"));
 assert.ok(purchasing.includes("insert into purchase_returns(tenant_id,return_no,order_id,amount,reason,created_by)"));
});

test("purchase return credit is tenant-scoped, transition-locked and posted as a negative supplier credit event",()=>{
 assert.ok(purchasing.includes("select * from purchase_returns where id=$1 and tenant_id=$2 for update"));
 assert.ok(purchasing.includes("update purchase_returns set status=$1 where id=$2 and tenant_id=$3 and status=$4 returning *"));
 assert.ok(purchasing.includes("credited+amount>total+0.000001"));
 assert.ok(purchasing.includes("'supplier_credit_note'"));
 assert.ok(purchasing.includes("-Number(old.amount)"));
 assert.ok(purchasing.includes('await c.query("rollback")'));
});
