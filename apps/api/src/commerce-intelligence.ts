import {Router} from "express";
import {createHash,createHmac,timingSafeEqual} from "node:crypto";
import {pool,query} from "./db.js";
import {requireAuth,requireCsrf,requirePermission} from "./auth.js";
import {asyncHandler} from "./http.js";
import {resolvePublicTenant,resolveTenant} from "./tenant-context.js";
import {postLedgerEntry} from "./ledger.js";
import {getPaymentProvider} from "./payment-provider.js";

export const commerceIntelligenceRouter=Router();

const str=(v:unknown,n=200)=>typeof v==="string"?v.trim().slice(0,n):"";
const num=(v:unknown)=>{const x=Number(v);return Number.isFinite(x)?x:null;};

function persianDate(date:Date){
 return new Intl.DateTimeFormat("fa-IR-u-ca-persian",{year:"numeric",month:"2-digit",day:"2-digit"}).format(date);
}
function isoDate(d:Date){return d.toISOString().slice(0,10);}
function addDays(d:Date,n:number){const x=new Date(d);x.setUTCDate(x.getUTCDate()+n);return x;}
async function businessDate(tid:string,days:number,from=new Date()){
 const cal=await query("select week_days,timezone,locale,date_system from calendar_work_calendars where tenant_id=$1 order by is_default desc limit 1",[tid]);
 const week=cal.rowCount&&Array.isArray(cal.rows[0].week_days)?cal.rows[0].week_days.map(Number):[6,0,1,2,3,4];
 const start=new Date(Date.UTC(from.getUTCFullYear(),from.getUTCMonth(),from.getUTCDate()));
 const end=addDays(start,Math.max(370,days*4+30));
 const holidays=await query("select holiday_date,is_working_day_override from calendar_holidays where tenant_id=$1 and holiday_date between $2 and $3",[tid,isoDate(start),isoDate(end)]);
 const holidayMap=new Map(holidays.rows.map((x:any)=>[String(x.holiday_date).slice(0,10),x]));
 let count=0,current=start;
 while(count<days && current<=end){
  const dow=current.getUTCDay(),key=isoDate(current),h=holidayMap.get(key);
  const working=h?.is_working_day_override===true || (!h && week.includes(dow));
  if(working)count++;
  if(count<days)current=addDays(current,1);
 }
 return {date:current,timezone:cal.rowCount?cal.rows[0].timezone:"Asia/Tehran",locale:cal.rowCount?cal.rows[0].locale:"fa-IR",dateSystem:cal.rowCount?cal.rows[0].date_system:"jalali"};
}
function localNine(date:Date,timezone:string){
 if(timezone==="Asia/Tehran")return new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate(),5,30));
 return new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate(),9,0));
}

async function tenant(req:any){return resolveTenant(req,req.user);}
async function publicTenant(req:any){return resolvePublicTenant(req,str(req.query.tenantCode,80)||undefined);}

async function marketPrice(tid:string,productId:string){
 const p=await query("select id,sku,title,price,currency,attributes from products where id=$1 and tenant_id=$2 and status='active'",[productId,tid]);
 if(!p.rowCount)return null;
 const product=p.rows[0];
 const policy=await query("select * from product_price_policies where product_id=$1 and tenant_id=$2 and enabled=true",[productId,tid]);
 const freshness=policy.rowCount?Number(policy.rows[0].freshness_minutes):180;
 const offers=await query("select o.*,s.name source_name from product_market_offers o join market_price_sources s on s.id=o.source_id where o.product_id=$1 and o.tenant_id=$2 and s.enabled=true and o.currency=$3 and o.captured_at >= now()-make_interval(mins=>$4) and (o.expires_at is null or o.expires_at>now()) order by (o.price+o.shipping_amount) asc,o.captured_at desc",[productId,tid,product.currency,freshness]);
 const lowest=offers.rowCount?Number(offers.rows[0].price)+Number(offers.rows[0].shipping_amount):null;
 const pol=policy.rowCount?policy.rows[0]:null;
 let recommended=Number(product.price),source="catalog";
 if(pol?.strategy==="lowest_verified_market"&&lowest!==null){recommended=lowest+Number(pol.delta_amount||0);source="verified_market_lowest";}
 if(pol?.strategy==="market_minus"&&lowest!==null){recommended=lowest-Number(pol.delta_amount||0)-lowest*Number(pol.delta_percent||0)/100;source="verified_market_adjusted";}
 if(pol?.min_price!==null&&pol?.min_price!==undefined)recommended=Math.max(recommended,Number(pol.min_price));
 if(pol?.max_price!==null&&pol?.max_price!==undefined)recommended=Math.min(recommended,Number(pol.max_price));
 return {product,policy:pol,lowestMarketPrice:lowest,recommendedPrice:Number(recommended.toFixed(2)),priceSource:source,offers:offers.rows.slice(0,10)};
}

commerceIntelligenceRouter.get("/api/public/products/:id/buying-options",asyncHandler(async(req,res)=>{
 const t=await publicTenant(req);if(!t)return res.status(404).json({error:"فروشگاه فعال پیدا نشد"});
 const data=await marketPrice(t.id,String(req.params.id));if(!data)return res.status(404).json({error:"محصول پیدا نشد"});
 const programs=await query("select fp.id,fp.code,fp.title,fp.financing_type,fp.rate_percent,fp.fixed_fee,fp.min_amount,fp.max_amount,fp.min_term_months,fp.max_term_months,fp.approval_business_days_min,fp.approval_business_days_max,fp.offer_validity_minutes,fp.wallet_mode,fb.code brand_code,fb.title brand_title,cs.display_name supplier_name from financing_programs fp left join financing_brands fb on fb.id=fp.brand_id left join commerce_suppliers cs on cs.id=fp.supplier_id where fp.tenant_id=$1 and fp.status='active' and fp.min_amount <= $2 and (fp.max_amount is null or fp.max_amount >= $2) order by fp.rate_percent,fp.fixed_fee",[t.id,data.recommendedPrice]);
 const deliveries=await query("select d.* from commerce_delivery_methods d where d.tenant_id=$1 and d.enabled=true order by d.business_days_min,d.cost",[t.id]);
 res.json({tenant:t,product:data.product,cash:{amount:data.recommendedPrice,currency:data.product.currency,source:data.priceSource,marketLowest:data.lowestMarketPrice},financingPrograms:programs.rows,deliveryMethods:deliveries.rows,marketOffers:data.offers.map((o:any)=>({source:o.source_name,seller:o.seller_name,price:Number(o.price),shipping:Number(o.shipping_amount),capturedAt:o.captured_at,url:o.external_url}))});
}));


commerceIntelligenceRouter.post("/api/catalog-import/connectors",requireAuth,requirePermission("catalog-import:manage"),requireCsrf,asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});const b=req.body||{};
 if(!b.code||!b.title||!b.connectorType)return res.status(400).json({error:"کد، عنوان و نوع اتصال الزامی است"});
 const r=await query("insert into catalog_import_connectors(tenant_id,code,title,connector_type,base_url,secret_reference,schedule_minutes,enabled,mapping) values($1,$2,$3,$4,$5,$6,$7,$8,$9) returning *",[t.id,str(b.code,80),str(b.title,200),b.connectorType,b.baseUrl||null,b.secretReference||null,Number(b.scheduleMinutes)||360,Boolean(b.enabled),b.mapping||{}]);
 res.status(201).json(r.rows[0]);
}));

commerceIntelligenceRouter.post("/api/catalog-import/jobs",requireAuth,requirePermission("catalog-import:manage"),requireCsrf,asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const jobNo="IMP-"+Date.now().toString(36).toUpperCase()+"-"+Math.random().toString(36).slice(2,6).toUpperCase();
 const r=await query("insert into catalog_import_jobs(tenant_id,connector_id,job_no,source_ref,requested_by) values($1,$2,$3,$4,$5) returning *",[t.id,req.body?.connectorId||null,jobNo,req.body?.sourceRef||null,(req as any).user.id]);
 res.status(202).json({job:r.rows[0],message:"دریافت کاتالوگ وارد صف شد؛ Normalizer بعد از دریافت داده، ویژگی‌ها و تنوع‌ها را استخراج می‌کند."});
}));

