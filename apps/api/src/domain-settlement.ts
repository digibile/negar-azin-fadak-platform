import {Router} from "express";
import {pool,query} from "./db.js";
import {requireAuth,requirePermission} from "./auth.js";
import {asyncHandler} from "./http.js";
import {resolveTenant} from "./tenant-context.js";
import {postLedgerEntry} from "./ledger.js";
import {emitBusinessEvent} from "./business-events.js";

export const settlementRouter=Router();
const s=(v:unknown,n=120)=>typeof v==="string"?v.trim().slice(0,n):"";
const tenant=async(req:any)=>resolveTenant(req,req.user);

settlementRouter.get("/api/marketplace/settlements",requireAuth,requirePermission("settlement:view"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const r=await query("select ss.*,s.display_name as seller_name,(select count(*)::int from seller_settlement_items si where si.settlement_id=ss.id) as order_count from seller_settlements ss join sellers s on s.id=ss.seller_id where ss.tenant_id=$1 order by ss.created_at desc",[t.id]);
 res.json(r.rows);
}));

settlementRouter.post("/api/marketplace/settlements/generate",requireAuth,requirePermission("settlement:manage"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const start=s(req.body?.periodStart,40),end=s(req.body?.periodEnd,40);
 if(!start||!end)return res.status(400).json({error:"بازه تسویه الزامی است"});
 const periodStart=new Date(start),periodEnd=new Date(end);
 if(Number.isNaN(periodStart.getTime())||Number.isNaN(periodEnd.getTime())||periodEnd<=periodStart)return res.status(400).json({error:"بازه زمانی نامعتبر است"});
 const client=await pool.connect();
 try{
  await client.query("begin");
  const orders=await client.query("select o.* from marketplace_orders o where o.tenant_id=$1 and o.status='paid' and o.created_at>=$2 and o.created_at<$3 and not exists(select 1 from seller_settlement_items si where si.tenant_id=o.tenant_id and si.order_id=o.id) order by o.created_at for update",[t.id,periodStart.toISOString(),periodEnd.toISOString()]);
  if(!orders.rowCount){await client.query("rollback");return res.status(404).json({error:"سفارش تسویه‌نشده‌ای در این بازه پیدا نشد"});}
  const bySeller=new Map<string,any[]>();
  for(const o of orders.rows){const list=bySeller.get(o.seller_id)||[];list.push(o);bySeller.set(o.seller_id,list);}
  const created=[];
  for(const [sellerId,rows] of bySeller){
   const gross=rows.reduce((a,o)=>a+Number(o.total_amount),0);
   const commission=rows.reduce((a,o)=>a+Number(o.commission_amount),0);
   const net=rows.reduce((a,o)=>a+Number(o.seller_payable),0);
   const requestedSettlementNo=s(req.body?.settlementNo,100);
   const settlementNo=requestedSettlementNo?(bySeller.size>1?requestedSettlementNo+"-"+sellerId:requestedSettlementNo):("SET-"+Date.now()+"-"+sellerId);
   const sr=await client.query("insert into seller_settlements(tenant_id,seller_id,settlement_no,period_start,period_end,gross_amount,commission_amount,adjustment_amount,net_amount,status) values($1,$2,$3,$4,$5,$6,$7,0,$8,'pending') returning *",[t.id,sellerId,settlementNo,periodStart.toISOString(),periodEnd.toISOString(),gross,commission,net]);
   for(const o of rows)await client.query("insert into seller_settlement_items(tenant_id,settlement_id,order_id,gross_amount,commission_amount,net_amount) values($1,$2,$3,$4,$5,$6)",[t.id,sr.rows[0].id,o.id,o.total_amount,o.commission_amount,o.seller_payable]);
   created.push(sr.rows[0]);
  }
  await client.query("insert into platform_audit_events(tenant_id,actor_user_id,action,entity_type,after_data) values($1,$2,'settlement.generated','seller_settlement',$3)",[t.id,(req as any).user.id,JSON.stringify({count:created.length,periodStart:periodStart.toISOString(),periodEnd:periodEnd.toISOString()})]);
  await client.query("commit");
  for(const item of created)await emitBusinessEvent({tenantId:t.id,eventKey:"settlement.generated",subjectType:"seller_settlement",subjectId:item.id,userId:(req as any).user.id,input:{settlementId:item.id,sellerId:item.seller_id,netAmount:Number(item.net_amount)}});
  res.status(201).json({items:created,total:created.length});
 }catch(e){await client.query("rollback");throw e;}finally{client.release();}
}));

settlementRouter.patch("/api/marketplace/settlements/:id/approve",requireAuth,requirePermission("settlement:manage"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const client=await pool.connect();
 try{
  await client.query("begin");
  const r=await client.query("update seller_settlements set status='approved',updated_at=now() where id=$1 and tenant_id=$2 and status='pending' returning *",[req.params.id,t.id]);
  if(!r.rowCount){await client.query("rollback");return res.status(409).json({error:"تسویه در وضعیت قابل تأیید نیست"});}
  await client.query("insert into platform_audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,after_data) values($1,$2,'settlement.approved','seller_settlement',$3,$4)",[t.id,(req as any).user.id,r.rows[0].id,JSON.stringify(r.rows[0])]);
  await client.query("commit");
  await emitBusinessEvent({tenantId:t.id,eventKey:"settlement.approved",subjectType:"seller_settlement",subjectId:r.rows[0].id,userId:(req as any).user.id,input:{settlementId:r.rows[0].id,netAmount:Number(r.rows[0].net_amount)}});
  res.json(r.rows[0]);
 }catch(e){await client.query("rollback");throw e;}finally{client.release();}
}));

settlementRouter.post("/api/marketplace/settlements/:id/pay",requireAuth,requirePermission("settlement:manage"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const client=await pool.connect();
 try{
  await client.query("begin");
  const r=await client.query("select * from seller_settlements where id=$1 and tenant_id=$2 for update",[req.params.id,t.id]);
  if(!r.rowCount)return res.status(404).json({error:"تسویه پیدا نشد"});
  const settlement=r.rows[0];
  if(settlement.status!=="approved")return res.status(409).json({error:"فقط تسویه تأییدشده قابل پرداخت است"});
  const entryId=await postLedgerEntry(client,{tenantId:t.id,entryNo:"SET-"+settlement.settlement_no,sourceType:"seller_settlement",sourceId:settlement.id,description:"پرداخت تسویه فروشنده "+settlement.settlement_no,createdBy:(req as any).user.id,lines:[
   {accountCode:"2101",accountName:"بستانکاران فروشندگان",accountType:"liability",debit:Number(settlement.net_amount)},
   {accountCode:"1101",accountName:"حساب پرداخت‌های پلتفرم",accountType:"asset",credit:Number(settlement.net_amount)}
  ]});
  const paidRef=s(req.body?.paymentRef,160)||null;
  const u=await client.query("update seller_settlements set status='paid',updated_at=now() where id=$1 and tenant_id=$2 and status='approved' returning *",[settlement.id,t.id]);
  await client.query("insert into platform_audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,after_data) values($1,$2,'settlement.paid','seller_settlement',$3,$4)",[t.id,(req as any).user.id,settlement.id,JSON.stringify({settlement:u.rows[0],ledgerEntryId:entryId,paymentRef:paidRef})]);
  await client.query("commit");
  await emitBusinessEvent({tenantId:t.id,eventKey:"settlement.paid",subjectType:"seller_settlement",subjectId:u.rows[0].id,userId:(req as any).user.id,input:{settlementId:u.rows[0].id,netAmount:Number(u.rows[0].net_amount),ledgerEntryId:entryId}});
  res.json({settlement:u.rows[0],ledgerEntryId:entryId,paymentRef:paidRef});
 }catch(e){await client.query("rollback");throw e;}finally{client.release();}
}));

