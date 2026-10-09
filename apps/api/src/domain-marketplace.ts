import {Router} from "express";
import {pool,query} from "./db.js";
import {requireAuth,requirePermission} from "./auth.js";
import {asyncHandler} from "./http.js";
import {resolveTenant,resolvePublicTenant} from "./tenant-context.js";
import {emitBusinessEvent} from "./business-events.js";
import {getDigikalaCatalog, type DigikalaCatalogProduct} from "./digikala-catalog.js";
import {randomUUID} from "node:crypto";
import {mkdir,writeFile} from "node:fs/promises";
import path from "node:path";

export const domainMarketplaceRouter=Router();

type User={id:string;role:string};
type TenantContext={id:string;name:string;code:string};

async function tenantContext(req:any,user:User):Promise<TenantContext|null>{return resolveTenant(req,user);}
function bodyString(value:unknown,max=500){return typeof value==="string"?value.trim().slice(0,max):""}
function canonicalMarketplaceCategory(value:unknown):string{
 const key=typeof value==="string"?value.normalize("NFKC").replace(/[يى]/g,"ی").replace(/ك/g,"ک").trim().toLocaleLowerCase("fa"):"";
 const aliases:Array<[RegExp,string]>=[
  [/موبایل|گوشی|تبلت|mobile|phone|tablet/,"موبایل و تبلت"],
  [/لپ.?تاپ|کامپیوتر|مانیتور|computer|laptop/,"لپ‌تاپ و کامپیوتر"],
  [/خانه|آشپزخانه|لوازم خانگی|home|kitchen/,"خانه و آشپزخانه"],
  [/پوشاک|لباس|کفش|مد|fashion|apparel|clothing/,"مد و پوشاک"],
  [/زیبایی|آرایش|بهداشت|سلامت|beauty|health/,"زیبایی و سلامت"],
  [/صوتی|تصویری|هدفون|اسپیکر|audio|video/,"صوتی و تصویری"],
  [/ورزش|سفر|sport|travel/,"ورزش و سفر"],
  [/کتاب|لوازم.?التحریر|stationery|book/,"کتاب و لوازم‌التحریر"],
  [/کودک|نوزاد|baby|kid/,"کودک و نوزاد"],
  [/خودرو|ابزار|car|auto|tool/,"خودرو و ابزار"],
  [/سوپرمارکت|خوراک|مواد غذایی|grocery|supermarket/,"سوپرمارکت"],
  [/اداری|لوازم دفتر|office/,"لوازم اداری"]
 ];
 return aliases.find(([pattern])=>pattern.test(key))?.[1]||"سایر کالاها";
}
function bodyNumber(value:unknown){const n=Number(value);return Number.isFinite(n)?n:null}

domainMarketplaceRouter.get("/api/tenancy/context",requireAuth,asyncHandler(async(req,res)=>{
  const user=(req as any).user as User;
  const ctx=await tenantContext(req,user);
  if(!ctx)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
  const choices=user.role==="admin"
    ?(await query("select id,name,code from tenants where status='active' order by name")).rows
    :(await query("select t.id,t.name,t.code from tenants t join user_tenants ut on ut.tenant_id=t.id where ut.user_id=$1 and t.status='active' order by t.name",[user.id])).rows;
  res.json({current:ctx,items:choices});
}));

domainMarketplaceRouter.get("/api/tenancy/tenants",requireAuth,requirePermission("tenant:view"),asyncHandler(async(req,res)=>{
  const user=(req as any).user as User;
  const r=user.role==="admin"
    ?await query("select id,code,name,status,created_at,updated_at from tenants order by created_at desc")
    :await query("select t.id,t.code,t.name,t.status,t.created_at,t.updated_at from tenants t join user_tenants ut on ut.tenant_id=t.id where ut.user_id=$1 order by t.created_at desc",[user.id]);
  res.json({items:r.rows,total:r.rowCount});
}));

domainMarketplaceRouter.post("/api/tenancy/tenants",requireAuth,requirePermission("tenant:manage"),asyncHandler(async(req,res)=>{
  const code=bodyString(req.body?.code,100),name=bodyString(req.body?.name,200);
  if(!code||!name)return res.status(400).json({error:"کد و نام مستاجر الزامی است"});
  const r=await query("insert into tenants(code,name) values($1,$2) returning *",[code,name]);
  res.status(201).json(r.rows[0]);
}));