commerceIntelligenceRouter.post("/api/catalog-import/jobs/:id/items",requireAuth,requirePermission("catalog-import:manage"),requireCsrf,asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const job=await query("select id from catalog_import_jobs where id=$1 and tenant_id=$2",[req.params.id,t.id]);if(!job.rowCount)return res.status(404).json({error:"وظیفه دریافت کاتالوگ پیدا نشد"});
 const b=req.body||{};if(!b.rawPayload)return res.status(400).json({error:"داده خام محصول ارسال نشده است"});
 const r=await query("insert into catalog_import_items(tenant_id,job_id,external_ref,source_url,raw_payload,status) values($1,$2,$3,$4,$5,'pending') returning *",[t.id,req.params.id,b.externalRef||null,b.sourceUrl||null,b.rawPayload]);
 res.status(201).json(r.rows[0]);
}));

commerceIntelligenceRouter.post("/api/catalog/content-jobs",requireAuth,requirePermission("content-ai:manage"),requireCsrf,asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const b=req.body||{};if(!b.jobType||!["description","seo","social_post","reel_script","story","faq","customer_reply"].includes(b.jobType))return res.status(400).json({error:"نوع تولید محتوا نامعتبر است"});
 const r=await query("insert into product_content_jobs(tenant_id,product_id,job_type,channel,locale,input_snapshot,requested_by) values($1,$2,$3,$4,$5,$6,$7) returning *",[t.id,b.productId||null,b.jobType,b.channel||null,b.locale||"fa-IR",b.inputSnapshot||{},(req as any).user.id]);
 res.status(202).json({job:r.rows[0],message:"درخواست محتوا ثبت شد؛ خروجی تا اتصال موتور مدل در وضعیت صف باقی می‌ماند و داده ساختگی تولید نمی‌شود."});
}));

commerceIntelligenceRouter.get("/api/catalog/content-jobs",requireAuth,requirePermission("content-ai:read"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const params:any[]=[t.id],where=["tenant_id=$1"];if(str(req.query.productId,100)){params.push(str(req.query.productId,100));where.push("product_id=$"+params.length);}
 const r=await query("select * from product_content_jobs where "+where.join(" and ")+" order by created_at desc limit 100",params);res.json({items:r.rows});
}));

commerceIntelligenceRouter.post("/api/catalog/attributes",requireAuth,requirePermission("product:manage"),requireCsrf,asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});const b=req.body||{};if(!b.code||!b.title)return res.status(400).json({error:"کد و عنوان ویژگی الزامی است"});
 const r=await query("insert into catalog_attribute_definitions(tenant_id,code,title,value_type,unit,options,is_variant_axis) values($1,$2,$3,$4,$5,$6,$7) returning *",[t.id,str(b.code,80),str(b.title,200),b.valueType||"text",b.unit||null,b.options||[],Boolean(b.isVariantAxis)]);res.status(201).json(r.rows[0]);
}));

commerceIntelligenceRouter.post("/api/catalog/products/:id/variants",requireAuth,requirePermission("product:manage"),requireCsrf,asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});const b=req.body||{};if(!b.sku)return res.status(400).json({error:"SKU تنوع الزامی است"});
 const r=await query("insert into catalog_product_variants(tenant_id,product_id,sku,title,attributes,price,inventory_quantity) values($1,$2,$3,$4,$5,$6,$7) returning *",[t.id,req.params.id,str(b.sku,120),b.title||null,b.attributes||{},num(b.price),num(b.inventoryQuantity)||0]);res.status(201).json(r.rows[0]);
}));

commerceIntelligenceRouter.post("/api/market-intelligence/sources",requireAuth,requirePermission("market-price:manage"),requireCsrf,asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});const b=req.body||{};
 if(!b.code||!b.name||!b.sourceType)return res.status(400).json({error:"کد، نام و نوع منبع الزامی است"});
 const r=await query("insert into market_price_sources(tenant_id,code,name,source_type,base_url,secret_reference,refresh_interval_minutes,enabled,terms_reference) values($1,$2,$3,$4,$5,$6,$7,$8,$9) returning *",[t.id,str(b.code,80),str(b.name,200),str(b.sourceType,40),b.baseUrl||null,b.secretReference||null,Number(b.refreshIntervalMinutes)||60,Boolean(b.enabled),b.termsReference||null]);
 res.status(201).json(r.rows[0]);
}));

commerceIntelligenceRouter.post("/api/market-intelligence/offers",requireAuth,requirePermission("market-price:manage"),requireCsrf,asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});const b=req.body||{};
 if(!b.productId||!b.sourceId||num(b.price)===null)return res.status(400).json({error:"محصول، منبع و قیمت الزامی است"});
 const source=await query("select id from market_price_sources where id=$1 and tenant_id=$2 and enabled=true",[b.sourceId,t.id]);if(!source.rowCount)return res.status(404).json({error:"منبع قیمت فعال نیست"});
 const r=await query("insert into product_market_offers(tenant_id,product_id,source_id,external_product_ref,external_url,seller_name,price,shipping_amount,currency,availability,confidence,captured_at,expires_at,raw_metadata) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,coalesce($12,now()),$13,$14) returning *",[t.id,b.productId,b.sourceId,b.externalProductRef||null,b.externalUrl||null,b.sellerName||null,num(b.price),num(b.shippingAmount)||0,b.currency||"IRR",b.availability||"unknown",num(b.confidence),b.capturedAt||null,b.expiresAt||null,b.rawMetadata||{}]);
 res.status(201).json(r.rows[0]);
}));

commerceIntelligenceRouter.post("/api/commerce/products/:id/price-policy",requireAuth,requirePermission("market-price:manage"),requireCsrf,asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});const b=req.body||{};
 const allowed=["fixed","lowest_verified_market","market_minus","cost_plus"];if(!allowed.includes(b.strategy))return res.status(400).json({error:"استراتژی قیمت نامعتبر است"});
 const r=await query("insert into product_price_policies(tenant_id,product_id,strategy,delta_amount,delta_percent,min_price,max_price,freshness_minutes,enabled) values($1,$2,$3,$4,$5,$6,$7,$8,$9) on conflict(tenant_id,product_id) do update set strategy=excluded.strategy,delta_amount=excluded.delta_amount,delta_percent=excluded.delta_percent,min_price=excluded.min_price,max_price=excluded.max_price,freshness_minutes=excluded.freshness_minutes,enabled=excluded.enabled returning *",[t.id,req.params.id,b.strategy,num(b.deltaAmount)||0,num(b.deltaPercent)||0,num(b.minPrice),num(b.maxPrice),Number(b.freshnessMinutes)||180,Boolean(b.enabled)]);
 res.json(r.rows[0]);
}));

commerceIntelligenceRouter.post("/api/commerce/suppliers",requireAuth,requirePermission("supplier:manage"),requireCsrf,asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});const b=req.body||{};if(!b.code||!b.legalName||!b.displayName||!b.supplierType)return res.status(400).json({error:"کد، نام حقوقی، نام نمایشی و نوع تأمین‌کننده الزامی است"});
 const r=await query("insert into commerce_suppliers(tenant_id,code,legal_name,display_name,supplier_type,metadata) values($1,$2,$3,$4,$5,$6) returning *",[t.id,str(b.code,80),str(b.legalName,300),str(b.displayName,200),b.supplierType,b.metadata||{}]);res.status(201).json(r.rows[0]);
}));

commerceIntelligenceRouter.post("/api/commerce/financing-brands",requireAuth,requirePermission("financing:manage"),requireCsrf,asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});const b=req.body||{};if(!b.code||!b.title)return res.status(400).json({error:"کد و عنوان برند اعتباری الزامی است"});
 const r=await query("insert into financing_brands(tenant_id,supplier_id,code,title,landing_path,card_enabled,wallet_enabled,metadata) values($1,$2,$3,$4,$5,$6,$7,$8) returning *",[t.id,b.supplierId||null,str(b.code,80),str(b.title,200),b.landingPath||null,Boolean(b.cardEnabled),b.walletEnabled!==false,b.metadata||{}]);res.status(201).json(r.rows[0]);
}));