settlementRouter.get("/api/ledger/accounts",requireAuth,requirePermission("ledger:view"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const r=await query("select * from ledger_accounts where tenant_id=$1 order by code",[t.id]);res.json(r.rows);
}));

settlementRouter.get("/api/ledger/entries",requireAuth,requirePermission("ledger:view"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const r=await query("select e.*,coalesce(json_agg(json_build_object('account_id',l.account_id,'account_code',a.code,'account_name',a.name,'debit',l.debit,'credit',l.credit,'description',l.description) order by a.code) filter(where l.id is not null),'[]') as lines from ledger_entries e left join ledger_lines l on l.entry_id=e.id left join ledger_accounts a on a.id=l.account_id where e.tenant_id=$1 group by e.id order by e.posted_at desc",[t.id]);
 res.json(r.rows);
}));

settlementRouter.get("/api/marketplace/settlements/delivery-reconciliation",requireAuth,requirePermission("settlement:view"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const r=await query(`
  select
   o.id as order_id,o.order_no,o.status as order_status,o.currency,o.total_amount,o.shipping_amount,o.commission_amount,o.seller_payable,o.created_at,
   s.display_name as seller_name,
   so.id as supply_order_id,so.order_no as logistics_order_no,so.status as supply_order_status,
   sh.id as shipment_id,sh.shipment_no,sh.status as shipment_status,sh.tracking_code,sh.dispatch_at,sh.delivered_at,
   ss.id as settlement_id,ss.settlement_no,ss.status as settlement_status,ss.net_amount as settlement_net_amount,
   case
    when so.id is null then 'logistics_not_created'
    when sh.id is null then 'shipment_not_created'
    when sh.status in ('failed','cancelled') then 'delivery_exception'
    when sh.status='delivered' then 'delivered'
    else 'shipment_in_progress'
   end as delivery_reconciliation_status
  from marketplace_orders o
  left join sellers s on s.id=o.seller_id and s.tenant_id=o.tenant_id
  left join logistics_supply_orders so on so.tenant_id=o.tenant_id and so.marketplace_order_id=o.id
  left join lateral (
   select x.id,x.shipment_no,x.status,x.tracking_code,x.dispatch_at,x.delivered_at
   from logistics_shipments x
   where x.tenant_id=o.tenant_id and x.supply_order_id=so.id
   order by x.created_at desc,x.id desc
   limit 1
  ) sh on true
  left join seller_settlement_items si on si.tenant_id=o.tenant_id and si.order_id=o.id
  left join seller_settlements ss on ss.id=si.settlement_id and ss.tenant_id=o.tenant_id
  where o.tenant_id=$1 and o.status='paid'
  order by o.created_at desc
  limit 200
 `,[t.id]);
 res.json({items:r.rows,limit:200,readOnly:true});
}));


settlementRouter.get("/api/marketplace/settlements/order-cost-analysis",requireAuth,requirePermission("settlement:view"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const validDate=(v:unknown)=>{
  if(typeof v!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;
  const d=new Date(v+"T00:00:00Z");
  return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===v;
 };
 if(req.query.from&&!validDate(req.query.from))return res.status(400).json({error:"تاریخ شروع گزارش معتبر نیست"});
 if(req.query.to&&!validDate(req.query.to))return res.status(400).json({error:"تاریخ پایان گزارش معتبر نیست"});
 const from=req.query.from?String(req.query.from):"1900-01-01";
 const to=req.query.to?String(req.query.to):"2999-12-31";
 if(from>to)return res.status(400).json({error:"بازه تاریخ گزارش معتبر نیست"});
 const params=[t.id,from,to];
 const base=String.raw`
  select o.id order_id,o.order_no,o.status order_status,o.currency,o.created_at,o.total_amount,o.discount_amount,o.shipping_amount,
   o.commission_amount recorded_commission,o.seller_payable,
   coalesce(rf.refunded_amount,0)::numeric refunded_amount,
   coalesce(rf.refund_count,0)::int refund_count,
   coalesce(sc.settled_commission,0)::numeric settled_commission,
   coalesce(sc.paid_settlement_count,0)::int paid_settlement_count,
   coalesce(fc.posted_freight_cost,0)::numeric posted_freight_cost,
   coalesce(fc.posted_freight_invoice_count,0)::int posted_freight_invoice_count,
   coalesce(rt.return_request_count,0)::int return_request_count,
   coalesce(rt.received_or_inspected_quantity,0)::numeric received_or_inspected_quantity,
   null::numeric cost_of_goods,
   'not_linked_to_marketplace_order'::text cost_of_goods_status,
   'incomplete'::text profit_status
  from marketplace_orders o
  left join lateral (
   select sum(r.amount)::numeric refunded_amount,count(*)::int refund_count
   from marketplace_refunds r
   where r.tenant_id=o.tenant_id and r.order_id=o.id and r.status='refunded'
  ) rf on true
  left join lateral (
   select sum(si.commission_amount)::numeric settled_commission,count(distinct ss.id)::int paid_settlement_count
   from seller_settlement_items si
   join seller_settlements ss on ss.id=si.settlement_id and ss.tenant_id=si.tenant_id and ss.status='paid'
   where si.tenant_id=o.tenant_id and si.order_id=o.id
  ) sc on true
  left join lateral (
   select sum(a.allocated_amount)::numeric posted_freight_cost,count(distinct i.id)::int posted_freight_invoice_count
   from logistics_carrier_invoice_shipments a
   join logistics_carrier_invoices i on i.id=a.invoice_id and i.tenant_id=a.tenant_id and i.status='posted'
   join accounting_documents d on d.id=i.accounting_document_id and d.tenant_id=i.tenant_id and d.status='posted'
   join logistics_shipments sh on sh.id=a.shipment_id and sh.tenant_id=a.tenant_id
   join logistics_supply_orders so on so.id=sh.supply_order_id and so.tenant_id=sh.tenant_id
   where a.tenant_id=o.tenant_id and so.marketplace_order_id=o.id and i.currency=o.currency
  ) fc on true
  left join lateral (
   select count(*)::int return_request_count,
    coalesce(sum(case when rr.status in ('received','inspected','closed') then rr.requested_quantity else 0 end),0)::numeric received_or_inspected_quantity
   from marketplace_return_requests rr
   where rr.tenant_id=o.tenant_id and rr.order_id=o.id and rr.status not in ('rejected','cancelled')
  ) rt on true
  where o.tenant_id=$1 and o.created_at >= $2::date and o.created_at < ($3::date + interval '1 day')
 `;
 const [items,summary]=await Promise.all([
  query(base+` order by o.created_at desc,o.order_no limit 500`,params),
  query(`select currency,count(*)::int order_count,sum(total_amount)::numeric order_total,
    sum(discount_amount)::numeric discount_amount,sum(shipping_amount)::numeric shipping_amount,
    sum(commission_amount)::numeric recorded_commission,sum(seller_payable)::numeric seller_payable
   from marketplace_orders where tenant_id=$1 and created_at >= $2::date and created_at < ($3::date + interval '1 day')
   group by currency order by currency`,params)
 ]);
 res.json({from,to,items:items.rows,summary:summary.rows,limit:500,readOnly:true,
  basis:{refunds:"marketplace_refunds.status=refunded",settledCommission:"seller_settlements.status=paid",freight:"carrier invoice and linked accounting document both posted",costOfGoods:"not linked to marketplace order in current verified flow"},
  limitation:"This is a component reconciliation, not a profit report. Cost of goods is unavailable because the posted financial inventory cost layer is not linked to marketplace order issue documents. Recorded order commission is shown separately from commission included in paid seller settlements. Currency groups are not combined."
 });
}));