domainMarketplaceRouter.get("/api/marketplace/sellers",requireAuth,requirePermission("seller:view"),asyncHandler(async(req,res)=>{
  const ctx=await tenantContext(req,(req as any).user);
  if(!ctx)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
  const r=await query("select id,legal_name,display_name,status,commission_rate,created_at,updated_at from sellers where tenant_id=$1 order by created_at desc",[ctx.id]);
  res.json({tenant:ctx,items:r.rows,total:r.rowCount});
}));

domainMarketplaceRouter.post("/api/marketplace/sellers",requireAuth,requirePermission("seller:manage"),asyncHandler(async(req,res)=>{
  const ctx=await tenantContext(req,(req as any).user);
  if(!ctx)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
  const legal=bodyString(req.body?.legalName,250),display=bodyString(req.body?.displayName,250);
  const rate=bodyNumber(req.body?.commissionRate??0);
  if(!legal||!display||rate===null||rate<0||rate>100)return res.status(400).json({error:"اطلاعات فروشنده نامعتبر است"});
  const r=await query("insert into sellers(tenant_id,legal_name,display_name,commission_rate) values($1,$2,$3,$4) returning *",[ctx.id,legal,display,rate]);
  res.status(201).json(r.rows[0]);
}));

domainMarketplaceRouter.get("/api/marketplace/stores",requireAuth,requirePermission("store:view"),asyncHandler(async(req,res)=>{
  const ctx=await tenantContext(req,(req as any).user);
  if(!ctx)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
  const r=await query("select s.id,s.code,s.name,s.slug,s.status,s.domain,s.seller_id,sl.display_name as seller_name from stores s join sellers sl on sl.id=s.seller_id where s.tenant_id=$1 order by s.created_at desc",[ctx.id]);
  res.json({tenant:ctx,items:r.rows,total:r.rowCount});
}));

domainMarketplaceRouter.post("/api/marketplace/stores",requireAuth,requirePermission("store:manage"),asyncHandler(async(req,res)=>{
  const ctx=await tenantContext(req,(req as any).user);
  if(!ctx)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
  const seller=bodyString(req.body?.sellerId,100),code=bodyString(req.body?.code,100),name=bodyString(req.body?.name,200),slug=bodyString(req.body?.slug,120);
  if(!seller||!code||!name||!slug)return res.status(400).json({error:"اطلاعات فروشگاه ناقص است"});
  const owned=await query("select id from sellers where id=$1 and tenant_id=$2",[seller,ctx.id]);
  if(!owned.rowCount)return res.status(404).json({error:"فروشنده در این محدوده پیدا نشد"});
  const r=await query("insert into stores(tenant_id,seller_id,code,name,slug) values($1,$2,$3,$4,$5) returning *",[ctx.id,seller,code,name,slug]);
  res.status(201).json(r.rows[0]);
}));

domainMarketplaceRouter.get("/api/marketplace/products",requireAuth,requirePermission("product:view"),asyncHandler(async(req,res)=>{
  const ctx=await tenantContext(req,(req as any).user);
  if(!ctx)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
  const q=bodyString(req.query.q,150);
  const params:any[]=[ctx.id];
  let where="p.tenant_id=$1";
  if(q){params.push("%"+q+"%");where+=" and (p.title ilike $2 or p.sku ilike $2)";}
  const r=await query("select p.id,p.sku,p.title,p.description,p.category,p.price,p.currency,p.status,p.seller_id,p.store_id,COALESCE(p.attributes->>'imageUrl',p.attributes->>'image_url',p.attributes->>'primaryImage',p.attributes->>'primary_image') as image_url,sl.display_name as seller_name from products p join sellers sl on sl.id=p.seller_id where "+where+" order by p.updated_at desc",params);
  res.json({tenant:ctx,items:r.rows,total:r.rowCount});
}));

domainMarketplaceRouter.post("/api/marketplace/products",requireAuth,requirePermission("product:manage"),asyncHandler(async(req,res)=>{
  const ctx=await tenantContext(req,(req as any).user);
  if(!ctx)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
  const seller=bodyString(req.body?.sellerId,100),sku=bodyString(req.body?.sku,120),title=bodyString(req.body?.title,250);
  const price=bodyNumber(req.body?.price);
  if(!seller||!sku||!title||price===null||price<0)return res.status(400).json({error:"اطلاعات محصول نامعتبر است"});
  const owned=await query("select id from sellers where id=$1 and tenant_id=$2",[seller,ctx.id]);
  if(!owned.rowCount)return res.status(404).json({error:"فروشنده در این محدوده پیدا نشد"});
  const r=await query("insert into products(tenant_id,seller_id,store_id,sku,title,description,category,price,currency,status,attributes) values($1,$2,$3,$4,$5,$6,$7,$8,$9,'draft',$10) returning *",[ctx.id,seller,bodyString(req.body?.storeId,100)||null,sku,title,bodyString(req.body?.description,2000)||null,bodyString(req.body?.category,200)||null,price,bodyString(req.body?.currency,10)||"IRR",req.body?.attributes&&typeof req.body.attributes==="object"?req.body.attributes:{}]);
  res.status(201).json(r.rows[0]);
}));

