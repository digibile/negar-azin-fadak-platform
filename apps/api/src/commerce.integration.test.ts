import assert from "node:assert/strict";
import test from "node:test";
import {randomUUID} from "node:crypto";
import {pool} from "./db.js";

test("postgres integration: checkout payment settlement refund and tenant isolation",async()=>{
 const suffix=randomUUID().slice(0,8);
 const tenantA=randomUUID();
 const tenantB=randomUUID();
 const sellerA=randomUUID();
 const sellerB=randomUUID();
 const storeA=randomUUID();
 const storeB=randomUUID();
 const productA=randomUUID();
 const productB=randomUUID();
 const orderA=randomUUID();
 const orderB=randomUUID();
 const paymentA=randomUUID();
 const settlementA=randomUUID();
 const refundA=randomUUID();

 const client=await pool.connect();
 try{
  await client.query("begin");
  await client.query("insert into tenants(id,code,name) values($1,$2,$3),($4,$5,$6)",[
   tenantA,"it-a-"+suffix,"Integration Tenant A",tenantB,"it-b-"+suffix,"Integration Tenant B"
  ]);
  await client.query("insert into sellers(id,tenant_id,legal_name,display_name,status,commission_rate) values($1,$2,$3,$4,'active',10),($5,$6,$7,$8,'active',10)",[
   sellerA,tenantA,"Integration Seller A","Seller A",sellerB,tenantB,"Integration Seller B","Seller B"
  ]);
  await client.query("insert into stores(id,tenant_id,seller_id,code,name,slug,status) values($1,$2,$3,$4,$5,$6,'active'),($7,$8,$9,$10,$11,$12,'active')",[
   storeA,tenantA,sellerA,"store-a-"+suffix,"Store A","store-a-"+suffix,storeB,tenantB,sellerB,"store-b-"+suffix,"Store B","store-b-"+suffix
  ]);
  await client.query("insert into products(id,tenant_id,seller_id,store_id,sku,title,price,status) values($1,$2,$3,$4,$5,$6,100000,'active'),($7,$8,$9,$10,$11,$12,100000,'active')",[
   productA,tenantA,sellerA,storeA,"sku-a-"+suffix,"Product A",productB,tenantB,sellerB,storeB,"sku-b-"+suffix,"Product B"
  ]);
  await client.query("insert into product_inventory(id,tenant_id,product_id,store_id,quantity,reserved_quantity) values($1,$2,$3,$4,10,0),($5,$6,$7,$8,10,0)",[
   randomUUID(),tenantA,productA,storeA,randomUUID(),tenantB,productB,storeB
  ]);

  await client.query("insert into marketplace_orders(id,tenant_id,store_id,seller_id,order_no,status,subtotal,total_amount,commission_amount,seller_payable) values($1,$2,$3,$4,$5,'pending',100000,100000,10000,90000),($6,$7,$8,$9,$10,'pending',100000,100000,10000,90000)",[
   orderA,tenantA,storeA,sellerA,"ORD-A-"+suffix,orderB,tenantB,storeB,sellerB,"ORD-B-"+suffix
  ]);
  await client.query("insert into marketplace_order_items(order_id,product_id,quantity,unit_price,line_total) values($1,$2,1,100000,100000),($3,$4,1,100000,100000)",[orderA,productA,orderB,productB]);

  await client.query("update product_inventory set quantity=quantity-1,reserved_quantity=reserved_quantity+1 where tenant_id=$1 and product_id=$2 and quantity>=1",[tenantA,productA]);
  await client.query("update marketplace_orders set status='confirmed',updated_at=now() where id=$1 and tenant_id=$2",[orderA,tenantA]);

  await client.query("insert into marketplace_payments(id,tenant_id,order_id,payment_no,amount,method,status,provider_ref,paid_at) values($1,$2,$3,$4,100000,'integration','paid',$5,now())",[
   paymentA,tenantA,orderA,"PAY-A-"+suffix,"provider-"+suffix
  ]);
  await client.query("update marketplace_orders set status='paid',paid_at=now(),updated_at=now() where id=$1 and tenant_id=$2",[orderA,tenantA]);
  await client.query("update product_inventory set reserved_quantity=reserved_quantity-1 where tenant_id=$1 and product_id=$2 and reserved_quantity>=1",[tenantA,productA]);

  const platform=await client.query("insert into ledger_accounts(tenant_id,code,name,account_type) values($1,'1101','Platform Payments','asset') returning id",[tenantA]);
  const payable=await client.query("insert into ledger_accounts(tenant_id,code,name,account_type) values($1,'2101','Seller Payable','liability') returning id",[tenantA]);
  const commission=await client.query("insert into ledger_accounts(tenant_id,code,name,account_type) values($1,'4101','Commission Revenue','revenue') returning id",[tenantA]);
  const entry=await client.query("insert into ledger_entries(tenant_id,entry_no,source_type,source_id,description) values($1,$2,'marketplace_payment',$3,'integration payment') returning id",[
   tenantA,"LE-A-"+suffix,paymentA
  ]);
  await client.query("insert into ledger_lines(entry_id,account_id,debit,credit) values($1,$2,100000,0),($1,$3,0,90000),($1,$4,0,10000)",[
   entry.rows[0].id,platform.rows[0].id,payable.rows[0].id,commission.rows[0].id
  ]);

  await client.query("insert into seller_settlements(id,tenant_id,seller_id,settlement_no,period_start,period_end,gross_amount,commission_amount,net_amount,status) values($1,$2,$3,$4,now()-interval '1 day',now()+interval '1 day',100000,10000,90000,'approved')",[
   settlementA,tenantA,sellerA,"SET-A-"+suffix
  ]);
  await client.query("insert into seller_settlement_items(tenant_id,settlement_id,order_id,gross_amount,commission_amount,net_amount) values($1,$2,$3,100000,10000,90000)",[
   tenantA,settlementA,orderA
  ]);
  const settlementEntry=await client.query("insert into ledger_entries(tenant_id,entry_no,source_type,source_id,description) values($1,$2,'marketplace_settlement',$3,'integration settlement') returning id",[
   tenantA,"LE-S-"+suffix,settlementA
  ]);
  await client.query("insert into ledger_lines(entry_id,account_id,debit,credit) values($1,$2,90000,0),($1,$3,0,90000)",[
   settlementEntry.rows[0].id,payable.rows[0].id,platform.rows[0].id
  ]);
  await client.query("update seller_settlements set status='paid',updated_at=now() where id=$1 and tenant_id=$2",[settlementA,tenantA]);

  await client.query("insert into marketplace_refunds(id,tenant_id,order_id,payment_id,refund_no,amount,reason,status,provider_code,provider_transaction_id,provider_refund_transaction_id) values($1,$2,$3,$4,$5,100000,'integration refund','refunded','integration',$6,$7)",[
   refundA,tenantA,orderA,"PAY-A-"+suffix,100000,"provider-"+suffix,"refund-"+suffix
  ]);
  await client.query("update marketplace_payments set status='refunded',updated_at=now() where id=$1 and tenant_id=$2",[paymentA,tenantA]);
  await client.query("update marketplace_orders set status='refunded',updated_at=now() where id=$1 and tenant_id=$2",[orderA,tenantA]);
  await client.query("update product_inventory set quantity=quantity+1 where tenant_id=$1 and product_id=$2",[tenantA,productA]);
  const reversal=await client.query("insert into ledger_entries(tenant_id,entry_no,source_type,source_id,description) values($1,$2,'marketplace_refund',$3,'integration refund reversal') returning id",[
   tenantA,"LE-R-"+suffix,refundA
  ]);
  await client.query("insert into ledger_lines(entry_id,account_id,debit,credit) values($1,$2,90000,0),($1,$3,10000,0),($1,$4,0,100000)",[
   reversal.rows[0].id,payable.rows[0].id,commission.rows[0].id,platform.rows[0].id
  ]);
  await client.query("insert into inventory_movements(tenant_id,product_id,store_id,movement_type,quantity,reference_type,reference_id) values($1,$2,$3,'refund',1,'marketplace_refund',$4)",[
   tenantA,productA,storeA,refundA
  ]);

  const crossTenantOrder=await client.query("select 1 from marketplace_orders where tenant_id=$1 and id=$2",[tenantB,orderA]);
  const crossTenantPayment=await client.query("select 1 from marketplace_payments where tenant_id=$1 and id=$2",[tenantB,paymentA]);
  const balances=await client.query("select coalesce(sum(debit),0)::numeric as debits,coalesce(sum(credit),0)::numeric as credits from ledger_lines where entry_id in($1,$2,$3)",[
   entry.rows[0].id,settlementEntry.rows[0].id,reversal.rows[0].id
  ]);
  const inventory=await client.query("select quantity,reserved_quantity from product_inventory where tenant_id=$1 and product_id=$2",[tenantA,productA]);
  assert.equal(crossTenantOrder.rowCount,0);
  assert.equal(crossTenantPayment.rowCount,0);
  assert.equal(balances.rows[0].debits,"300000");
  assert.equal(balances.rows[0].credits,"300000");
  assert.equal(inventory.rows[0].quantity,"10");
  assert.equal(inventory.rows[0].reserved_quantity,"0");

  await client.query("rollback");
 }catch(error){
  await client.query("rollback");
  throw error;
 }finally{
  client.release();
 }
});