settlementRouter.get("/api/marketplace/settlements/financial-issue-link-audit",requireAuth,requirePermission("settlement:view"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const validDate=(v:unknown)=>typeof v==="string"&&/^\\d{4}-\\d{2}-\\d{2}$/.test(v)&&!Number.isNaN(new Date(v+"T00:00:00Z").getTime())&&new Date(v+"T00:00:00Z").toISOString().slice(0,10)===v;
 if(req.query.from&&!validDate(req.query.from))return res.status(400).json({error:"تاریخ شروع گزارش معتبر نیست"});
 if(req.query.to&&!validDate(req.query.to))return res.status(400).json({error:"تاریخ پایان گزارش معتبر نیست"});
 const from=req.query.from?String(req.query.from):"1900-01-01";
 const to=req.query.to?String(req.query.to):"2999-12-31";
 if(from>to)return res.status(400).json({error:"بازه تاریخ گزارش معتبر نیست"});
 const params=[t.id,from,to];
 const [reservations,documents,sourceTypes]=await Promise.all([
  query(`
   select o.id order_id,o.order_no,mir.supply_order_id,mir.marketplace_product_id,
    p.sku marketplace_sku,p.title marketplace_product_title,mir.inventory_product_id,
    ip.sku inventory_sku,mir.warehouse_id operational_warehouse_id,
    mir.quantity::text consumed_quantity,count(*)::int reservation_count
   from marketplace_inventory_reservations mir
   join marketplace_orders o on o.id=mir.marketplace_order_id and o.tenant_id=mir.tenant_id
   join products p on p.id=mir.marketplace_product_id and p.tenant_id=mir.tenant_id
   join inventory_products ip on ip.id=mir.inventory_product_id and ip.tenant_id=mir.tenant_id
   where mir.tenant_id=$1 and mir.status='consumed'
    and o.created_at >= $2::date and o.created_at < ($3::date + interval '1 day')
   group by o.id,o.order_no,mir.supply_order_id,mir.marketplace_product_id,p.sku,p.title,
    mir.inventory_product_id,ip.sku,mir.warehouse_id,mir.quantity
   order by o.created_at desc,o.order_no,mir.marketplace_product_id,mir.warehouse_id
   limit 2000
  `,params),
  query(`
   with allocation_totals as (
    select a.tenant_id,il.document_id,count(*)::int allocation_count,
     sum(a.total_cost)::numeric allocated_cost,
     array_agg(distinct a.valuation_method order by a.valuation_method) valuation_methods
    from finance_cost_layer_allocations a
    join finance_inventory_lines il on il.id=a.issue_document_line_id
    where a.tenant_id=$1 group by a.tenant_id,il.document_id
   )
   select d.id document_id,d.document_no,d.document_date,d.posted_at,d.warehouse_id,
    w.code warehouse_code,w.title warehouse_title,d.source_type,d.source_id,
    mo.id source_id_order_match,mo.order_no matched_order_no,
    count(distinct il.id)::int line_count,count(distinct il.product_id)::int product_count,
    coalesce(at.allocation_count,0)::int allocation_count,
    coalesce(at.allocated_cost,0)::text allocated_cost,
    coalesce(at.valuation_methods,'{}'::text[]) valuation_methods
   from finance_inventory_documents d
   join finance_warehouses w on w.id=d.warehouse_id and w.tenant_id=d.tenant_id
   left join finance_inventory_lines il on il.document_id=d.id
   left join allocation_totals at on at.tenant_id=d.tenant_id and at.document_id=d.id
   left join marketplace_orders mo on mo.tenant_id=d.tenant_id and mo.id=d.source_id
   where d.tenant_id=$1 and d.document_type='issue' and d.status='posted'
    and d.document_date between $2::date and $3::date
   group by d.id,d.document_no,d.document_date,d.posted_at,d.warehouse_id,w.code,w.title,
    d.source_type,d.source_id,mo.id,mo.order_no,at.allocation_count,at.allocated_cost,at.valuation_methods
   order by d.posted_at desc nulls last,d.document_date desc,d.document_no desc limit 500
  `,params),
  query(`
   select coalesce(d.source_type,'(بدون نوع منبع)') source_type,count(*)::int document_count,
    count(*) filter(where d.source_id is null)::int missing_source_id_count
   from finance_inventory_documents d
   where d.tenant_id=$1 and d.document_type='issue' and d.status='posted'
    and d.document_date between $2::date and $3::date
   group by d.source_type order by document_count desc,d.source_type
  `,params)
 ]);
 res.json({from,to,reservations:reservations.rows,documents:documents.rows,sourceTypes:sourceTypes.rows,
  limits:{reservationRows:2000,issueDocuments:500},readOnly:true,
  interpretation:"source_id_order_match فقط برابری شناسه منبع با شناسه سفارش را نشان می‌دهد و به‌تنهایی رابطه تجاری معتبر را اثبات نمی‌کند. تا زمانی که نوع منبع و رابطه قلم سفارش/رزرو/قلم خروج به‌صورت صریح تأیید نشوند، بهای تمام‌شده به سفارش نسبت داده نمی‌شود."});
}));