domainMarketplaceRouter.get("/api/marketplace/orders",requireAuth,requirePermission("order:view"),asyncHandler(async(req,res)=>{
  const ctx=await tenantContext(req,(req as any).user);
  if(!ctx)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
  const r=await query("select id,order_no,store_id,seller_id,customer_ref,status,currency,subtotal,discount_amount,shipping_amount,total_amount,commission_amount,seller_payable,payment_method,delivery_due_at,created_at,updated_at from marketplace_orders where tenant_id=$1 order by created_at desc",[ctx.id]);
  res.json({tenant:ctx,items:r.rows,total:r.rowCount});
}));

domainMarketplaceRouter.post("/api/marketplace/orders",requireAuth,requirePermission("order:manage"),asyncHandler(async(req,res)=>{
  const ctx=await tenantContext(req,(req as any).user);
  if(!ctx)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
  const storeId=bodyString(req.body?.storeId,100),sellerId=bodyString(req.body?.sellerId,100),orderNo=bodyString(req.body?.orderNo,100);
  const subtotal=bodyNumber(req.body?.subtotal);
  if(!storeId||!sellerId||!orderNo||subtotal===null||subtotal<0)return res.status(400).json({error:"اطلاعات سفارش نامعتبر است"});
  const ownership=await query("select 1 from stores where id=$1 and tenant_id=$2 and seller_id=$3",[storeId,ctx.id,sellerId]);
  if(!ownership.rowCount)return res.status(404).json({error:"فروشگاه متعلق به این محدوده یا فروشنده نیست"});
  const discount=bodyNumber(req.body?.discountAmount??0)??0;
  const shipping=bodyNumber(req.body?.shippingAmount??0)??0;
  const total=Math.max(0,subtotal-discount+shipping);
  const seller=await query("select commission_rate from sellers where id=$1 and tenant_id=$2",[sellerId,ctx.id]);
  if(!seller.rowCount)return res.status(404).json({error:"فروشنده پیدا نشد"});
  const commission=Number((total*Number(seller.rows[0].commission_rate)/100).toFixed(2));
  const payable=Math.max(0,total-commission);
  const r=await query("insert into marketplace_orders(tenant_id,store_id,seller_id,order_no,customer_ref,subtotal,discount_amount,shipping_amount,total_amount,commission_amount,seller_payable,payment_method,delivery_due_at) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) returning *",[ctx.id,storeId,sellerId,orderNo,bodyString(req.body?.customerRef,200)||null,subtotal,discount,shipping,total,commission,payable,bodyString(req.body?.paymentMethod,50)||null,req.body?.deliveryDueAt||null]);
  res.status(201).json(r.rows[0]);
}));