commerceIntelligenceRouter.post("/api/commerce/financing-programs",requireAuth,requirePermission("financing:manage"),requireCsrf,asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});const b=req.body||{};
 if(!b.code||!b.title||!b.supplierId)return res.status(400).json({error:"کد، عنوان و تأمین‌کننده مالی الزامی است"});
 const r=await query("insert into financing_programs(tenant_id,brand_id,supplier_id,code,title,financing_type,rate_percent,fixed_fee,min_amount,max_amount,min_term_months,max_term_months,approval_business_days,approval_business_days_min,approval_business_days_max,offer_validity_minutes,requires_preapproval,wallet_mode,currency,status,rules) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22) returning *",[t.id,b.brandId||null,b.supplierId,str(b.code,80),str(b.title,200),b.financingType||"installment",num(b.ratePercent)||0,num(b.fixedFee)||0,num(b.minAmount)||0,num(b.maxAmount),num(b.minTermMonths),num(b.maxTermMonths),Number(b.approvalBusinessDays)||0,Number(b.approvalBusinessDaysMin ?? b.approvalBusinessDays ?? 0),Number(b.approvalBusinessDaysMax ?? b.approvalBusinessDays ?? 0),Number(b.offerValidityMinutes)||1440,b.requiresPreapproval!==false,b.walletMode||"credit_only",b.currency||"IRR",b.status||"draft",b.rules||{}]);res.status(201).json(r.rows[0]);
}));

commerceIntelligenceRouter.post("/api/commerce/delivery-methods",requireAuth,requirePermission("supplier:manage"),requireCsrf,asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});const b=req.body||{};if(!b.code||!b.title)return res.status(400).json({error:"کد و عنوان روش تحویل الزامی است"});
 const r=await query("insert into commerce_delivery_methods(tenant_id,code,title,carrier_type,business_days_min,business_days_max,cutoff_hour_local,cost,currency,enabled,rules) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) returning *",[t.id,str(b.code,80),str(b.title,200),b.carrierType||"courier",Number(b.businessDaysMin)||0,Number(b.businessDaysMax)||0,Number(b.cutoffHourLocal??12),num(b.cost)||0,b.currency||"IRR",b.enabled!==false,b.rules||{}]);res.status(201).json(r.rows[0]);
}));

commerceIntelligenceRouter.post("/api/commerce/quotes",requireAuth,requirePermission("quote:manage"),requireCsrf,asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});const b=req.body||{},items=Array.isArray(b.items)?b.items:[];if(!items.length)return res.status(400).json({error:"حداقل یک محصول لازم است"});
 const customerRef=str(b.customerRef,200)||((req as any).user.id);
 const deliveryMethodId=str(b.deliveryMethodId,100)||null;
 const client=await pool.connect();
 try{
  await client.query("begin");
  let cash=0;const snapshots:any[]=[];
  for(const item of items){
   const qty=num(item.quantity);if(!item.productId||qty===null||qty<=0)throw Object.assign(new Error("محصول یا تعداد نامعتبر است"),{status:400});
   const data=await marketPrice(t.id,String(item.productId));if(!data)throw Object.assign(new Error("محصول پیدا نشد"),{status:404});
   const unit=data.recommendedPrice;cash+=unit*qty;snapshots.push({productId:item.productId,sku:data.product.sku,title:data.product.title,quantity:qty,unitPrice:unit,currency:data.product.currency,priceSource:data.priceSource,marketLowest:data.lowestMarketPrice,offers:data.offers.slice(0,5),variant:item.variant||{}});}
  const delivery=deliveryMethodId?await client.query("select * from commerce_delivery_methods where id=$1 and tenant_id=$2 and enabled=true",[deliveryMethodId,t.id]):{rowCount:0,rows:[]};
  if(deliveryMethodId&&!delivery.rowCount)throw Object.assign(new Error("روش تحویل معتبر نیست"),{status:404});
  const shipping=delivery.rowCount?Number(delivery.rows[0].cost):0;cash+=shipping;
  const programs=await client.query("select fp.*,fb.title brand_title,cs.display_name supplier_name from financing_programs fp left join financing_brands fb on fb.id=fp.brand_id left join commerce_suppliers cs on cs.id=fp.supplier_id where fp.tenant_id=$1 and fp.status='active' and fp.min_amount<=$2 and (fp.max_amount is null or fp.max_amount>=$2)",[t.id,cash]);
  const quoteNo="Q-"+Date.now().toString(36).toUpperCase()+"-"+Math.random().toString(36).slice(2,6).toUpperCase();
  const maxValidity=programs.rows.length?Math.min(...programs.rows.map(x=>Number(x.offer_validity_minutes))):1440;
  const validUntil=new Date(Date.now()+maxValidity*60000);
  const deliveryDays=delivery.rowCount?Number(delivery.rows[0].business_days_max):0;
  const deliveryDue=await businessDate(t.id,deliveryDays);
  const quote=await client.query("insert into commerce_purchase_quotes(tenant_id,quote_no,customer_ref,status,currency,cash_amount,valid_until,delivery_due_at,price_snapshot,terms_snapshot,created_by) values($1,$2,$3,'offered',$4,$5,$6,$7,$8,$9,$10) returning *",[t.id,quoteNo,customerRef,snapshots[0]?.currency||"IRR",cash,validUntil,deliveryDue.date,JSON.stringify({items:snapshots,shipping}),JSON.stringify({quoteIsNotInvoice:true,priceLockUntil:validUntil.toISOString(),deliveryCalendar:deliveryDue}),(req as any).user.id]);
  for(const x of snapshots)await client.query("insert into commerce_quote_items(quote_id,product_id,quantity,unit_price,line_total,variant_snapshot) values($1,$2,$3,$4,$5,$6)",[quote.rows[0].id,x.productId,x.quantity,x.unitPrice,x.unitPrice*x.quantity,JSON.stringify(x.variant)]);
  for(const p of programs.rows){
   const principal=cash,fee=Number(p.fixed_fee||0),total=principal+(principal*Number(p.rate_percent||0)/100)+fee;
   const minDays=Number(p.approval_business_days_min??p.approval_business_days??0),maxDays=Number(p.approval_business_days_max??p.approval_business_days??minDays);
   const due=await businessDate(t.id,maxDays);
   const reminder=localNine(due.date,due.timezone);
   const offer=await client.query("insert into commerce_financing_offers(tenant_id,quote_id,financing_program_id,principal,rate_percent,fee_amount,total_repayable,term_months,approval_business_days,approval_due_at,delivery_due_at,status) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'available') returning *",[t.id,quote.rows[0].id,p.id,principal,Number(p.rate_percent||0),fee,total,p.max_term_months||p.min_term_months||null,maxDays,due.date,deliveryDue.date]);
   await client.query("insert into commerce_quote_reminders(tenant_id,quote_id,reminder_type,scheduled_at,channel,destination,template_code,payload) values($1,$2,'approval_ready',$3,'sms',null,'commerce.credit.approval_ready',$4)",[t.id,quote.rows[0].id,reminder,{programId:p.id,offerId:offer.rows[0].id,sendAt:"09:00"}]);
   await client.query("update commerce_purchase_quotes set approval_due_at=coalesce(approval_due_at,$1) where id=$2",[due.date,quote.rows[0].id]);
  }
  await client.query("commit");
  res.status(201).json({quote:quote.rows[0],items:snapshots,financingOffers:(await query("select fo.*,fp.code program_code,fp.title program_title,fb.title brand_title,cs.display_name supplier_name from commerce_financing_offers fo join financing_programs fp on fp.id=fo.financing_program_id left join financing_brands fb on fb.id=fp.brand_id left join commerce_suppliers cs on cs.id=fp.supplier_id where fo.quote_id=$1 order by fo.total_repayable",[quote.rows[0].id])).rows});
 }catch(e:any){await client.query("rollback");if(e?.status) return res.status(e.status).json({error:e.message});throw e}finally{client.release();}
}));


commerceIntelligenceRouter.post("/api/commerce/quotes/:id/select-financing",requireAuth,requirePermission("quote:manage"),requireCsrf,asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const offer=await query("select fo.*,fp.requires_preapproval from commerce_financing_offers fo join financing_programs fp on fp.id=fo.financing_program_id where fo.id=$1 and fo.quote_id=$2 and fo.tenant_id=$3 and fo.status='available'",[req.body?.offerId,req.params.id,t.id]);
 if(!offer.rowCount)return res.status(404).json({error:"پیشنهاد اعتباری معتبر پیدا نشد"});
 const q=await query("select * from commerce_purchase_quotes where id=$1 and tenant_id=$2 and valid_until>now() and status in ('offered','financing_pending','ready')",[req.params.id,t.id]);
 if(!q.rowCount)return res.status(409).json({error:"پیشنهاد خرید منقضی یا غیرقابل انتخاب است"});
 const r=await query("update commerce_purchase_quotes set selected_financing_program_id=$1,status='financing_pending',updated_at=now() where id=$2 and tenant_id=$3 returning *",[offer.rows[0].financing_program_id,req.params.id,t.id]);
 res.json({quote:r.rows[0],offer:offer.rows[0],requiresPreapproval:offer.rows[0].requires_preapproval});
}));