settlementRouter.get("/api/marketplace/settlements/cogs-accounting-readiness",requireAuth,requirePermission("accounting-finance.read"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const issueDocumentId=s(req.query.issueDocumentId,64);
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(issueDocumentId))return res.status(400).json({error:"شناسه سند خروج معتبر نیست"});
 const doc=(await query(`
  select d.id,d.document_no,d.document_date,d.status,d.document_type,d.source_type,d.source_id,
   d.warehouse_id,w.code warehouse_code,w.title warehouse_title,
   o.id matched_order_id,o.order_no matched_order_no,o.currency order_currency
  from finance_inventory_documents d
  join finance_warehouses w on w.id=d.warehouse_id and w.tenant_id=d.tenant_id
  left join marketplace_orders o on o.tenant_id=d.tenant_id and o.id::text=d.source_id::text
  where d.id=$1 and d.tenant_id=$2 and d.document_type='issue'
 `,[issueDocumentId,t.id])).rows[0];
 if(!doc)return res.status(404).json({error:"سند خروج مالی در سازمان جاری پیدا نشد"});
 const [allocation,books,accounts,existing]=await Promise.all([
  query(`
   select count(*)::int line_count,
    count(*) filter(where coalesce(a.allocated_quantity,0)>=il.quantity)::int fully_allocated_line_count,
    count(*) filter(where coalesce(a.allocated_quantity,0)<il.quantity)::int incomplete_line_count,
    coalesce(sum(il.quantity),0)::text issue_quantity,
    coalesce(sum(coalesce(a.allocated_quantity,0)),0)::text allocated_quantity,
    coalesce(sum(coalesce(a.allocated_cost,0)),0)::text allocated_cost,
    count(distinct a.valuation_method)::int valuation_method_count,
    coalesce(array_agg(distinct a.valuation_method) filter(where a.valuation_method is not null),'{}'::text[]) valuation_methods
   from finance_inventory_lines il
   left join lateral(
    select sum(x.quantity)::numeric allocated_quantity,sum(x.total_cost)::numeric allocated_cost,
     min(x.valuation_method) valuation_method
    from finance_cost_layer_allocations x
    where x.tenant_id=$2 and x.issue_document_line_id=il.id
   ) a on true
   where il.document_id=$1
  `,[issueDocumentId,t.id]),
  query(`
   select b.id,b.code,b.title,b.book_mode,b.currency,b.is_default,
    p.id matching_period_id,p.code period_code,p.title period_title,p.status period_status,
    p.starts_on,p.ends_on
   from accounting_books b
   left join accounting_fiscal_periods p on p.book_id=b.id and p.tenant_id=b.tenant_id
    and $2::date between p.starts_on and p.ends_on
   where b.tenant_id=$1 and b.status='active'
   order by b.is_default desc,b.code,p.starts_on desc
   limit 100
  `,[t.id,doc.document_date]),
  query(`
   select id,code,name,account_type,account_nature,normal_balance,book_id,account_mode,
    is_active,is_postable,status
   from ledger_accounts
   where tenant_id=$1 and status='active' and is_active=true and is_postable=true
    and account_nature in ('asset','expense')
   order by account_nature,code limit 200
  `,[t.id]),
  query(`
   select id,document_no,document_date,status,book_id,period_id,posted_at
   from accounting_documents
   where tenant_id=$1 and source_type='marketplace-cogs-issue'
    and source_id=$2::text
   order by created_at desc limit 10
  `,[t.id,issueDocumentId])
 ]);
 const a=allocation.rows[0]||{};
 const orderLinkVerified=doc.source_type==="marketplace_order"&&Boolean(doc.matched_order_id);
 const fullAllocation=Number(a.line_count)>0&&Number(a.incomplete_line_count)===0;
 const openPeriodBooks=books.rows.filter((b:any)=>b.matching_period_id&&b.period_status==="open");
 const blockedReasons:string[]=[];
 if(doc.status!=="posted")blockedReasons.push("سند خروج هنوز قطعی نشده است");
 if(!orderLinkVerified)blockedReasons.push("منبع سند خروج به‌صورت صریح و قابل تأیید به سفارش بازارگاه متصل نیست");
 blockedReasons.push("ارتباط تک‌تک اقلام سفارش با اقلام سند خروج هنوز ثبت و تأیید نشده است");
 if(!fullAllocation)blockedReasons.push("تمام اقلام سند خروج تخصیص کامل بهای تمام‌شده ندارند");
 if(!openPeriodBooks.length)blockedReasons.push("برای تاریخ سند خروج، دفتر فعال با دوره مالی باز پیدا نشد");
 if(!accounts.rows.some((x:any)=>x.account_nature==="asset"))blockedReasons.push("حساب فعال و قابل ثبت با ماهیت دارایی پیدا نشد");
 if(!accounts.rows.some((x:any)=>x.account_nature==="expense"))blockedReasons.push("حساب فعال و قابل ثبت با ماهیت هزینه پیدا نشد");
 if(existing.rows.some((x:any)=>x.status==="posted"))blockedReasons.push("سند حسابداری بهای کالا قبلاً قطعی شده است");
 res.json({document:doc,allocation:a,books:books.rows,openPeriodBookCount:openPeriodBooks.length,
  accountCandidates:accounts.rows,existingCogsDocuments:existing.rows,
  readiness:{orderLinkVerified,fullAllocation,openPeriodAvailable:openPeriodBooks.length>0,
   assetAccountAvailable:accounts.rows.some((x:any)=>x.account_nature==="asset"),
   expenseAccountAvailable:accounts.rows.some((x:any)=>x.account_nature==="expense"),
   existingPostedDocument:existing.rows.some((x:any)=>x.status==="posted"),
   draftCreationAllowed:false,postingAllowed:false,blockedReasons},
  limitations:"وجود حساب‌های دارایی و هزینه به معنی تعیین حساب معین موجودی و بهای کالای فروش‌رفته نیست. تا زمان ثبت نگاشت حسابداری صریح و رابطه قلم سفارش با قلم سند خروج، تولید سند خودکار مجاز نیست.",
  readOnly:true
 });
}));

settlementRouter.get("/api/marketplace/settlements/posted-issue-documents",requireAuth,requirePermission("settlement:view"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const result=await query(`
  select d.id,d.document_no,d.document_date,d.posted_at,d.warehouse_id,
   w.code warehouse_code,w.title warehouse_title,
   count(il.id)::int line_count,count(distinct il.product_id)::int product_count,
   coalesce(sum(il.quantity),0)::numeric total_quantity
  from finance_inventory_documents d
  join finance_warehouses w on w.id=d.warehouse_id and w.tenant_id=d.tenant_id
  left join finance_inventory_lines il on il.document_id=d.id
  where d.tenant_id=$1 and d.document_type='issue' and d.status='posted'
  group by d.id,w.code,w.title
  order by d.posted_at desc nulls last,d.document_date desc,d.document_no desc
  limit 100
 `,[t.id]);
 res.json({items:result.rows,total:result.rowCount||0,limit:100,readOnly:true});
}));