domainMarketplaceRouter.patch("/api/marketplace/orders/:id/status",requireAuth,requirePermission("order:lifecycle"),asyncHandler(async(req,res)=>{
 const ctx=await tenantContext(req,(req as any).user);
 if(!ctx)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const next=bodyString(req.body?.status,30);
 const reason=bodyString(req.body?.reason,500)||null;
 const allowed:Record<string,string[]>={
  pending:["confirmed","cancelled"],
  confirmed:["paid","cancelled"],
  paid:["processing","refunded"],
  processing:["shipped","returned"],
  shipped:["delivered","returned"],
  delivered:["returned","refunded"],
  returned:["refunded"],
  cancelled:[],
  refunded:[]
 };
 const client=await pool.connect();
 try{
  await client.query("begin");
  const current=await client.query("select * from marketplace_orders where id=$1 and tenant_id=$2 for update",[req.params.id,ctx.id]);
  if(!current.rowCount){await client.query("rollback");return res.status(404).json({error:"سفارش پیدا نشد"});}
  const order=current.rows[0];
  if(!allowed[order.status]?.includes(next)){
   await client.query("rollback");
   return res.status(409).json({error:"تغییر وضعیت سفارش مجاز نیست",from:order.status,to:next});
  }
  if(next==="cancelled"&&["paid","processing"].includes(order.status)){
   await client.query("rollback");
   return res.status(409).json({error:"لغو سفارش پرداخت‌شده باید از مسیر بازپرداخت انجام شود"});
  }
  const nowColumn:Record<string,string>={
   confirmed:"confirmed_at",paid:"paid_at",processing:"processing_at",
   shipped:"shipped_at",delivered:"delivered_at",cancelled:"cancelled_at"
  };
  const column=nowColumn[next];
  const set=column
   ? `status=$1,updated_at=now(),${column}=now()${next==="cancelled"?",cancellation_reason=$2":""}`
   : "status=$1,updated_at=now()";
  const params=next==="cancelled"?[next,reason,order.id,ctx.id]:[next,order.id,ctx.id];
  const sql=next==="cancelled"
   ? `update marketplace_orders set ${set} where id=$3 and tenant_id=$4 returning *`
   : `update marketplace_orders set ${set} where id=$2 and tenant_id=$3 returning *`;
  const updated=await client.query(sql,params);
  await client.query("insert into platform_audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,before_data,after_data) values($1,$2,$3,'marketplace_order',$4,$5,$6)",[
   ctx.id,(req as any).user.id,"order.status."+next,order.id,JSON.stringify({status:order.status}),JSON.stringify({status:next})
  ]);
  if(next==="processing"){
   await client.query(
    `insert into sla_cases(tenant_id,subject_type,subject_id,status,due_at,metadata)
     values($1,'marketplace_order',$2,'open',$3,$4)
     on conflict do nothing`,
    [ctx.id,order.id,order.delivery_due_at,JSON.stringify({stage:"processing",orderNo:order.order_no})]
   );
  }
  await client.query("commit");
  const eventMap:Record<string,string>={
   confirmed:"order.confirmed",paid:"payment.paid",processing:"order.processing",
   shipped:"order.shipped",delivered:"order.delivered",cancelled:"order.cancelled",
   returned:"order.returned",refunded:"order.refunded"
  };
  const eventKey=eventMap[next];
  if(eventKey)await emitBusinessEvent({
   tenantId:ctx.id,eventKey,subjectType:"marketplace_order",subjectId:order.id,
   userId:(req as any).user.id,input:{orderId:order.id,orderNo:order.order_no,status:next,previousStatus:order.status}
  });
  res.json({order:updated.rows[0]});
 }catch(e){await client.query("rollback");throw e;}finally{client.release();}
}));

domainMarketplaceRouter.get("/api/marketplace/settlements",requireAuth,requirePermission("settlement:view"),asyncHandler(async(req,res)=>{
  const ctx=await tenantContext(req,(req as any).user);
  if(!ctx)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
  const r=await query("select id,settlement_no,seller_id,period_start,period_end,gross_amount,commission_amount,adjustment_amount,net_amount,status,created_at,updated_at from seller_settlements where tenant_id=$1 order by created_at desc",[ctx.id]);
  res.json({tenant:ctx,items:r.rows,total:r.rowCount});
}));


domainMarketplaceRouter.get("/api/marketplace/categories",requireAuth,requirePermission("category:view"),asyncHandler(async(req,res)=>{
  const ctx=await tenantContext(req,(req as any).user);
  if(!ctx)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
  const result=await query(
    "select id,code,name,status,sort_order from marketplace_categories where tenant_id=$1 order by sort_order,name",
    [ctx.id]
  );
  res.json({tenant:ctx,items:result.rows,total:result.rowCount});
}));

domainMarketplaceRouter.get("/api/public/digikala-catalog",asyncHandler(async(_req,res)=>{
  const catalog=await getDigikalaCatalog();
  res.setHeader("Cache-Control","public, max-age=120, stale-while-revalidate=600");
  res.json({
    source:"digikala",
    sourceLabel:"دیجی‌کالا",
    sourceStatus:catalog.sourceStatus,
    fetchedAt:catalog.fetchedAt,
    products:catalog.products,
    total:catalog.products.length
  });
}));