commerceIntelligenceRouter.post("/api/commerce/quotes/:id/cash-payment",requireAuth,requirePermission("payment:manage"),requireCsrf,asyncHandler(async(_req,res)=>{
 return res.status(410).json({error:"مسیر پرداخت نقدی قدیمی غیرفعال است",use:"/api/commerce/quotes/:id/payment-attempt"});
}));

commerceIntelligenceRouter.post("/api/commerce/quotes/:id/authorize-credit",requireAuth,requirePermission("credit-wallet:manage"),requireCsrf,asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const q=await query("select * from commerce_purchase_quotes where id=$1 and tenant_id=$2 and valid_until>now() and status in ('financing_pending','offered')",[req.params.id,t.id]);if(!q.rowCount)return res.status(409).json({error:"پیشنهاد خرید منقضی یا غیرقابل اعتباردهی است"});
 const offer=await query("select fo.*,fp.requires_preapproval,fp.wallet_mode from commerce_financing_offers fo join financing_programs fp on fp.id=fo.financing_program_id where fo.id=$1 and fo.quote_id=$2 and fo.tenant_id=$3",[req.body?.offerId,req.params.id,t.id]);if(!offer.rowCount)return res.status(404).json({error:"پیشنهاد اعتباری پیدا نشد"});
 if(offer.rows[0].requires_preapproval&&offer.rows[0].status!=="approved")return res.status(409).json({error:"این طرح هنوز تأیید اعتباری نشده است",status:offer.rows[0].status});
 const wallet=await query("select * from credit_wallet_accounts where id=$1 and tenant_id=$2 and owner_user_id=$3 and status='active' for update",[req.body?.walletId,t.id,(req as any).user.id]);if(!wallet.rowCount)return res.status(404).json({error:"کیف پول اعتباری متعلق به کاربر پیدا نشد"});
 const amount=Number(offer.rows[0].total_repayable),idem=str(req.body?.idempotencyKey,180)||("credit-"+offer.rows[0].id);
 const client=await pool.connect();
 try{
  await client.query("begin");
  const w=await client.query("select * from credit_wallet_accounts where id=$1 and tenant_id=$2 for update",[wallet.rows[0].id,t.id]);
  if(Number(w.rows[0].available_limit)<amount){await client.query("rollback");return res.status(409).json({error:"سقف کیف پول اعتباری کافی نیست"});}
  const existing=await client.query("select * from commerce_payment_intents where tenant_id=$1 and idempotency_key=$2",[t.id,idem]);
  if(existing.rowCount){await client.query("rollback");return res.json({intent:existing.rows[0]});}
  const intentNo="PI-"+Date.now().toString(36).toUpperCase()+"-"+Math.random().toString(36).slice(2,7).toUpperCase();
  const intent=await client.query("insert into commerce_payment_intents(tenant_id,quote_id,intent_no,payment_mode,amount,currency,status,provider_code,idempotency_key,expires_at,metadata,created_by) values($1,$2,$3,'credit_wallet',$4,$5,'authorized','credit_wallet',$6,$7,$8,$9) returning *",[t.id,q.rows[0].id,intentNo,amount,q.rows[0].currency,idem,q.rows[0].valid_until,JSON.stringify({offerId:offer.rows[0].id,walletId:w.rows[0].id}),(req as any).user.id]);
  const hold=await client.query("insert into credit_wallet_holds(tenant_id,wallet_id,payment_intent_id,amount,expires_at,reason) values($1,$2,$3,$4,$5,$6) returning *",[t.id,w.rows[0].id,intent.rows[0].id,amount,q.rows[0].valid_until,"خرید اعتباری "+q.rows[0].quote_no]);
  const available=Number(w.rows[0].available_limit)-amount,reserved=Number(w.rows[0].reserved_limit)+amount;
  await client.query("update credit_wallet_accounts set available_limit=$1,reserved_limit=$2,updated_at=now() where id=$3",[available,reserved,w.rows[0].id]);
  await client.query("insert into credit_wallet_ledger(tenant_id,wallet_id,entry_no,direction,amount,balance_available,balance_reserved,reference_type,reference_id,idempotency_key,created_by) values($1,$2,$3,'reserve',$4,$5,$6,'payment_intent',$7,$8,$9)",[t.id,w.rows[0].id,"CW-"+Date.now().toString(36),amount,available,reserved,intent.rows[0].id,idem,(req as any).user.id]);
  await client.query("update commerce_purchase_quotes set status='ready',updated_at=now() where id=$1",[q.rows[0].id]);
  await client.query("commit");res.status(201).json({intent:intent.rows[0],hold:hold.rows[0],availableLimit:available,reservedLimit:reserved});
 }catch(e){await client.query("rollback");throw e}finally{client.release();}
}));