settlementRouter.get("/api/marketplace/settlements/cost-layer-allocation-preview",requireAuth,requirePermission("settlement:view"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const issueDocumentId=typeof req.query.issueDocumentId==="string"?req.query.issueDocumentId.trim():"";
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(issueDocumentId))
  return res.status(400).json({error:"شناسه UUID سند خروج مالی معتبر الزامی است"});
 const document=await query(`
  select d.id,d.document_no,d.document_date,d.document_type,d.status,d.warehouse_id,
   w.code warehouse_code,w.title warehouse_title,d.posted_at
  from finance_inventory_documents d
  join finance_warehouses w on w.id=d.warehouse_id and w.tenant_id=d.tenant_id
  where d.tenant_id=$1 and d.id=$2
 `,[t.id,issueDocumentId]);
 if(!document.rowCount)return res.status(404).json({error:"سند مالی در محدوده سازمانی جاری پیدا نشد"});
 const doc=document.rows[0];
 if(doc.document_type!=="issue"||doc.status!=="posted")
  return res.status(409).json({error:"پیش‌نمایش فقط برای سند خروج قطعی‌شده مجاز است"});
 const result=await query(`
  with issue_lines as (
   select il.id issue_line_id,il.product_id,il.quantity issue_quantity,
    il.unit_cost issue_line_unit_cost,fp.code product_code,fp.title product_title
   from finance_inventory_lines il
   join finance_products fp on fp.id=il.product_id and fp.tenant_id=$1
   where il.document_id=$2
  ),
  issue_allocations as (
   select a.issue_document_line_id,sum(a.quantity)::numeric allocated_quantity,
    count(*)::int allocation_count
   from finance_cost_layer_allocations a
   where a.tenant_id=$1 and a.issue_document_line_id in (select issue_line_id from issue_lines)
   group by a.issue_document_line_id
  ),
  layer_allocations as (
   select a.cost_layer_id,sum(a.quantity)::numeric allocated_quantity,
    count(*)::int allocation_count
   from finance_cost_layer_allocations a
   where a.tenant_id=$1
   group by a.cost_layer_id
  ),
  warehouse_methods as (
   select a.product_id,a.warehouse_id,count(distinct a.valuation_method)::int method_count,
    min(a.valuation_method) existing_method
   from finance_cost_layer_allocations a
   where a.tenant_id=$1 and a.warehouse_id=$3
   group by a.product_id,a.warehouse_id
  ),
  active_policies as (
   select p.product_id,p.warehouse_id,p.valuation_method
   from finance_cost_valuation_policies p
   where p.tenant_id=$1 and p.warehouse_id=$3 and p.status='active'
    and p.effective_from<=now() and (p.effective_to is null or p.effective_to>now())
  )
  select il.issue_line_id,il.product_id,il.product_code,il.product_title,
   il.issue_quantity,coalesce(ia.allocated_quantity,0)::numeric issue_allocated_quantity,
   greatest(il.issue_quantity-coalesce(ia.allocated_quantity,0),0)::numeric issue_unallocated_quantity,
   coalesce(ia.allocation_count,0)::int issue_allocation_count,
   cl.id cost_layer_id,cl.method valuation_method,cl.quantity layer_initial_quantity,
   coalesce(la.allocated_quantity,0)::numeric layer_allocated_quantity,
   greatest(cl.quantity-coalesce(la.allocated_quantity,0),0)::numeric layer_remaining_quantity,
   cl.unit_cost,cl.total_cost,cl.created_at layer_created_at,
   source_doc.id source_document_id,source_doc.document_no source_document_no,
   source_doc.document_type source_document_type,source_doc.document_date source_document_date,
   coalesce(wm.method_count,0)::int existing_warehouse_method_count,wm.existing_method,
   ap.valuation_method active_policy_method,
   case when coalesce(wm.method_count,0)>1 then 'mixed_existing_allocation_methods'
    when wm.existing_method is not null and wm.existing_method<>cl.method then 'existing_method_conflict'
    when ap.valuation_method is null then 'active_policy_missing'
    when ap.valuation_method<>cl.method then 'cost_layer_method_conflicts_with_active_policy'
    else 'eligible_under_active_policy' end as policy_decision,
   case when ap.valuation_method=cl.method and coalesce(wm.method_count,0)<=1
    and (wm.existing_method is null or wm.existing_method=cl.method)
    then least(greatest(il.issue_quantity-coalesce(ia.allocated_quantity,0),0),
     greatest(cl.quantity-coalesce(la.allocated_quantity,0),0))::numeric
    else 0::numeric end max_allocatable_quantity
  from issue_lines il
  left join issue_allocations ia on ia.issue_document_line_id=il.issue_line_id
  left join lateral (
   select layer.*
   from finance_cost_layers layer
   join finance_inventory_lines source_line on source_line.id=layer.inventory_document_line_id
   join finance_inventory_documents source_doc on source_doc.id=source_line.document_id
    and source_doc.tenant_id=layer.tenant_id
   left join layer_allocations la2 on la2.cost_layer_id=layer.id
   where layer.tenant_id=$1 and layer.product_id=il.product_id
    and source_doc.warehouse_id=$3 and source_doc.status='posted'
    and source_doc.document_type in ('receipt','return_receipt','adjustment')
    and source_line.product_id=layer.product_id
    and layer.quantity>coalesce(la2.allocated_quantity,0)
   order by layer.created_at,layer.id
  ) cl on true
  left join finance_inventory_lines source_line on source_line.id=cl.inventory_document_line_id
  left join finance_inventory_documents source_doc on source_doc.id=source_line.document_id
   and source_doc.tenant_id=$1
  left join layer_allocations la on la.cost_layer_id=cl.id
  left join warehouse_methods wm on wm.product_id=il.product_id and wm.warehouse_id=$3
  left join active_policies ap on ap.product_id=il.product_id and ap.warehouse_id=$3
  order by il.product_code,il.issue_line_id,cl.created_at,cl.id
 `,[t.id,issueDocumentId,doc.warehouse_id]);
 const lines=new Map<string,any>();
 for(const row of result.rows){
  let item=lines.get(row.issue_line_id);
  if(!item){
   item={issueLineId:row.issue_line_id,productId:row.product_id,productCode:row.product_code,productTitle:row.product_title,
    issueQuantity:row.issue_quantity,allocatedQuantity:row.issue_allocated_quantity,
    unallocatedQuantity:row.issue_unallocated_quantity,allocationCount:row.issue_allocation_count,candidates:[]};
   lines.set(row.issue_line_id,item);
  }
  if(row.cost_layer_id)item.candidates.push({
   costLayerId:row.cost_layer_id,method:row.valuation_method,initialQuantity:row.layer_initial_quantity,
   allocatedQuantity:row.layer_allocated_quantity,remainingQuantity:row.layer_remaining_quantity,
   unitCost:row.unit_cost,totalCost:row.total_cost,createdAt:row.layer_created_at,
   sourceDocument:{id:row.source_document_id,documentNo:row.source_document_no,type:row.source_document_type,date:row.source_document_date},
   existingWarehouseMethodCount:row.existing_warehouse_method_count,existingMethod:row.existing_method,
   activePolicyMethod:row.active_policy_method,policyDecision:row.policy_decision,maxAllocatableQuantity:row.max_allocatable_quantity
  });
 }
 const items=Array.from(lines.values()).map(item=>({...item,
  status:item.unallocatedQuantity<=0?"fully_allocated":item.candidates.length?"candidates_available":"no_eligible_cost_layers"}));
 res.json({document:doc,items,lineCount:items.length,readOnly:true,allocationEnabled:false,
  policy:{selected:false,automaticSelection:false,reason:"روش فعال و سازگار هر کالا/انبار در وضعیت هر لایه مشخص می‌شود؛ در نبود سیاست فعال یا هنگام تعارض روش، سقف قابل تخصیص صفر است."},
  limitation:"این پیش‌نمایش فقط سند خروج مالی را بررسی می‌کند و آن را به سفارش بازارگاه نسبت نمی‌دهد. مقدار قابل تخصیص سقف کنترلی هر جفت قلم/لایه است، نه دستور تخصیص یا ثبت مالی."});
}));