domainMarketplaceRouter.post("/api/marketplace/products/import-reference",requireAuth,requirePermission("product:manage"),asyncHandler(async(req,res)=>{
  const ctx=await tenantContext(req,(req as any).user);
  if(!ctx)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
  const sellerId=bodyString(req.body?.sellerId,100);
  const selectedIds=Array.isArray(req.body?.productIds)
    ?[...new Set(req.body.productIds.filter((value:unknown):value is string=>typeof value==="string").map((value:string)=>value.trim()).filter(Boolean))].slice(0,50)
    :[];
  if(!sellerId||!selectedIds.length)return res.status(400).json({error:"فروشنده و حداقل یک محصول برای ورود انتخاب کنید"});
  const seller=await query("select id,display_name,status from sellers where id=$1 and tenant_id=$2",[sellerId,ctx.id]);
  if(!seller.rowCount)return res.status(404).json({error:"فروشنده در این محدوده سازمانی پیدا نشد"});
  const catalog=await getDigikalaCatalog();
  const selected=catalog.products.filter(product=>selectedIds.includes(product.id));
  if(!selected.length)return res.status(404).json({error:"محصول انتخاب‌شده در فهرست مرجع فعلی وجود ندارد؛ فهرست را تازه‌سازی کنید"});
  const mediaRoot=process.env.MEDIA_ROOT||"/app/media";
  const mediaDir=path.join(mediaRoot,"catalog",ctx.id);
  await mkdir(mediaDir,{recursive:true});
  const imported:string[]=[];
  const skipped:string[]=[];
  for(const product of selected){
    let localImage:string|null=null;
    try{
      const imageUrl=new URL(product.image_url);
      if(imageUrl.protocol!=="https:"||imageUrl.hostname!=="dkstatics-public.digikala.com")throw new Error("منبع تصویر مجاز نیست");
      const imageResponse=await fetch(imageUrl,{redirect:"error",signal:AbortSignal.timeout(8000),headers:{accept:"image/avif,image/webp,image/png,image/jpeg"}});
      const contentType=(imageResponse.headers.get("content-type")||"").split(";")[0].trim().toLowerCase();
      const extension:Record<string,string>={"image/jpeg":"jpg","image/png":"png","image/webp":"webp","image/avif":"avif"};
      const size=Number(imageResponse.headers.get("content-length")||0);
      if(!imageResponse.ok||!extension[contentType]||(size>0&&size>5*1024*1024))throw new Error("تصویر معتبر یا در محدوده مجاز نیست");
      const bytes=Buffer.from(await imageResponse.arrayBuffer());
      if(bytes.length===0||bytes.length>5*1024*1024)throw new Error("حجم تصویر معتبر نیست");
      const filename=randomUUID()+"."+extension[contentType];
      await writeFile(path.join(mediaDir,filename),bytes,{flag:"wx"});
      localImage="/api/public/media/catalog/"+ctx.id+"/"+filename;
    }catch{
      skipped.push(product.sku+": تصویر از منبع قابل دریافت نبود");
      continue;
    }
    const attributes={
      imageUrl:localImage,
      sourceName:product.source_name,
      sourceUrl:product.source_url,
      sourceType:"reference-import",
      sourceProductId:product.id,
      brand:product.brand,
      rating:product.rating,
      importedAt:new Date().toISOString(),
      priceReviewRequired:true
    };
    const result=await query(
      "insert into products(tenant_id,seller_id,sku,title,description,category,price,currency,status,attributes) values($1,$2,$3,$4,$5,$6,$7,$8,'draft',$9::jsonb) on conflict(tenant_id,sku) do nothing returning id,sku,title,status",
      [ctx.id,sellerId,product.sku,product.title,product.description,canonicalMarketplaceCategory(product.category),Number(product.price),product.currency,JSON.stringify(attributes)]
    );
    if(result.rowCount){
      await query(
        "insert into catalog_source_links(tenant_id,product_id,source_name,source_product_id,source_sku,source_url,source_currency,source_price,source_available,last_checked_at,last_success_at) values($1,$2,$3,$4,$5,$6,$7,$8,$9,now(),now()) on conflict(tenant_id,source_name,source_product_id) do nothing",
        [ctx.id,result.rows[0].id,product.source_name,product.id,product.sku,product.source_url,product.currency,Number(product.price),product.source_available]
      );
      imported.push(product.sku);
    }else{
      const existing=await query("select id from products where tenant_id=$1 and sku=$2",[ctx.id,product.sku]);
      if(existing.rowCount){
        await query(
          "insert into catalog_source_links(tenant_id,product_id,source_name,source_product_id,source_sku,source_url,source_currency,source_price,source_available,last_checked_at,last_success_at) values($1,$2,$3,$4,$5,$6,$7,$8,$9,now(),now()) on conflict(tenant_id,source_name,source_product_id) do nothing",
          [ctx.id,existing.rows[0].id,product.source_name,product.id,product.sku,product.source_url,product.currency,Number(product.price),product.source_available]
        );
      }
      skipped.push(product.sku+": شناسه کالا از قبل در کاتالوگ ثبت شده است");
    }
  }
  res.status(201).json({imported,skipped,totalImported:imported.length,totalSkipped:skipped.length,status:"draft",message:"محصولات در کاتالوگ داخلی ثبت شدند؛ قیمت و اطلاعات باید بررسی شوند و هیچ محصولی خودکار منتشر نشده است"});
}));