commerceIntelligenceRouter.post("/api/commerce/quotes/:id/convert",requireAuth,requirePermission("order:manage"),requireCsrf,asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const client=await pool.connect();
 try{
  await client.query("begin");
  const q=await client.query("select * from commerce_purchase_quotes where id=$1 and tenant_id=$2 for update",[req.params.id,t.id]);
  if(!q.rowCount)return res.status(404).json({error:"پیشنهاد خرید پیدا نشد"});
  if(q.rows[0].valid_until<=new Date()||!["ready","offered"].includes(q.rows[0].status)){await client.query("rollback");return res.status(409).json({error:"پیشنهاد منقضی یا آماده تبدیل نیست؛ قیمت باید دوباره محاسبه شود"});}
  const items=await client.query("select qi.*,p.seller_id,p.store_id,p.title from commerce_quote_items qi join products p on p.id=qi.product_id where qi.quote_id=$1 for update",[q.rows[0].id]);
  const sellers=[...new Set(items.rows.map((x:any)=>x.seller_id))];if(sellers.length!==1){await client.query("rollback");return res.status(400).json({error:"پیشنهاد باید متعلق به یک فروشنده باشد"});}
  const paid=await client.query("select * from commerce_payment_intents where quote_id=$1 and tenant_id=$2 and (status='paid' or (status='authorized' and payment_mode='credit_wallet')) order by created_at desc limit 1",[q.rows[0].id,t.id]);
  if(!paid.rowCount){await client.query("rollback");return res.status(409).json({error:"ابتدا پرداخت نقدی یا اعتباردهی کیف پول باید تکمیل شود"});}
  const payment=paid.rows[0],seller=sellers[0],subtotal=items.rows.reduce((sum:any,x:any)=>sum+Number(x.line_total),0),shipping=Number(q.rows[0].cash_amount)-subtotal,total=Number(q.rows[0].cash_amount);
  const sr=await client.query("select commission_rate from sellers where id=$1 and tenant_id=$2",[seller,t.id]);if(!sr.rowCount){await client.query("rollback");return res.status(404).json({error:"فروشنده پیدا نشد"});}
  const commission=Number((subtotal*Number(sr.rows[0].commission_rate)/100).toFixed(2)),payable=subtotal-commission;
  const orderNo="ORD-"+Date.now().toString(36).toUpperCase()+"-"+Math.random().toString(36).slice(2,6).toUpperCase();
  const order=await client.query("insert into marketplace_orders(tenant_id,store_id,seller_id,order_no,customer_ref,subtotal,shipping_amount,total_amount,commission_amount,seller_payable,payment_method,delivery_due_at) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) returning *",[t.id,items.rows[0].store_id,seller,orderNo,q.rows[0].customer_ref,subtotal,Math.max(0,shipping),total,commission,payable,payment.payment_mode,q.rows[0].delivery_due_at]);
  for(const item of items.rows){
   const inv=await client.query("select * from product_inventory where tenant_id=$1 and product_id=$2 and store_id=$3 for update",[t.id,item.product_id,item.store_id]);
   if(!inv.rowCount||Number(inv.rows[0].quantity)-Number(inv.rows[0].reserved_quantity)<Number(item.quantity)){await client.query("rollback");return res.status(409).json({error:"موجودی محصول برای تبدیل پیشنهاد کافی نیست",product:item.title});}
   await client.query("update product_inventory set reserved_quantity=reserved_quantity+$1,updated_at=now() where id=$2",[item.quantity,inv.rows[0].id]);
   await client.query("insert into marketplace_order_items(order_id,product_id,quantity,unit_price,line_total) values($1,$2,$3,$4,$5)",[order.rows[0].id,item.product_id,item.quantity,item.unit_price,item.line_total]);
  }
  await client.query("insert into marketplace_payments(tenant_id,order_id,payment_no,amount,method,status,provider_ref,provider_code,provider_transaction_id,provider_payload,paid_at) values($1,$2,$3,$4,$5,'paid',$6,$7,$8,$9,now())",[t.id,order.rows[0].id,"PAY-"+Date.now().toString(36),Number(payment.amount),payment.payment_mode,payment.provider_transaction_id||payment.id,payment.provider_code,payment.provider_transaction_id||payment.id,JSON.stringify(payment.metadata||{})]);
  if(payment.payment_mode==="credit_wallet"){
   const hold=await client.query("select h.*,w.* from credit_wallet_holds h join credit_wallet_accounts w on w.id=h.wallet_id where h.payment_intent_id=$1 and h.status='active' for update",[payment.id]);
   if(!hold.rowCount){await client.query("rollback");return res.status(409).json({error:"رزرو اعتبار پیدا نشد"});}
   const amount=Number(hold.rows[0].amount),reserved=Number(hold.rows[0].reserved_limit)-amount,spent=Number(hold.rows[0].spent_limit)+amount;
   await client.query("update credit_wallet_holds set status='captured',updated_at=now() where id=$1",[hold.rows[0].id]);
   await client.query("update credit_wallet_accounts set reserved_limit=$1,spent_limit=$2,updated_at=now() where id=$3",[reserved,spent,hold.rows[0].wallet_id]);
   await client.query("insert into credit_wallet_ledger(tenant_id,wallet_id,entry_no,direction,amount,balance_available,balance_reserved,reference_type,reference_id,idempotency_key,created_by) values($1,$2,$3,'capture',$4,$5,$6,'marketplace_order',$7,$8,$9)",[t.id,hold.rows[0].wallet_id,"CW-"+Date.now().toString(36),amount,Number(hold.rows[0].available_limit),reserved,order.rows[0].id,"capture-order-"+order.rows[0].id,(req as any).user.id]);
  }
  await postLedgerEntry(client,{tenantId:t.id,entryNo:"QUOTE-"+q.rows[0].quote_no,sourceType:"commerce_order",sourceId:order.rows[0].id,description:"تبدیل پیشنهاد خرید به سفارش "+order.rows[0].order_no,createdBy:(req as any).user.id,lines:[
   payment.payment_mode==="credit_wallet"?{accountCode:"1201",accountName:"مطالبات اعتباری مشتریان",accountType:"asset",debit:Number(payment.amount)}:{accountCode:"1101",accountName:"حساب پرداخت‌های پلتفرم",accountType:"asset",debit:Number(payment.amount)},
   {accountCode:"2101",accountName:"بستانکاران فروشندگان",accountType:"liability",credit:payable},
   {accountCode:"4101",accountName:"درآمد کمیسیون",accountType:"revenue",credit:commission}
  ]});
  await client.query("update marketplace_orders set status='paid',paid_at=now(),updated_at=now() where id=$1",[order.rows[0].id]);
  await client.query("update commerce_payment_intents set order_id=$1,status='paid',updated_at=now() where id=$2",[order.rows[0].id,payment.id]);
  await client.query("update commerce_purchase_quotes set status='converted',updated_at=now() where id=$1",[q.rows[0].id]);
  await client.query("commit");res.status(201).json({order:order.rows[0],quoteId:q.rows[0].id,paymentIntentId:payment.id});
 }catch(e){await client.query("rollback").catch(()=>{});throw e}finally{client.release();}
}));

commerceIntelligenceRouter.get("/api/commerce/quotes/:id",requireAuth,requirePermission("quote:read"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const q=await query("select * from commerce_purchase_quotes where id=$1 and tenant_id=$2",[req.params.id,t.id]);if(!q.rowCount)return res.status(404).json({error:"پیش‌فاکتور/پیشنهاد خرید پیدا نشد"});
 const [items,offers,reminders]=await Promise.all([
  query("select qi.*,p.sku,p.title from commerce_quote_items qi join products p on p.id=qi.product_id where qi.quote_id=$1",[req.params.id]),
  query("select fo.*,fp.code program_code,fp.title program_title,fb.title brand_title,cs.display_name supplier_name from commerce_financing_offers fo join financing_programs fp on fp.id=fo.financing_program_id left join financing_brands fb on fb.id=fp.brand_id left join commerce_suppliers cs on cs.id=fp.supplier_id where fo.quote_id=$1 order by fo.total_repayable",[req.params.id]),
  query("select * from commerce_quote_reminders where quote_id=$1 order by scheduled_at",[req.params.id])
 ]);
 res.json({quote:q.rows[0],items:items.rows,financingOffers:offers.rows,reminders:reminders.rows,canConvert:new Date(q.rows[0].valid_until)>new Date()&&["offered","ready"].includes(q.rows[0].status)});
}));

commerceIntelligenceRouter.post("/api/credit-wallets",requireAuth,requirePermission("credit-wallet:manage"),requireCsrf,asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});const b=req.body||{};
 if(!b.walletCode||num(b.creditLimit)===null)return res.status(400).json({error:"کد کیف پول و سقف اعتبار الزامی است"});
 const limit=num(b.creditLimit)||0;
 const r=await query("insert into credit_wallet_accounts(tenant_id,owner_user_id,facility_id,financing_program_id,wallet_code,currency,credit_limit,available_limit,cash_out_allowed,transfer_allowed) values($1,$2,$3,$4,$5,$6,$7,$7,false,false) returning id,wallet_code,currency,credit_limit,available_limit,reserved_limit,spent_limit,status,cash_out_allowed,transfer_allowed",[t.id,b.ownerUserId||null,b.facilityId||null,b.financingProgramId||null,str(b.walletCode,100),b.currency||"IRR",limit]);
 res.status(201).json(r.rows[0]);
}));

commerceIntelligenceRouter.get("/api/credit-wallets/me",requireAuth,requirePermission("credit-wallet:read"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const wallets=await query("select id,wallet_code,currency,credit_limit,available_limit,reserved_limit,spent_limit,status,cash_out_allowed,transfer_allowed from credit_wallet_accounts where tenant_id=$1 and owner_user_id=$2 and status='active' order by created_at desc",[t.id,(req as any).user.id]);
 res.json({wallets:wallets.rows});
}));

commerceIntelligenceRouter.post("/api/credit-wallets/:id/holds",requireAuth,requirePermission("credit-wallet:manage"),requireCsrf,asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});const amount=num(req.body?.amount);if(amount===null||amount<=0)return res.status(400).json({error:"مبلغ رزرو نامعتبر است"});
 const client=await pool.connect();
 try{
  await client.query("begin");
  const w=await client.query("select * from credit_wallet_accounts where id=$1 and tenant_id=$2 for update",[req.params.id,t.id]);if(!w.rowCount){await client.query("rollback");return res.status(404).json({error:"کیف پول اعتباری پیدا نشد"});}
  if(w.rows[0].status!=="active"||w.rows[0].cash_out_allowed||w.rows[0].transfer_allowed){await client.query("rollback");return res.status(409).json({error:"کیف پول برای خرید اعتباری معتبر نیست"});}
  if(Number(w.rows[0].available_limit)<amount){await client.query("rollback");return res.status(409).json({error:"سقف اعتبار کافی نیست"});}
  const hold=await client.query("insert into credit_wallet_holds(tenant_id,wallet_id,amount,expires_at,reason) values($1,$2,$3,$4,$5) returning *",[t.id,w.rows[0].id,amount,new Date(Date.now()+15*60000),req.body?.reason||"خرید فروشگاهی"]);
  const available=Number(w.rows[0].available_limit)-amount,reserved=Number(w.rows[0].reserved_limit)+amount;
  await client.query("update credit_wallet_accounts set available_limit=$1,reserved_limit=$2,updated_at=now() where id=$3",[available,reserved,w.rows[0].id]);
  await client.query("insert into credit_wallet_ledger(tenant_id,wallet_id,entry_no,direction,amount,balance_available,balance_reserved,reference_type,reference_id,idempotency_key,created_by) values($1,$2,$3,'reserve',$4,$5,$6,'wallet_hold',$7,$8,$9)",[t.id,w.rows[0].id,"CW-"+Date.now().toString(36),amount,available,reserved,hold.rows[0].id,str(req.body?.idempotencyKey||hold.rows[0].id),(req as any).user.id]);
  await client.query("commit");res.status(201).json({hold:hold.rows[0],availableLimit:available,reservedLimit:reserved});
 }catch(e){await client.query("rollback");throw e}finally{client.release()}
}));