settlementRouter.post("/api/marketplace/settlements/:issueDocumentId/allocate-cost",requireAuth,requirePermission("accounting-finance.write"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const issueDocumentId=s(req.params.issueDocumentId,64);
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(issueDocumentId))
  return res.status(400).json({error:"شناسه سند خروج مالی معتبر نیست"});
 const client=await pool.connect();
 try{
  await client.query("begin");
  const document=await client.query("select id,warehouse_id,document_no,status,document_type from finance_inventory_documents where id=$1 and tenant_id=$2 for update",[issueDocumentId,t.id]);
  if(!document.rowCount){await client.query("rollback");return res.status(404).json({error:"سند خروج در محدوده سازمانی جاری پیدا نشد"})}
  const doc=document.rows[0];
  if(doc.document_type!=="issue"||doc.status!=="posted"){await client.query("rollback");return res.status(409).json({error:"فقط سند خروج قطعی‌شده قابل تخصیص است"})}
  const issueLines=await client.query("select id,product_id from finance_inventory_lines where document_id=$1 order by product_id,id for update",[issueDocumentId]);
  if(!issueLines.rowCount){await client.query("rollback");return res.status(409).json({error:"سند خروج قلمی برای تخصیص ندارد"})}
  const productIds=[...new Set(issueLines.rows.map((x:any)=>String(x.product_id)))].sort();
  for(const productId of productIds){
   await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))",[t.id+":"+productId+":"+doc.warehouse_id]);
  }
  await client.query(`
   select cl.id from finance_cost_layers cl
   join finance_inventory_lines sl on sl.id=cl.inventory_document_line_id
   join finance_inventory_documents sd on sd.id=sl.document_id and sd.tenant_id=cl.tenant_id
   where cl.tenant_id=$1 and cl.product_id=any($2::uuid[]) and sd.warehouse_id=$3
    and sd.status='posted' and sd.document_type in ('receipt','return_receipt','adjustment')
   order by cl.product_id,cl.created_at,cl.id for update of cl
  `,[t.id,productIds,doc.warehouse_id]);
  await client.query("select id from finance_cost_valuation_policies where tenant_id=$1 and warehouse_id=$2 and product_id=any($3::uuid[]) and status='active' and effective_from<=now() and (effective_to is null or effective_to>now()) order by product_id for share",[t.id,doc.warehouse_id,productIds]);
  const readiness=await client.query(`
   with demand as (
    select il.product_id,sum(il.quantity-coalesce(a.allocated_quantity,0))::numeric remaining_quantity
    from finance_inventory_lines il
    left join lateral(select sum(x.quantity)::numeric allocated_quantity from finance_cost_layer_allocations x
     where x.tenant_id=$1 and x.issue_document_line_id=il.id) a on true
    where il.document_id=$2 group by il.product_id
   ),
   policies as (
    select p.product_id,p.valuation_method from finance_cost_valuation_policies p
    where p.tenant_id=$1 and p.warehouse_id=$3 and p.status='active'
     and p.effective_from<=now() and (p.effective_to is null or p.effective_to>now())
   ),
   supply as (
    select cl.product_id,sum(cl.quantity-coalesce(a.allocated_quantity,0))::numeric remaining_quantity
    from finance_cost_layers cl
    join finance_inventory_lines sl on sl.id=cl.inventory_document_line_id
    join finance_inventory_documents sd on sd.id=sl.document_id and sd.tenant_id=cl.tenant_id
    left join lateral(select sum(x.quantity)::numeric allocated_quantity from finance_cost_layer_allocations x
     where x.tenant_id=$1 and x.cost_layer_id=cl.id) a on true
    where cl.tenant_id=$1 and cl.product_id=any($4::uuid[]) and cl.method='fifo'
     and sd.warehouse_id=$3 and sd.status='posted'
     and sd.document_type in ('receipt','return_receipt','adjustment')
     and sl.product_id=cl.product_id
    group by cl.product_id
   )
   select d.product_id,d.remaining_quantity::text demand_quantity,p.valuation_method,
    coalesce(s.remaining_quantity,0)::text supply_quantity,
    (p.valuation_method='fifo' and coalesce(s.remaining_quantity,0)>=d.remaining_quantity) ready
   from demand d left join policies p on p.product_id=d.product_id
   left join supply s on s.product_id=d.product_id
   where d.remaining_quantity>0
  `,[t.id,issueDocumentId,doc.warehouse_id,productIds]);
  const blocked=readiness.rows.filter((x:any)=>!x.ready);
  if(blocked.length){
   await client.query("rollback");
   return res.status(409).json({error:"تخصیص خودکار فعلاً فقط برای روش FIFO و در صورت کفایت کامل لایه‌های ورودی مجاز است؛ برای برخی کالاها سیاست یا موجودی سازگار وجود ندارد",blocked:blocked.map((x:any)=>({productId:x.product_id,method:x.valuation_method||null,demandQuantity:x.demand_quantity,supplyQuantity:x.supply_quantity}))});
  }
  if(!readiness.rowCount){
   const existing=await client.query(`
    select count(*)::int allocation_count,coalesce(sum(a.total_cost),0)::text total_cost
    from finance_cost_layer_allocations a
    join finance_inventory_lines il on il.id=a.issue_document_line_id
    where a.tenant_id=$1 and il.document_id=$2
   `,[t.id,issueDocumentId]);
   await client.query("commit");
   return res.json({documentId:issueDocumentId,createdCount:0,allocationCount:existing.rows[0].allocation_count,totalCost:existing.rows[0].total_cost,idempotent:true});
  }
  const inserted=await client.query(`
   with issue_rows as (
    select il.id issue_line_id,il.product_id,
     (il.quantity-coalesce(sum(a.quantity),0))::numeric remaining_quantity
    from finance_inventory_lines il
    left join finance_cost_layer_allocations a on a.tenant_id=$1 and a.issue_document_line_id=il.id
    where il.document_id=$2
    group by il.id,il.product_id,il.quantity
    having il.quantity-coalesce(sum(a.quantity),0)>0
   ),
   issue_spans as (
    select *,sum(remaining_quantity) over(partition by product_id order by issue_line_id rows unbounded preceding) issue_end
    from issue_rows
   ),
   issue_intervals as (
    select *,issue_end-remaining_quantity issue_start from issue_spans
   ),
   layer_rows as (
    select cl.id cost_layer_id,cl.product_id,cl.unit_cost,cl.created_at,
     (cl.quantity-coalesce(sum(a.quantity),0))::numeric remaining_quantity
    from finance_cost_layers cl
    join finance_inventory_lines sl on sl.id=cl.inventory_document_line_id
    join finance_inventory_documents sd on sd.id=sl.document_id and sd.tenant_id=cl.tenant_id
    left join finance_cost_layer_allocations a on a.tenant_id=$1 and a.cost_layer_id=cl.id
    where cl.tenant_id=$1 and cl.product_id=any($3::uuid[]) and cl.method='fifo'
     and sd.warehouse_id=$4 and sd.status='posted'
     and sd.document_type in ('receipt','return_receipt','adjustment')
     and sl.product_id=cl.product_id
    group by cl.id,cl.product_id,cl.unit_cost,cl.created_at,cl.quantity
    having cl.quantity-coalesce(sum(a.quantity),0)>0
   ),
   layer_spans as (
    select *,sum(remaining_quantity) over(partition by product_id order by created_at,cost_layer_id rows unbounded preceding) layer_end
    from layer_rows
   ),
   layer_intervals as (
    select *,layer_end-remaining_quantity layer_start from layer_spans
   ),
   allocation_plan as (
    select i.issue_line_id,i.product_id,l.cost_layer_id,l.unit_cost,
     (least(i.issue_end,l.layer_end)-greatest(i.issue_start,l.layer_start))::numeric allocation_quantity
    from issue_intervals i join layer_intervals l on l.product_id=i.product_id
     and i.issue_end>l.layer_start and l.layer_end>i.issue_start
   )
   insert into finance_cost_layer_allocations
    (tenant_id,product_id,warehouse_id,cost_layer_id,issue_document_line_id,valuation_method,quantity,unit_cost,total_cost,idempotency_key,created_by)
   select $1,product_id,$4,cost_layer_id,issue_line_id,'fifo',allocation_quantity,unit_cost,
    round(allocation_quantity*unit_cost,4),
    'fifo:'||$2::text||':'||issue_line_id::text||':'||cost_layer_id::text,$5
   from allocation_plan where allocation_quantity>0
   order by product_id,issue_line_id,cost_layer_id
   returning id,product_id,issue_document_line_id,cost_layer_id,quantity,total_cost
  `,[t.id,issueDocumentId,productIds,doc.warehouse_id,(req as any).user.id]);
  const total=await client.query("select count(*)::int allocation_count,coalesce(sum(total_cost),0)::text total_cost from finance_cost_layer_allocations where tenant_id=$1 and issue_document_line_id=any($2::uuid[])",[t.id,issueLines.rows.map((x:any)=>x.id)]);
  await client.query("insert into platform_audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,after_data) values($1,$2,'finance.cost_layer_allocated','finance_inventory_document',$3,$4)",[t.id,(req as any).user.id,issueDocumentId,JSON.stringify({createdCount:inserted.rowCount||0,allocationCount:total.rows[0].allocation_count,totalCost:total.rows[0].total_cost,method:"fifo"})]);
  await client.query("commit");
  res.status(201).json({documentId:issueDocumentId,createdCount:inserted.rowCount||0,allocationCount:total.rows[0].allocation_count,totalCost:total.rows[0].total_cost,method:"fifo",items:inserted.rows});
 }catch(e:any){
  await client.query("rollback");
  if(e?.code==="23505")return res.status(409).json({error:"برای این سند قبلاً تخصیص ثبت شده یا کلید تکراری وجود دارد؛ دفتر تخصیص غیرقابل‌تغییر است"});
  if(e?.code==="P0001")return res.status(409).json({error:"کنترل‌های پایگاه داده تخصیص را رد کردند",detail:s(e?.message,300)});
  throw e;
 }finally{client.release()}
}));