domainMarketplaceRouter.get("/api/marketplace/products/source-sync",requireAuth,requirePermission("product:view"),asyncHandler(async(req,res)=>{
  const ctx=await tenantContext(req,(req as any).user);
  if(!ctx)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
  const [links,runs]=await Promise.all([
    query("select l.id,l.product_id,l.source_name,l.source_product_id,l.source_sku,l.source_url,l.source_currency,l.source_price,l.source_available,l.price_policy,l.markup_percent,l.last_checked_at,l.last_success_at,l.last_error,p.sku,p.title,p.price as sale_price,p.status as product_status from catalog_source_links l join products p on p.id=l.product_id and p.tenant_id=l.tenant_id where l.tenant_id=$1 order by l.updated_at desc limit 500",[ctx.id]),
    query("select id,source_name,status,requested_count,matched_count,updated_count,skipped_count,failed_count,started_at,finished_at,summary from catalog_source_sync_runs where tenant_id=$1 order by started_at desc limit 20",[ctx.id])
  ]);
  res.json({items:links.rows,runs:runs.rows,total:links.rowCount});
}));

domainMarketplaceRouter.post("/api/marketplace/products/:productId/source-policy",requireAuth,requirePermission("product:manage"),asyncHandler(async(req,res)=>{
  const ctx=await tenantContext(req,(req as any).user);
  if(!ctx)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
  const policy=bodyString(req.body?.pricePolicy,20);
  const markup=bodyNumber(req.body?.markupPercent);
  if(!["manual","mirror","markup"].includes(policy))return res.status(400).json({error:"سیاست قیمت باید manual، mirror یا markup باشد"});
  if(policy==="markup"&&(markup===null||markup < -100||markup > 10000))return res.status(400).json({error:"درصد تعدیل قیمت باید بین منفی ۱۰۰ تا ۱۰۰۰۰ باشد"});
  const result=await query(
    "update catalog_source_links set price_policy=$1,markup_percent=$2,updated_at=now() where tenant_id=$3 and product_id=$4 returning id,product_id,source_name,source_product_id,price_policy,markup_percent",
    [policy,policy==="markup"?markup:0,ctx.id,req.params.productId]
  );
  if(!result.rowCount)return res.status(404).json({error:"پیوند منبع برای این محصول پیدا نشد"});
  res.json({item:result.rows[0],message:"سیاست ثبت شد؛ قیمت فروش فقط در همگام‌سازی بعدی و مطابق سیاست انتخاب‌شده تغییر می‌کند"});
}));