commerceIntelligenceRouter.post("/api/credit-wallets/:id/capture",requireAuth,requirePermission("credit-wallet:manage"),requireCsrf,asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const client=await pool.connect();
 try{
  await client.query("begin");
  const h=await client.query("select h.*,w.* from credit_wallet_holds h join credit_wallet_accounts w on w.id=h.wallet_id where h.id=$1 and h.wallet_id=$2 and h.tenant_id=$3 for update",[req.body?.holdId,req.params.id,t.id]);if(!h.rowCount){await client.query("rollback");return res.status(404).json({error:"رزرو اعتبار پیدا نشد"});}
  if(h.rows[0].status!=="active"){await client.query("rollback");return res.status(409).json({error:"رزرو دیگر فعال نیست"});}
  const amount=Number(h.rows[0].amount),reserved=Number(h.rows[0].reserved_limit)-amount,spent=Number(h.rows[0].spent_limit)+amount;
  await client.query("update credit_wallet_holds set status='captured',updated_at=now() where id=$1",[h.rows[0].id]);
  await client.query("update credit_wallet_accounts set reserved_limit=$1,spent_limit=$2,updated_at=now() where id=$3",[reserved,spent,h.rows[0].wallet_id]);
  await client.query("insert into credit_wallet_ledger(tenant_id,wallet_id,entry_no,direction,amount,balance_available,balance_reserved,reference_type,reference_id,idempotency_key,created_by) values($1,$2,$3,'capture',$4,$5,$6,'wallet_hold',$7,$8,$9)",[t.id,h.rows[0].wallet_id,"CW-"+Date.now().toString(36),amount,Number(h.rows[0].available_limit),reserved,h.rows[0].id,"capture-"+h.rows[0].id,(req as any).user.id]);
  await client.query("commit");res.json({status:"captured",amount,spentLimit:spent});
 }catch(e){await client.query("rollback");throw e}finally{client.release()}
}));

commerceIntelligenceRouter.post("/api/credit-wallets/:id/release",requireAuth,requirePermission("credit-wallet:manage"),requireCsrf,asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});const client=await pool.connect();
 try{
  await client.query("begin");
  const h=await client.query("select h.*,w.* from credit_wallet_holds h join credit_wallet_accounts w on w.id=h.wallet_id where h.id=$1 and h.wallet_id=$2 and h.tenant_id=$3 for update",[req.body?.holdId,req.params.id,t.id]);if(!h.rowCount){await client.query("rollback");return res.status(404).json({error:"رزرو اعتبار پیدا نشد"});}
  if(h.rows[0].status!=="active"){await client.query("rollback");return res.status(409).json({error:"رزرو دیگر فعال نیست"});}
  const amount=Number(h.rows[0].amount),reserved=Number(h.rows[0].reserved_limit)-amount,available=Number(h.rows[0].available_limit)+amount;
  await client.query("update credit_wallet_holds set status='released',updated_at=now() where id=$1",[h.rows[0].id]);
  await client.query("update credit_wallet_accounts set available_limit=$1,reserved_limit=$2,updated_at=now() where id=$3",[available,reserved,h.rows[0].wallet_id]);
  await client.query("insert into credit_wallet_ledger(tenant_id,wallet_id,entry_no,direction,amount,balance_available,balance_reserved,reference_type,reference_id,idempotency_key,created_by) values($1,$2,$3,'release',$4,$5,$6,'wallet_hold',$7,$8,$9)",[t.id,h.rows[0].wallet_id,"CW-"+Date.now().toString(36),amount,available,reserved,h.rows[0].id,"release-"+h.rows[0].id,(req as any).user.id]);
  await client.query("commit");res.json({status:"released",amount,availableLimit:available,reservedLimit:reserved});
 }catch(e){await client.query("rollback");throw e}finally{client.release()}
}));

commerceIntelligenceRouter.get("/api/commerce/working-day",requireAuth,requirePermission("calendar:view"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});const days=Math.max(0,Math.min(365,Number(req.query.days)||0));const d=await businessDate(t.id,days);res.json({isoDate:isoDate(d.date),persianDate:persianDate(d.date),timezone:d.timezone,dateSystem:d.dateSystem,locale:d.locale});
}));