settlementRouter.get("/api/marketplace/settlements/costing-readiness",requireAuth,requirePermission("settlement:view"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const validDate=(v:unknown)=>{
  if(typeof v!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;
  const d=new Date(v+"T00:00:00Z");
  return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===v;
 };
 if(req.query.from&&!validDate(req.query.from))return res.status(400).json({error:"تاریخ شروع گزارش معتبر نیست"});
 if(req.query.to&&!validDate(req.query.to))return res.status(400).json({error:"تاریخ پایان گزارش معتبر نیست"});
 const from=req.query.from?String(req.query.from):"1900-01-01";
 const to=req.query.to?String(req.query.to):"2999-12-31";
 if(from>to)return res.status(400).json({error:"بازه تاریخ گزارش معتبر نیست"});
 const params=[t.id,from,to];
 const result=await query(`
  with selected_orders as (
   select o.id,o.order_no,o.currency,o.created_at
   from marketplace_orders o
   where o.tenant_id=$1 and o.created_at >= $2::date and o.created_at < ($3::date + interval '1 day')
   order by o.created_at desc,o.order_no limit 500
  ),
  consumed as (
   select mir.tenant_id,mir.marketplace_order_id,mir.marketplace_product_id,
    sum(mir.quantity)::numeric consumed_quantity,count(*)::int consumed_reservation_count,
    count(distinct mir.warehouse_id)::int consumed_warehouse_count,
    count(distinct mir.warehouse_id) filter(where mfw.finance_warehouse_id is not null)::int mapped_operational_warehouse_count,
    count(distinct mfw.finance_warehouse_id)::int mapped_finance_warehouse_count,
    coalesce(array_agg(distinct mfw.finance_warehouse_id) filter(where mfw.finance_warehouse_id is not null),'{}'::uuid[]) mapped_finance_warehouse_ids
   from marketplace_inventory_reservations mir
   left join marketplace_finance_warehouse_links mfw
    on mfw.tenant_id=mir.tenant_id and mfw.inventory_warehouse_id=mir.warehouse_id and mfw.status='active'
   where mir.tenant_id=$1 and mir.status='consumed'
   group by mir.tenant_id,mir.marketplace_order_id,mir.marketplace_product_id
  ),
  posted_layers as (
   select cl.tenant_id,cl.product_id,fid.warehouse_id,count(*)::int posted_layer_count,
    sum(cl.quantity)::numeric posted_layer_quantity,
    count(distinct cl.method)::int posted_layer_method_count,
    array_agg(distinct cl.method order by cl.method) as posted_layer_methods
   from finance_cost_layers cl
   join finance_inventory_lines fil on fil.id=cl.inventory_document_line_id
   join finance_inventory_documents fid on fid.id=fil.document_id
    and fid.tenant_id=cl.tenant_id and fid.status='posted'
   where cl.tenant_id=$1 and cl.quantity>0
   group by cl.tenant_id,cl.product_id,fid.warehouse_id
  ),
  financial_balances as (
   select c.tenant_id,c.marketplace_order_id,c.marketplace_product_id,
    count(fib.id)::int financial_inventory_balance_row_count,
    coalesce(sum(fib.quantity),0)::numeric financial_inventory_quantity,
    coalesce(sum(fib.reserved_quantity),0)::numeric financial_inventory_reserved_quantity,
    coalesce(sum(fib.value_amount),0)::numeric financial_inventory_value_amount
   from consumed c
   join marketplace_inventory_product_links mil on mil.tenant_id=c.tenant_id
    and mil.product_id=c.marketplace_product_id and mil.status='active'
   join marketplace_finance_product_links fpl on fpl.tenant_id=c.tenant_id
    and fpl.inventory_product_id=mil.inventory_product_id and fpl.status='active'
   left join finance_inventory_balances fib on fib.tenant_id=c.tenant_id
    and fib.product_id=fpl.finance_product_id and fib.warehouse_id=any(c.mapped_finance_warehouse_ids)
   group by c.tenant_id,c.marketplace_order_id,c.marketplace_product_id
  ),
  matching_layers as (
   select c.tenant_id,c.marketplace_order_id,c.marketplace_product_id,
    coalesce(sum(pl.posted_layer_count),0)::int posted_layer_count,
    coalesce(sum(pl.posted_layer_quantity),0)::numeric posted_layer_quantity,
    count(distinct method_name)::int posted_layer_method_count,
    coalesce(array_agg(distinct method_name order by method_name) filter(where method_name is not null),'{}'::text[]) posted_layer_methods
   from consumed c
   left join posted_layers pl on pl.tenant_id=c.tenant_id
    and pl.product_id=(select fpl.finance_product_id from marketplace_finance_product_links fpl
      where fpl.tenant_id=c.tenant_id and fpl.inventory_product_id=(
       select mil.inventory_product_id from marketplace_inventory_product_links mil
       where mil.tenant_id=c.tenant_id and mil.product_id=c.marketplace_product_id and mil.status='active'
      ) and fpl.status='active')
    and pl.warehouse_id=any(c.mapped_finance_warehouse_ids)
   left join lateral unnest(pl.posted_layer_methods) as methods(method_name) on true
   group by c.tenant_id,c.marketplace_order_id,c.marketplace_product_id
  )
  select so.id order_id,so.order_no,so.currency,so.created_at,
   oi.id order_item_id,oi.product_id marketplace_product_id,p.sku marketplace_sku,p.title marketplace_product_title,
   oi.quantity ordered_quantity,
   mil.inventory_product_id,ip.sku inventory_sku,
   coalesce(mil.quantity_factor,1)::numeric inventory_quantity_factor,
   coalesce(c.consumed_quantity,0)::numeric consumed_inventory_quantity,
   coalesce(c.consumed_reservation_count,0)::int consumed_reservation_count,
   coalesce(c.consumed_warehouse_count,0)::int consumed_warehouse_count,
   coalesce(c.mapped_operational_warehouse_count,0)::int mapped_operational_warehouse_count,
   coalesce(c.mapped_finance_warehouse_count,0)::int mapped_finance_warehouse_count,
   coalesce(fb.financial_inventory_balance_row_count,0)::int financial_inventory_balance_row_count,
   coalesce(fb.financial_inventory_quantity,0)::numeric financial_inventory_quantity,
   coalesce(fb.financial_inventory_reserved_quantity,0)::numeric financial_inventory_reserved_quantity,
   coalesce(fb.financial_inventory_value_amount,0)::numeric financial_inventory_value_amount,
   fpl.finance_product_id,fp.code finance_product_code,fp.title finance_product_title,
   coalesce(pl.posted_layer_count,0)::int posted_cost_layer_count,
   coalesce(pl.posted_layer_quantity,0)::numeric posted_cost_layer_quantity,
   coalesce(pl.posted_layer_method_count,0)::int posted_cost_layer_method_count,
   coalesce(pl.posted_layer_methods,'{}'::text[]) posted_cost_layer_methods,
   case when ip.id is null then 'missing_inventory_product_mapping'
    when fpl.finance_product_id is null then 'missing_finance_product_mapping'
    when coalesce(c.consumed_quantity,0)+0.000001 < oi.quantity*coalesce(mil.quantity_factor,1) then 'inventory_not_fully_consumed'
    when coalesce(c.mapped_operational_warehouse_count,0)<coalesce(c.consumed_warehouse_count,0) then 'missing_finance_warehouse_mapping'
    when coalesce(pl.posted_layer_count,0)=0 then 'missing_posted_finance_cost_layers_at_consumed_warehouse'
    when coalesce(pl.posted_layer_method_count,0)>1 then 'mixed_cost_layer_valuation_methods'
    else 'cost_layers_present_financial_issue_link_pending' end as costing_readiness,
   case
    when delivery.supply_order_id is null then 'logistics_order_missing'
    when delivery.supply_order_status not in ('shipped','delivered') then 'supply_order_not_shipped'
    when delivery.shipment_id is null then 'shipment_missing'
    when delivery.shipment_status in ('failed','cancelled') then 'shipment_exception'
    when delivery.dispatch_at is null then 'shipment_dispatch_timestamp_missing'
    else 'shipment_dispatched_financial_issue_pending'
   end as dispatch_readiness,
   delivery.supply_order_status,delivery.shipment_status,delivery.dispatch_at,
   'not_calculated'::text cost_of_goods_status
  from selected_orders so
  join marketplace_order_items oi on oi.order_id=so.id
  left join lateral (
   select supply.id supply_order_id,supply.status supply_order_status,
    shipment.id shipment_id,shipment.status shipment_status,shipment.dispatch_at
   from logistics_supply_orders supply
   left join lateral (
    select sh.id,sh.status,sh.dispatch_at
    from logistics_shipments sh
    where sh.tenant_id=supply.tenant_id and sh.supply_order_id=supply.id
    order by sh.created_at desc,sh.id desc limit 1
   ) shipment on true
   where supply.tenant_id=$1 and supply.marketplace_order_id=so.id
   order by supply.created_at desc,supply.id desc limit 1
  ) delivery on true
  join products p on p.id=oi.product_id and p.tenant_id=$1
  left join marketplace_inventory_product_links mil on mil.tenant_id=$1 and mil.product_id=oi.product_id and mil.status='active'
  left join inventory_products ip on ip.id=mil.inventory_product_id and ip.tenant_id=$1
  left join consumed c on c.tenant_id=$1 and c.marketplace_order_id=so.id and c.marketplace_product_id=oi.product_id
  left join financial_balances fb on fb.tenant_id=$1 and fb.marketplace_order_id=so.id and fb.marketplace_product_id=oi.product_id
  left join marketplace_finance_product_links fpl on fpl.tenant_id=$1 and fpl.inventory_product_id=mil.inventory_product_id and fpl.status='active'
  left join finance_products fp on fp.id=fpl.finance_product_id and fp.tenant_id=$1
  left join matching_layers pl on pl.tenant_id=$1 and pl.marketplace_order_id=so.id and pl.marketplace_product_id=oi.product_id
  order by so.created_at desc,so.order_no,oi.id limit 2000
 `,params);
 const counts=new Map<string,{lineCount:number;orderIds:Set<string>}>();
 for(const row of result.rows){
  const item=counts.get(row.costing_readiness)||{lineCount:0,orderIds:new Set<string>()};
  item.lineCount++;item.orderIds.add(row.order_id);counts.set(row.costing_readiness,item);
 }
 const summary=Array.from(counts.entries()).map(([status,value])=>({status,lineCount:value.lineCount,orderCount:value.orderIds.size}));
 const dispatchCounts=new Map<string,{lineCount:number;orderIds:Set<string>}>();
 for(const row of result.rows){
  const item=dispatchCounts.get(row.dispatch_readiness)||{lineCount:0,orderIds:new Set<string>()};
  item.lineCount++;item.orderIds.add(row.order_id);dispatchCounts.set(row.dispatch_readiness,item);
 }
 const dispatchSummary=Array.from(dispatchCounts.entries()).map(([status,value])=>({status,lineCount:value.lineCount,orderCount:value.orderIds.size}));
 res.json({from,to,items:result.rows,summary,dispatchSummary,orderLimit:500,lineLimit:2000,readOnly:true,
  limitation:"This report checks mapping, consumed operational reservations and the existence of cost layers linked to posted financial inventory documents. The current verified flow does not post a financial issue document linked to each marketplace order, so cost of goods is not calculated."
 });
}));