domainMarketplaceRouter.post("/api/marketplace/products/sync-reference",requireAuth,requirePermission("product:manage"),asyncHandler(async(req,res)=>{
  const user=(req as any).user as User;
  const ctx=await tenantContext(req,user);
  if(!ctx)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
  const requested: string[] = Array.isArray(req.body?.sourceProductIds)
    ? [...new Set<string>(req.body.sourceProductIds.filter((value: unknown): value is string => typeof value === "string").map((value: string) => value.trim()).filter(Boolean))].slice(0, 50)
    : [];
  if(!requested.length)return res.status(400).json({error:"حداقل یک شناسه محصول منبع انتخاب کنید؛ حداکثر ۵۰ مورد در هر نوبت"});
  const run=await query("insert into catalog_source_sync_runs(tenant_id,source_name,status,requested_count,created_by) values($1,'دیجی‌کالا','running',$2,$3) returning id",[ctx.id,requested.length,user.id||null]);
  const runId=run.rows[0].id as string;
  const catalog=await getDigikalaCatalog(true);
  if(catalog.sourceStatus!=="live"){
    await query("update catalog_source_sync_runs set status='failed',failed_count=$1,finished_at=now(),summary=$2::jsonb where id=$3 and tenant_id=$4",[requested.length,JSON.stringify({reason:"reference_source_unavailable"}),runId,ctx.id]);
    return res.status(503).json({error:"منبع مرجع فعلاً در دسترس نیست؛ قیمت فروش و موجودی داخلی بدون تغییر باقی ماند",runId});
  }
  const sourceMap=new Map<string,DigikalaCatalogProduct>(catalog.products.map((product):[string,DigikalaCatalogProduct]=>[product.id,product]));
  let matched=0,updated=0,skipped=0,failed=0;
  const details:Array<{sourceProductId:string;status:string;message?:string}>=[];
  for(const sourceId of requested){
    const source=sourceMap.get(sourceId);
    if(!source){skipped++;details.push({sourceProductId:sourceId,status:"skipped",message:"در فهرست تازه‌شده منبع یافت نشد"});continue;}
    try{
      const link=await query(
        "select l.id,l.product_id,l.price_policy,l.markup_percent from catalog_source_links l where l.tenant_id=$1 and l.source_name=$2 and l.source_product_id=$3",
        [ctx.id,source.source_name,source.id]
      );
      if(!link.rowCount){skipped++;details.push({sourceProductId:sourceId,status:"skipped",message:"این محصول هنوز به کاتالوگ داخلی وارد نشده است"});continue;}
      matched++;
      const entry=link.rows[0];
      await query(
        "update catalog_source_links set source_price=$1,source_currency=$2,source_available=$3,source_url=$4,source_sku=$5,last_checked_at=now(),last_success_at=now(),last_error=null,updated_at=now() where id=$6 and tenant_id=$7",
        [Number(source.price),source.currency,source.source_available,source.source_url,source.sku,entry.id,ctx.id]
      );
      if(entry.price_policy==="mirror"){
        await query("update products set price=$1,updated_at=now() where id=$2 and tenant_id=$3",[Number(source.price),entry.product_id,ctx.id]);
      }else if(entry.price_policy==="markup"){
        const margin=Number(entry.markup_percent||0);
        const computed=Math.max(0,Math.round(Number(source.price)*(1+margin/100)));
        await query("update products set price=$1,updated_at=now() where id=$2 and tenant_id=$3",[computed,entry.product_id,ctx.id]);
      }
      updated++;details.push({sourceProductId:sourceId,status:"updated"});
    }catch(error){
      failed++;
      const message=error instanceof Error?error.message.slice(0,300):"خطای ناشناخته";
      await query("update catalog_source_links set last_checked_at=now(),last_error=$1,updated_at=now() where tenant_id=$2 and source_name=$3 and source_product_id=$4",[message,ctx.id,source.source_name,source.id]).catch(()=>undefined);
      details.push({sourceProductId:sourceId,status:"failed",message});
    }
  }
  const status=failed===0?"succeeded":updated>0?"partial":"failed";
  await query(
    "update catalog_source_sync_runs set status=$1,matched_count=$2,updated_count=$3,skipped_count=$4,failed_count=$5,finished_at=now(),summary=$6::jsonb where id=$7 and tenant_id=$8",
    [status,matched,updated,skipped,failed,JSON.stringify({sourceFetchedAt:catalog.fetchedAt,details}),runId,ctx.id]
  );
  res.json({runId,status,sourceFetchedAt:catalog.fetchedAt,requestedCount:requested.length,matchedCount:matched,updatedCount:updated,skippedCount:skipped,failedCount:failed,details,message:"قیمت مرجع جداگانه ثبت شد؛ موجودی داخلی تغییر نکرد. قیمت فروش فقط برای سیاست mirror یا markup تغییر می‌کند."});
}));

domainMarketplaceRouter.post("/api/marketplace/media",requireAuth,requirePermission("product:manage"),asyncHandler(async(req,res)=>{
  const ctx=await tenantContext(req,(req as any).user);
  if(!ctx)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
  const dataUrl=typeof req.body?.dataUrl==="string"?req.body.dataUrl:"";
  if(dataUrl.length>7*1024*1024)return res.status(413).json({error:"حجم تصویر از ۵ مگابایت بیشتر است"});
  const match=dataUrl.match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/);
  if(!match)return res.status(400).json({error:"فقط تصویر JPG، PNG یا WebP پذیرفته می‌شود"});
  const bytes=Buffer.from(match[2],"base64");
  if(!bytes.length||bytes.length>5*1024*1024)return res.status(413).json({error:"حجم تصویر باید حداکثر ۵ مگابایت باشد"});
  const valid=match[1]==="jpeg"
    ?bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff
    :match[1]==="png"
      ?bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
      :bytes.subarray(0,4).toString("ascii")==="RIFF"&&bytes.subarray(8,12).toString("ascii")==="WEBP";
  if(!valid)return res.status(400).json({error:"محتوای فایل با نوع تصویر اعلام‌شده مطابقت ندارد"});
  const extension=match[1]==="jpeg"?"jpg":match[1];
  const filename=randomUUID()+"."+extension;
  const directory=path.join(process.env.MEDIA_ROOT||"/app/media","catalog",ctx.id);
  await mkdir(directory,{recursive:true});
  await writeFile(path.join(directory,filename),bytes,{flag:"wx"});
  res.status(201).json({imageUrl:"/api/public/media/catalog/"+ctx.id+"/"+filename,contentType:"image/"+match[1],size:bytes.length});
}));