commerceIntelligenceRouter.get("/api/credit-virtual-cards",requireAuth,requirePermission("credit-wallet:read"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const rows=await query("select id,wallet_id,provider_code,provider_card_reference,masked_pan,status,spend_limit,expires_at,metadata,created_at,updated_at from credit_virtual_cards where tenant_id=$1 and wallet_id in (select id from credit_wallet_accounts where owner_user_id=$2) order by created_at desc",[t.id,(req as any).user.id]);
 res.json({cards:rows.rows});
}));
commerceIntelligenceRouter.post("/api/credit-virtual-cards",requireAuth,requirePermission("credit-wallet:manage"),requireCsrf,asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const wallet=await query("select id,currency,status from credit_wallet_accounts where id=$1 and tenant_id=$2 and owner_user_id=$3",[req.body?.walletId,t.id,(req as any).user.id]);
 if(!wallet.rowCount||wallet.rows[0].status!=="active")return res.status(404).json({error:"کیف پول اعتباری فعال پیدا نشد"});
 const providerCode=str(req.body?.providerCode,80);const cardRef=str(req.body?.providerCardReference,200);
 if(!providerCode||!cardRef)return res.status(400).json({error:"شناسه کارت نزد ارائه‌دهنده و کد ارائه‌دهنده الزامی است"});
 const r=await query("insert into credit_virtual_cards(tenant_id,wallet_id,provider_code,provider_card_reference,masked_pan,status,spend_limit,expires_at,metadata) values($1,$2,$3,$4,$5,'active',$6,$7,$8) returning id,wallet_id,provider_code,provider_card_reference,masked_pan,status,spend_limit,expires_at,metadata",[t.id,wallet.rows[0].id,providerCode,cardRef,str(req.body?.maskedPan,32)||null,num(req.body?.spendLimit),req.body?.expiresAt||null,req.body?.metadata||{}]);
 res.status(201).json({card:r.rows[0],security:{rawPanStored:false,cvvStored:false}});
}));
commerceIntelligenceRouter.get("/api/payment-gateways",requireAuth,requirePermission("payment-gateway:read"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const rows=await query("select * from payment_gateway_profiles where tenant_id=$1 order by created_at",[t.id]);res.json({gateways:rows.rows});
}));
commerceIntelligenceRouter.post("/api/payment-gateways",requireAuth,requirePermission("payment-gateway:manage"),requireCsrf,asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});const b=req.body||{};
 if(!b.code||!b.title||!b.brandCode||!b.brandTitle||!["shaparak","international","proprietary"].includes(b.gatewayType))return res.status(400).json({error:"مشخصات درگاه معتبر نیست"});
 const r=await query("insert into payment_gateway_profiles(tenant_id,code,title,brand_code,brand_title,gateway_type,provider_code,currency_scope,enabled,public_enabled,internal_only,verification_required,merchant_review_timeout_seconds,auto_reverse_on_timeout,config_reference,metadata) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) returning *",[t.id,str(b.code,80),str(b.title,160),str(b.brandCode,80),str(b.brandTitle,160),b.gatewayType,str(b.providerCode,80)||null,JSON.stringify(Array.isArray(b.currencyScope)?b.currencyScope:[]),b.enabled===true,b.publicEnabled!==false,b.internalOnly===true,b.verificationRequired!==false,Math.max(60,Math.min(86400,Number(b.merchantReviewTimeoutSeconds)||900)),b.autoReverseOnTimeout!==false,str(b.configReference,200)||null,b.metadata||{}]);res.status(201).json(r.rows[0]);
}));
commerceIntelligenceRouter.post("/api/commerce/quotes/:id/payment-attempt",requireAuth,requirePermission("payment:manage"),requireCsrf,asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const q=await query("select * from commerce_purchase_quotes where id=$1 and tenant_id=$2 and valid_until>now() and status in ('offered','ready')",[req.params.id,t.id]);
 if(!q.rowCount)return res.status(409).json({error:"پیشنهاد خرید منقضی یا غیرقابل پرداخت است"});
 const g=await query("select * from payment_gateway_profiles where id=$1 and tenant_id=$2 and enabled=true and public_enabled=true",[req.body?.gatewayId,t.id]);
 if(!g.rowCount)return res.status(404).json({error:"درگاه فعال پیدا نشد"});
 const gateway=g.rows[0];
 const idem=str(req.body?.idempotencyKey,180)||("attempt-"+q.rows[0].id+"-"+gateway.id);
 const oldAttempt=await query("select * from payment_gateway_attempts where tenant_id=$1 and attempt_no=$2",[t.id,idem]);
 if(oldAttempt.rowCount)return res.json({attempt:oldAttempt.rows[0],nextAction:oldAttempt.rows[0].status==="created"?"start_provider_payment":"continue_payment"});
 const amount=Number(q.rows[0].cash_amount);
 const currency=str(q.rows[0].currency,12);
 const paymentMode=["cash","virtual_card"].includes(str(req.body?.paymentMode,30))?str(req.body?.paymentMode,30):"cash";
 let virtualCard:any=null;
 if(paymentMode==="virtual_card"){
  const vc=await query("select c.*,w.owner_user_id,w.status wallet_status from credit_virtual_cards c join credit_wallet_accounts w on w.id=c.wallet_id where c.id=$1 and c.tenant_id=$2 and w.owner_user_id=$3 and c.status='active' and w.status='active' for update",[req.body?.virtualCardId,t.id,(req as any).user.id]);
  if(!vc.rowCount)return res.status(404).json({error:"کارت اعتباری مجازی فعال پیدا نشد"});
  virtualCard=vc.rows[0];
  if(virtualCard.expires_at&&new Date(virtualCard.expires_at)<=new Date())return res.status(409).json({error:"کارت اعتباری مجازی منقضی شده است"});
  if(virtualCard.spend_limit!==null&&Number(virtualCard.spend_limit)<amount)return res.status(409).json({error:"سقف مصرف کارت اعتباری برای این خرید کافی نیست"});
 }
 const providerCode=str(gateway.provider_code,80)||str(gateway.code,80);
 const paymentNo="PI-"+Date.now().toString(36).toUpperCase();
 let providerResult:any;
 try{
  const provider=getPaymentProvider(providerCode);
  providerResult=await provider.createPayment({
   tenantId:t.id,
   orderId:String(q.rows[0].id),
   amount,
   currency,
   paymentNo,
   metadata:{quoteId:String(q.rows[0].id),gatewayId:String(gateway.id),idempotencyKey:idem,paymentMode,virtualCardId:virtualCard?.id||null,virtualCardProviderReference:virtualCard?.provider_card_reference||null}
  });
 }catch(error){
  return res.status(503).json({error:error instanceof Error?error.message:"درگاه در دسترس نیست",providerCode});
 }
 const initialStatus=providerResult.status==="paid"?"paid_pending_review":providerResult.status==="authorized"?"authorized":"redirected";
 const pi=await query("insert into commerce_payment_intents(tenant_id,quote_id,intent_no,payment_mode,amount,currency,status,provider_code,provider_transaction_id,idempotency_key,expires_at,created_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) returning *",[t.id,q.rows[0].id,paymentNo,paymentMode,amount,currency,initialStatus,providerCode,providerResult.providerTransactionId,idem,q.rows[0].valid_until,(req as any).user.id]);
 const attempt=await query("insert into payment_gateway_attempts(tenant_id,payment_intent_id,gateway_profile_id,attempt_no,provider_code,provider_transaction_id,status,amount,currency,provider_payload,paid_at,review_deadline_at) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,now()+($12||' seconds')::interval) returning *",[t.id,pi.rows[0].id,gateway.id,idem,providerCode,providerResult.providerTransactionId,initialStatus,amount,currency,providerResult.providerPayload,initialStatus==="paid_pending_review"?new Date():null,Number(gateway.merchant_review_timeout_seconds)]);
 if(initialStatus==="paid_pending_review"){
  await query("insert into payment_merchant_reviews(tenant_id,payment_intent_id,gateway_attempt_id,status,review_deadline_at,metadata) values($1,$2,$3,'pending',$4,$5) on conflict(gateway_attempt_id) do update set status='pending',review_deadline_at=excluded.review_deadline_at,updated_at=now()",[t.id,pi.rows[0].id,attempt.rows[0].id,attempt.rows[0].review_deadline_at,JSON.stringify({source:"provider_create_payment"})]);
  return res.status(202).json({paymentIntent:pi.rows[0],attempt:attempt.rows[0],nextAction:"merchant_review"});
 }
 res.status(201).json({paymentIntent:pi.rows[0],attempt:attempt.rows[0],redirectUrl:providerResult.redirectUrl||null,nextAction:"provider_redirect"});
}));
commerceIntelligenceRouter.post("/api/payment-gateways/:gatewayId/webhook",asyncHandler(async(req,res)=>{
 const signature=str(req.header("x-gateway-signature"),256);
 const timestamp=str(req.header("x-gateway-timestamp"),40);
 const eventId=str(req.header("x-gateway-event-id"),180);
 if(!signature||!timestamp||!eventId)return res.status(400).json({error:"امضای callback ناقص است"});
 const ts=Number(timestamp);if(!Number.isFinite(ts)||Math.abs(Date.now()-ts*1000)>5*60*1000)return res.status(401).json({error:"callback منقضی یا خارج از بازه زمانی مجاز است"});
 const g=await query("select * from payment_gateway_profiles where id=$1 and enabled=true",[req.params.gatewayId]);
 if(!g.rowCount)return res.status(404).json({error:"درگاه پیدا نشد"});
 const gateway=g.rows[0];
 const ref=str(gateway.config_reference,180);
 const envKey=/^[A-Z0-9_]+$/i.test(ref)?ref:"PAYMENT_WEBHOOK_SECRET_"+String(gateway.code).replace(/[^a-zA-Z0-9]/g,"_").toUpperCase();
 const secret=process.env[envKey];
 if(!secret)return res.status(503).json({error:"کلید callback در محیط اجرا تنظیم نشده است"});
 const raw=(req as any).rawBody?String((req as any).rawBody):JSON.stringify(req.body||{});
 const expected=createHmac("sha256",secret).update(timestamp+"."+raw).digest("hex");
 const supplied=signature.replace(/^sha256=/i,"").trim();
 if(supplied.length!==expected.length||!timingSafeEqual(Buffer.from(supplied),Buffer.from(expected)))return res.status(401).json({error:"امضای callback نامعتبر است"});
 const payload=req.body||{},eventType=str(payload.eventType||payload.type||payload.status,60).toLowerCase();
 if(!["paid","success","succeeded"].includes(eventType))return res.status(202).json({accepted:true,ignored:true});
 const providerTx=str(payload.providerTransactionId||payload.transactionId||payload.referenceId,200);
 const amount=num(payload.amount);if(amount===null||!providerTx)return res.status(400).json({error:"مبلغ یا شناسه تراکنش callback ناقص است"});
 const attemptId=str(payload.attemptId||payload.merchantReference||payload.orderReference,100);
 const client=await pool.connect();
 try{
  await client.query("begin");
  const existing=await client.query("select id from payment_gateway_callback_events where gateway_profile_id=$1 and event_id=$2 for update",[gateway.id,eventId]);
  if(existing.rowCount){await client.query("commit");return res.status(200).json({accepted:true,duplicate:true})}
  const a=attemptId
   ? await client.query("select a.*,p.amount intent_amount,p.id payment_intent_id from payment_gateway_attempts a join commerce_payment_intents p on p.id=a.payment_intent_id where a.id=$1 and a.gateway_profile_id=$2 and a.tenant_id=$3 for update",[attemptId,gateway.id,gateway.tenant_id])
   : await client.query("select a.*,p.amount intent_amount,p.id payment_intent_id from payment_gateway_attempts a join commerce_payment_intents p on p.id=a.payment_intent_id where a.gateway_profile_id=$1 and a.tenant_id=$2 and a.provider_transaction_id=$3 order by a.created_at desc limit 1 for update",[gateway.id,gateway.tenant_id,providerTx]);
  if(!a.rowCount){await client.query("rollback");return res.status(404).json({error:"تلاش پرداخت مربوط به callback پیدا نشد"});}
  const x=a.rows[0];
  if(Number(x.intent_amount)!==amount||Number(x.amount)!==amount){await client.query("rollback");return res.status(409).json({error:"مبلغ callback با مبلغ قفل‌شده سامانه یکسان نیست"});}
  if(!["created","redirected"].includes(x.status)){
   await client.query("insert into payment_gateway_callback_events(tenant_id,gateway_profile_id,event_id,attempt_id,event_type,payload_hash,processed_at,metadata) values($1,$2,$3,$4,$5,$6,now(),$7)",[gateway.tenant_id,gateway.id,eventId,x.id,eventType,createHash("sha256").update(raw).digest("hex"),JSON.stringify({duplicateState:x.status})]);
   await client.query("commit");return res.status(200).json({accepted:true,alreadyProcessed:true,status:x.status});
  }
  const deadline=new Date(Date.now()+Number(gateway.merchant_review_timeout_seconds||900)*1000);
  await client.query("update payment_gateway_attempts set status='paid_pending_review',provider_transaction_id=$1,provider_payload=$2,paid_at=now(),review_deadline_at=$3,updated_at=now() where id=$4",[providerTx,payload,deadline,x.id]);
  await client.query("update commerce_payment_intents set status='paid_pending_review',provider_transaction_id=$1,updated_at=now() where id=$2",[providerTx,x.payment_intent_id]);
  await client.query("insert into payment_merchant_reviews(tenant_id,payment_intent_id,gateway_attempt_id,status,review_deadline_at,metadata) values($1,$2,$3,'pending',$4,$5) on conflict(gateway_attempt_id) do update set status='pending',review_deadline_at=excluded.review_deadline_at,updated_at=now()",[gateway.tenant_id,x.payment_intent_id,x.id,deadline,JSON.stringify({source:"signed_provider_webhook",eventId})]);
  await client.query("insert into payment_gateway_callback_events(tenant_id,gateway_profile_id,event_id,attempt_id,event_type,payload_hash,processed_at) values($1,$2,$3,$4,$5,$6,now())",[gateway.tenant_id,gateway.id,eventId,x.id,eventType,createHash("sha256").update(raw).digest("hex")]);
  await client.query("commit");return res.status(202).json({accepted:true,status:"paid_pending_review",nextAction:"merchant_review"});
 }catch(e){await client.query("rollback").catch(()=>{});throw e}finally{client.release()}
}));