domainMarketplaceRouter.get("/api/public/marketplace",asyncHandler(async(req,res)=>{
  const requestedCode=bodyString(req.query.tenantCode,80)||bodyString(req.query.tenant,80)||undefined;
  const tenant=await resolvePublicTenant(req,requestedCode);
  if(!tenant)return res.status(404).json({error:"بازارگاه فعال پیدا نشد",products:[],stores:[],categories:[],total:0});
  const tenantId=tenant.id;
  const [stores,products,categoryRows]=await Promise.all([
    query(
      "select s.id,s.name,s.slug,s.domain,s.seller_id,sl.display_name as seller_name from stores s join sellers sl on sl.id=s.seller_id and sl.tenant_id=s.tenant_id where s.tenant_id=$1 and s.status='active' and sl.status='active' order by s.name limit 500",
      [tenantId]
    ),
    query(
      "select p.id,p.sku,p.title,p.description,p.category,p.price,p.currency,p.store_id,p.seller_id,COALESCE(p.attributes->>'imageUrl',p.attributes->>'image_url',p.attributes->>'primaryImage',p.attributes->>'primary_image') as image_url,sl.display_name as seller_name from products p join sellers sl on sl.id=p.seller_id and sl.tenant_id=p.tenant_id left join stores st on st.id=p.store_id and st.tenant_id=p.tenant_id where p.tenant_id=$1 and p.status='active' and sl.status='active' and (p.store_id is null or st.status='active') order by p.updated_at desc limit 1000",
      [tenantId]
    ),
    query(
      "select name from marketplace_categories where tenant_id=$1 and status='active' order by sort_order,name",
      [tenantId]
    )
  ]);
  const categories=[...new Set([
    ...categoryRows.rows.map((row:any)=>typeof row.name==="string"?row.name.trim():""),
    ...products.rows.map((p:any)=>typeof p.category==="string"?p.category.trim():"")
  ].filter(Boolean))].sort((a,b)=>a.localeCompare(b,"fa"));
  res.setHeader("Cache-Control","public, max-age=30, stale-while-revalidate=60");
  res.json({tenant,stores:stores.rows,products:products.rows,categories,total:products.rowCount});
}));

domainMarketplaceRouter.patch("/api/marketplace/sellers/:id/status",requireAuth,requirePermission("seller:manage"),asyncHandler(async(req,res)=>{
 const ctx=await tenantContext(req,(req as any).user);if(!ctx)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const status=bodyString(req.body?.status,20);if(!["pending","active","suspended","closed"].includes(status))return res.status(400).json({error:"وضعیت فروشنده نامعتبر است"});
 const r=await query("update sellers set status=$1,updated_at=now() where id=$2 and tenant_id=$3 returning *",[status,req.params.id,ctx.id]);if(!r.rowCount)return res.status(404).json({error:"فروشنده پیدا نشد"});res.json(r.rows[0]);
}));
domainMarketplaceRouter.patch("/api/marketplace/stores/:id/status",requireAuth,requirePermission("store:manage"),asyncHandler(async(req,res)=>{
 const ctx=await tenantContext(req,(req as any).user);if(!ctx)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const status=bodyString(req.body?.status,20);if(!["draft","active","suspended","closed"].includes(status))return res.status(400).json({error:"وضعیت فروشگاه نامعتبر است"});
 const r=await query("update stores set status=$1,updated_at=now() where id=$2 and tenant_id=$3 returning *",[status,req.params.id,ctx.id]);if(!r.rowCount)return res.status(404).json({error:"فروشگاه پیدا نشد"});res.json(r.rows[0]);
}));
domainMarketplaceRouter.patch("/api/marketplace/products/:id/status",requireAuth,requirePermission("product:manage"),asyncHandler(async(req,res)=>{
 const ctx=await tenantContext(req,(req as any).user);if(!ctx)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const status=bodyString(req.body?.status,20);if(!["draft","active","archived"].includes(status))return res.status(400).json({error:"وضعیت محصول نامعتبر است"});
 const r=await query("update products set status=$1,updated_at=now() where id=$2 and tenant_id=$3 returning *",[status,req.params.id,ctx.id]);if(!r.rowCount)return res.status(404).json({error:"محصول پیدا نشد"});res.json(r.rows[0]);
}));