commerceIntelligenceRouter.post("/api/payment-gateway-attempts/:id/provider-paid",requireAuth,requirePermission("payment:manage"),requireCsrf,asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});const a=await query("select a.*,p.amount intent_amount from payment_gateway_attempts a join commerce_payment_intents p on p.id=a.payment_intent_id where a.id=$1 and a.tenant_id=$2 for update",[req.params.id,t.id]);if(!a.rowCount)return res.status(404).json({error:"تلاش پرداخت پیدا نشد"});
 if(!["created","redirected"].includes(a.rows[0].status))return res.status(409).json({error:"وضعیت پرداخت قابل تغییر نیست"});
 const providerAmount=num(req.body?.amount);if(providerAmount===null||providerAmount!==Number(a.rows[0].intent_amount))return res.status(409).json({error:"مبلغ پرداخت با مبلغ سامانه یکسان نیست"});
 const cfg=await query("select merchant_review_timeout_seconds from payment_gateway_profiles where id=$1 and tenant_id=$2",[a.rows[0].gateway_profile_id,t.id]);
 const timeout=Number(cfg.rows[0]?.merchant_review_timeout_seconds)||900;
 const r=await query("update payment_gateway_attempts set status='paid_pending_review',provider_transaction_id=$1,provider_payload=$2,paid_at=now(),review_deadline_at=now()+($3||' seconds')::interval,updated_at=now() where id=$4 returning *",[str(req.body?.providerTransactionId,200)||null,req.body?.providerPayload||{},timeout,a.rows[0].id]);
 await query("update commerce_payment_intents set status='paid_pending_review',provider_transaction_id=$1,updated_at=now() where id=$2",[r.rows[0].provider_transaction_id,a.rows[0].payment_intent_id]);
 const review=await query("insert into payment_merchant_reviews(tenant_id,payment_intent_id,gateway_attempt_id,status,review_deadline_at,metadata) values($1,$2,$3,'pending',$4,$5) on conflict(gateway_attempt_id) do update set status='pending',review_deadline_at=excluded.review_deadline_at,updated_at=now() returning *",[t.id,a.rows[0].payment_intent_id,a.rows[0].id,r.rows[0].review_deadline_at,JSON.stringify({source:"provider_callback"})]);
 res.status(202).json({attempt:r.rows[0],review:review.rows[0],nextAction:"merchant_review"});
}));
commerceIntelligenceRouter.post("/api/payment-merchant-reviews/:id/decision",requireAuth,requirePermission("payment-review:manage"),requireCsrf,asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const decision=req.body?.decision;if(!["approved","rejected"].includes(decision))return res.status(400).json({error:"تصمیم نامعتبر است"});
 const client=await pool.connect();try{
  await client.query("begin");
  const r=await client.query("select r.*,a.status attempt_status,a.provider_transaction_id,p.quote_id,p.amount from payment_merchant_reviews r join payment_gateway_attempts a on a.id=r.gateway_attempt_id join commerce_payment_intents p on p.id=r.payment_intent_id where r.id=$1 and r.tenant_id=$2 for update",[req.params.id,t.id]);
  if(!r.rowCount){await client.query("rollback");return res.status(404).json({error:"بررسی پرداخت پیدا نشد"});}
  const x=r.rows[0];if(x.status!=="pending"||x.attempt_status!=="paid_pending_review"){await client.query("rollback");return res.status(409).json({error:"این پرداخت دیگر در انتظار بررسی نیست"});}
  if(new Date(x.review_deadline_at)<=new Date()){await client.query("rollback");return res.status(409).json({error:"مهلت بررسی پرداخت تمام شده است"});}
  if(decision==="approved"){
   await client.query("update payment_merchant_reviews set status='approved',availability_confirmed=true,decided_by=$1,decided_at=now(),decision_reason=$2,updated_at=now() where id=$3",[ (req as any).user.id,str(req.body?.reason,500)||"تأیید موجودی",x.id]);
   await client.query("update payment_gateway_attempts set status='verified',verified_at=now(),updated_at=now() where id=$1",[x.gateway_attempt_id]);
   await client.query("update commerce_payment_intents set status='paid',updated_at=now() where id=$1",[x.payment_intent_id]);
   await client.query("update commerce_purchase_quotes set status='ready',updated_at=now() where id=$1",[x.quote_id]);
   await client.query("commit");return res.json({status:"verified",paymentIntentId:x.payment_intent_id,quoteId:x.quote_id,nextAction:"convert_order"});
  }
  await client.query("update payment_merchant_reviews set status='reversal_pending',availability_confirmed=false,decided_by=$1,decided_at=now(),decision_reason=$2,reversal_reason=$2,updated_at=now() where id=$3",[(req as any).user.id,str(req.body?.reason,500)||"عدم موجودی",x.id]);
  await client.query("update payment_gateway_attempts set status='reversal_pending',reversal_requested_at=now(),updated_at=now() where id=$1",[x.gateway_attempt_id]);
  await client.query("update commerce_payment_intents set status='reversal_pending',updated_at=now() where id=$1",[x.payment_intent_id]);
  await client.query("commit");res.status(202).json({status:"reversal_pending",paymentIntentId:x.payment_intent_id,quoteId:x.quote_id,nextAction:"provider_reversal"});
 }catch(e){await client.query("rollback");throw e}finally{client.release();}
}));
commerceIntelligenceRouter.get("/api/payment-merchant-reviews",requireAuth,requirePermission("payment-review:read"),asyncHandler(async(req,res)=>{
 const t=await tenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const rows=await query("select r.*,a.attempt_no,a.amount,a.currency,a.provider_transaction_id,p.intent_no,p.quote_id from payment_merchant_reviews r join payment_gateway_attempts a on a.id=r.gateway_attempt_id join commerce_payment_intents p on p.id=r.payment_intent_id where r.tenant_id=$1 order by r.created_at desc limit 200",[t.id]);res.json({reviews:rows.rows});
}));
