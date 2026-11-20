import {Router} from "express";
import {query,pool} from "./db.js";
import {requireAuth,requirePermission} from "./auth.js";
import {asyncHandler} from "./http.js";
import {resolveTenant} from "./tenant-context.js";
import {postLedgerEntry} from "./ledger.js";

export const logisticsRouter=Router();
const tenantOf=(req:any)=>resolveTenant(req,req.user);
const fail=(res:any,status:number,error:string)=>res.status(status).json({error});

async function can(req:any,permission:string){
  if(req.user?.role==="admin") return true;
  const r=await query("select 1 from role_permissions where role=$1 and permission=$2",[req.user?.role,permission]);
  return Boolean(r.rowCount);
}
async function audit(tenantId:string,entityType:string,entityId:string,eventType:string,fromStatus:string|null,toStatus:string|null,userId:string,reason?:string){
  await query(
    "insert into logistics_events(tenant_id,entity_type,entity_id,event_type,from_status,to_status,actor_user_id,reason) values($1,$2,$3,$4,$5,$6,$7,$8)",
    [tenantId,entityType,entityId,eventType,fromStatus,toStatus,userId,reason||null]
  );
}

logisticsRouter.get("/api/logistics/overview",requireAuth,asyncHandler(async(req,res)=>{
  const t=await tenantOf(req); if(!t)return fail(res,403,"سازمان معتبر پیدا نشد");
  const [plans,orders,shipments,vehicles]=await Promise.all([
    query("select count(*)::int total,count(*) filter(where status='released')::int released,count(*) filter(where status='closed')::int closed from logistics_supply_plans where tenant_id=$1",[t.id]),
    query("select count(*)::int total,count(*) filter(where status in ('submitted','approved','assigned','shipped'))::int active,count(*) filter(where status='delivered')::int delivered from logistics_supply_orders where tenant_id=$1",[t.id]),
    query("select count(*)::int total,count(*) filter(where status in ('assigned','picked_up','in_transit'))::int active,count(*) filter(where status='delivered')::int delivered,count(*) filter(where status='failed')::int failed from logistics_shipments where tenant_id=$1",[t.id]),
    query("select count(*)::int total,count(*) filter(where status='available')::int available,count(*) filter(where status='assigned')::int assigned from logistics_vehicles where tenant_id=$1",[t.id])
  ]);
  res.json({plans:plans.rows[0],orders:orders.rows[0],shipments:shipments.rows[0],vehicles:vehicles.rows[0]});
}));

logisticsRouter.get("/api/logistics/plans",requireAuth,asyncHandler(async(req,res)=>{
  const t=await tenantOf(req); if(!t)return fail(res,403,"سازمان معتبر پیدا نشد");
  res.json((await query("select * from logistics_supply_plans where tenant_id=$1 order by created_at desc",[t.id])).rows);
}));
logisticsRouter.post("/api/logistics/plans",requireAuth,requirePermission("modules:12-logistics-supply:write"),asyncHandler(async(req,res)=>{
  const t=await tenantOf(req),b=req.body||{}; if(!t)return fail(res,403,"سازمان معتبر پیدا نشد");
  if(!b.planNo)return fail(res,400,"شماره برنامه الزامی است");
  const r=await query("insert into logistics_supply_plans(tenant_id,plan_no,planned_date,notes,created_by) values($1,$2,$3,$4,$5) returning *",[t.id,b.planNo,b.plannedDate||null,b.notes||null,(req as any).user.id]);
  await audit(t.id,"supply_plan",r.rows[0].id,"created",null,r.rows[0].status,(req as any).user.id);
  res.status(201).json(r.rows[0]);
}));
logisticsRouter.patch("/api/logistics/plans/:id/status",requireAuth,requirePermission("modules:12-logistics-supply:write"),asyncHandler(async(req,res)=>{
  const t=await tenantOf(req),b=req.body||{}; if(!t)return fail(res,403,"سازمان معتبر پیدا نشد");
  const p=(await query("select * from logistics_supply_plans where id=$1 and tenant_id=$2",[req.params.id,t.id])).rows[0];
  if(!p)return fail(res,404,"برنامه پیدا نشد");
  const allowed:any={draft:["approved","cancelled"],approved:["released","cancelled"],released:["closed"],closed:[],cancelled:[]};
  if(!allowed[p.status]?.includes(b.status))return fail(res,409,"تغییر وضعیت برنامه مجاز نیست");
  const r=(await query("update logistics_supply_plans set status=$1,approved_by=case when $1='approved' then $2 else approved_by end where id=$3 and tenant_id=$4 returning *",[b.status,(req as any).user.id,p.id,t.id])).rows[0];
  await audit(t.id,"supply_plan",p.id,"status_change",p.status,b.status,(req as any).user.id,b.reason);
  res.json(r);
}));

logisticsRouter.get("/api/logistics/orders",requireAuth,asyncHandler(async(req,res)=>{
  const t=await tenantOf(req); if(!t)return fail(res,403,"سازمان معتبر پیدا نشد");
  const r=await query(
    "select o.*,p.plan_no from logistics_supply_orders o left join logistics_supply_plans p on p.id=o.plan_id where o.tenant_id=$1 order by o.created_at desc",
    [t.id]
  );
  res.json(r.rows);
}));
logisticsRouter.post("/api/logistics/orders",requireAuth,requirePermission("modules:12-logistics-supply:write"),asyncHandler(async(req,res)=>{
  const t=await tenantOf(req),b=req.body||{}; if(!t)return fail(res,403,"سازمان معتبر پیدا نشد");
  if(!b.orderNo||!b.origin||!b.destination)return fail(res,400,"شماره سفارش، مبدأ و مقصد الزامی است");
  if(b.planId){
    const p=(await query("select id,status from logistics_supply_plans where id=$1 and tenant_id=$2",[b.planId,t.id])).rows[0];
    if(!p)return fail(res,404,"برنامه تأمین پیدا نشد");
    if(!["approved","released"].includes(p.status))return fail(res,409,"سفارش فقط به برنامه تأییدشده یا آزادشده متصل می‌شود");
  }
  const r=await query(
    "insert into logistics_supply_orders(tenant_id,order_no,plan_id,origin,destination,cargo_description,quantity,requested_date,notes,created_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning *",
    [t.id,b.orderNo,b.planId||null,b.origin,b.destination,b.cargoDescription||null,Number(b.quantity||0),b.requestedDate||null,b.notes||null,(req as any).user.id]
  );
  await audit(t.id,"supply_order",r.rows[0].id,"created",null,r.rows[0].status,(req as any).user.id);
  res.status(201).json(r.rows[0]);
}));
logisticsRouter.patch("/api/logistics/orders/:id/status",requireAuth,requirePermission("modules:12-logistics-supply:write"),asyncHandler(async(req,res)=>{
  const t=await tenantOf(req),b=req.body||{}; if(!t)return fail(res,403,"سازمان معتبر پیدا نشد");
  const o=(await query("select * from logistics_supply_orders where id=$1 and tenant_id=$2",[req.params.id,t.id])).rows[0];
  if(!o)return fail(res,404,"سفارش تأمین پیدا نشد");
  const allowed:any={draft:["submitted","cancelled"],submitted:["approved","cancelled"],approved:["assigned","cancelled"],assigned:["shipped","cancelled"],shipped:["delivered","cancelled"],delivered:[],cancelled:[]};
  if(!allowed[o.status]?.includes(b.status))return fail(res,409,"تغییر وضعیت سفارش مجاز نیست");
  const r=(await query("update logistics_supply_orders set status=$1,approved_by=case when $1='approved' then $2 else approved_by end,updated_at=now() where id=$3 and tenant_id=$4 returning *",[b.status,(req as any).user.id,o.id,t.id])).rows[0];
  await audit(t.id,"supply_order",o.id,"status_change",o.status,b.status,(req as any).user.id,b.reason);
  res.json(r);
}));

logisticsRouter.get("/api/logistics/vehicles",requireAuth,asyncHandler(async(req,res)=>{
  const t=await tenantOf(req); if(!t)return fail(res,403,"سازمان معتبر پیدا نشد");
  res.json((await query("select * from logistics_vehicles where tenant_id=$1 order by title",[t.id])).rows);
}));
logisticsRouter.post("/api/logistics/vehicles",requireAuth,requirePermission("modules:12-logistics-supply:write"),asyncHandler(async(req,res)=>{
  const t=await tenantOf(req),b=req.body||{}; if(!t)return fail(res,403,"سازمان معتبر پیدا نشد");
  if(!b.plateNo||!b.title)return fail(res,400,"پلاک و عنوان الزامی است");
  res.status(201).json((await query("insert into logistics_vehicles(tenant_id,plate_no,title,vehicle_type,capacity) values($1,$2,$3,$4,$5) returning *",[t.id,b.plateNo,b.title,b.vehicleType||null,Number(b.capacity||0)])).rows[0]);
}));
logisticsRouter.get("/api/logistics/drivers",requireAuth,asyncHandler(async(req,res)=>{
  const t=await tenantOf(req); if(!t)return fail(res,403,"سازمان معتبر پیدا نشد");
  res.json((await query("select * from logistics_drivers where tenant_id=$1 order by name",[t.id])).rows);
}));
logisticsRouter.post("/api/logistics/drivers",requireAuth,requirePermission("modules:12-logistics-supply:write"),asyncHandler(async(req,res)=>{
  const t=await tenantOf(req),b=req.body||{}; if(!t)return fail(res,403,"سازمان معتبر پیدا نشد");
  if(!b.name)return fail(res,400,"نام راننده الزامی است");
  res.status(201).json((await query("insert into logistics_drivers(tenant_id,name,mobile,license_no,license_expiry) values($1,$2,$3,$4,$5) returning *",[t.id,b.name,b.mobile||null,b.licenseNo||null,b.licenseExpiry||null])).rows[0]);
}));
logisticsRouter.get("/api/logistics/routes",requireAuth,asyncHandler(async(req,res)=>{
  const t=await tenantOf(req); if(!t)return fail(res,403,"سازمان معتبر پیدا نشد");
  res.json((await query("select * from logistics_routes where tenant_id=$1 order by name",[t.id])).rows);
}));
logisticsRouter.post("/api/logistics/routes",requireAuth,requirePermission("modules:12-logistics-supply:write"),asyncHandler(async(req,res)=>{
  const t=await tenantOf(req),b=req.body||{}; if(!t)return fail(res,403,"سازمان معتبر پیدا نشد");
  if(!b.code||!b.name||!b.origin||!b.destination)return fail(res,400,"اطلاعات مسیر کامل نیست");
  res.status(201).json((await query("insert into logistics_routes(tenant_id,code,name,origin,destination,distance_km) values($1,$2,$3,$4,$5,$6) returning *",[t.id,b.code,b.name,b.origin,b.destination,Number(b.distanceKm||0)])).rows[0]);
}));

logisticsRouter.post("/api/logistics/marketplace-orders/:orderId/shipments",requireAuth,requirePermission("modules:12-logistics-supply:write"),asyncHandler(async(req,res)=>{
  const t=await tenantOf(req),b=req.body||{}; if(!t)return fail(res,403,"سازمان معتبر پیدا نشد");
  if(!b.vehicleId||!b.driverId)return fail(res,400,"برای ثبت ارسال، ناوگان و راننده الزامی است");
  const c=await pool.connect();
  try{
    await c.query("begin");
    const order=(await c.query("select * from marketplace_orders where id=$1 and tenant_id=$2 for update",[req.params.orderId,t.id])).rows[0];
    if(!order){await c.query("rollback");return fail(res,404,"سفارش فروشگاه پیدا نشد");}
    if(order.status!=="processing"){await c.query("rollback");return fail(res,409,"ارسال فقط پس از شروع آماده‌سازی سفارش ممکن است");}
    if(!order.shipping_address||!order.shipping_address.recipientName||!order.shipping_address.recipientPhone||!order.shipping_address.addressLine||!order.shipping_address.city||!order.shipping_address.postalCode){await c.query("rollback");return fail(res,409,"نشانی معتبر تحویل برای این سفارش ثبت نشده است؛ ابتدا نشانی مشتری را تکمیل کنید");}
    const existing=(await c.query("select * from logistics_shipments where tenant_id=$1 and marketplace_order_id=$2 for update",[t.id,order.id])).rows[0];
    if(existing){await c.query("commit");return res.json({shipment:existing,idempotent:true});}
    const vehicle=(await c.query("select * from logistics_vehicles where id=$1 and tenant_id=$2 for update",[b.vehicleId,t.id])).rows[0];
    if(!vehicle||vehicle.status!=="available"){await c.query("rollback");return fail(res,409,"ناوگان انتخاب‌شده در دسترس نیست");}
    const driver=(await c.query("select * from logistics_drivers where id=$1 and tenant_id=$2",[b.driverId,t.id])).rows[0];
    if(!driver||driver.status!=="active"){await c.query("rollback");return fail(res,409,"راننده فعال پیدا نشد");}
    if(driver.license_expiry&&new Date(driver.license_expiry)<new Date()){await c.query("rollback");return fail(res,409,"گواهینامه راننده منقضی شده است");}
    let route:any=null;
    if(b.routeId){
      route=(await c.query("select * from logistics_routes where id=$1 and tenant_id=$2 for update",[b.routeId,t.id])).rows[0];
      if(!route||route.status!=="active"){await c.query("rollback");return fail(res,409,"مسیر انتخاب‌شده فعال نیست یا پیدا نشد");}
    }
    const shipmentNo=String(b.shipmentNo||("SHP-"+order.order_no)).trim();
    if(!shipmentNo){await c.query("rollback");return fail(res,400,"شماره مرسوله الزامی است");}
    const shipment=(await c.query(
      "insert into logistics_shipments(tenant_id,shipment_no,marketplace_order_id,route_id,vehicle_id,driver_id,origin,destination,tracking_code,created_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning *",
      [t.id,shipmentNo,order.id,route?.id||null,vehicle.id,driver.id,String(b.origin||route?.origin||"مبدأ عملیاتی ثبت‌نشده"),String([order.shipping_address?.recipientName,order.shipping_address?.province,order.shipping_address?.city,order.shipping_address?.addressLine,order.shipping_address?.unit?("واحد "+order.shipping_address.unit):null,order.shipping_address?.postalCode?("کدپستی "+order.shipping_address.postalCode):null].filter(Boolean).join("، ")),b.trackingCode||null,(req as any).user.id]
    )).rows[0];
    await c.query("update logistics_vehicles set status='assigned' where id=$1 and tenant_id=$2",[vehicle.id,t.id]);
    await c.query("insert into logistics_delivery_events(tenant_id,shipment_id,status,location,description,actor_user_id) values($1,$2,'planned',$3,$4,$5)",[t.id,shipment.id,shipment.origin,"مرسوله برای سفارش فروشگاه ایجاد شد",(req as any).user.id]);
    await c.query("insert into platform_audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,after_data) values($1,$2,'marketplace.shipment_created','marketplace_order',$3,$4)",[t.id,(req as any).user.id,order.id,JSON.stringify({shipmentId:shipment.id,shipmentNo,trackingCode:shipment.tracking_code})]);
    await c.query("commit");
    await audit(t.id,"shipment",shipment.id,"marketplace_order_created",null,shipment.status,(req as any).user.id);
    res.status(201).json({shipment});
  }catch(e:any){await c.query("rollback");if(e?.code==="23505")return fail(res,409,"برای این سفارش مرسوله ثبت شده یا شماره رهگیری تکراری است");throw e;}
  finally{c.release();}
}));

logisticsRouter.get("/api/marketplace/orders/:orderId/shipment",requireAuth,asyncHandler(async(req,res)=>{
  const t=await tenantOf(req);if(!t)return fail(res,403,"سازمان معتبر پیدا نشد");
  const order=(await query("select id,order_no,customer_ref,shipping_address,delivery_method_id,delivery_method_snapshot,delivery_quote_id,delivery_quote_snapshot,delivery_quote_required,shipping_amount,total_amount,currency from marketplace_orders where id=$1 and tenant_id=$2",[req.params.orderId,t.id])).rows[0];
  if(!order)return fail(res,404,"سفارش پیدا نشد");
  const user=(req as any).user;
  const allowed=user.role==="admin"||order.customer_ref===user.id||await can(req,"order:lifecycle")||await can(req,"modules:12-logistics-supply:track");
  if(!allowed)return fail(res,403,"دسترسی مشاهده رهگیری سفارش وجود ندارد");
  const shipment=(await query("select * from logistics_shipments where tenant_id=$1 and marketplace_order_id=$2",[t.id,order.id])).rows[0];
  if(!shipment)return res.json({order,shipment:null,events:[]});
  const events=(await query("select id,status,location,description,occurred_at from logistics_delivery_events where tenant_id=$1 and shipment_id=$2 order by occurred_at,id",[t.id,shipment.id])).rows;
  const notifications=(await query("select id,title,body,status,created_at,read_at from platform_notifications where tenant_id=$1 and user_id=$2 and channel='in_app' and body like $3 order by created_at desc limit 20",[t.id,user.id,"%"+order.order_no+"%"])).rows;
  res.json({order,shipment,events,notifications});
}));
logisticsRouter.patch("/api/marketplace/orders/:orderId/notifications/:notificationId/read",requireAuth,asyncHandler(async(req,res)=>{
  const t=await tenantOf(req);if(!t)return fail(res,403,"سازمان معتبر پیدا نشد");
  const user=(req as any).user;
  const order=(await query("select id,order_no,customer_ref from marketplace_orders where id=$1 and tenant_id=$2",[req.params.orderId,t.id])).rows[0];
  if(!order||order.customer_ref!==user.id)return fail(res,403,"دسترسی ثبت‌شده برای این اعلان معتبر نیست");
  const updated=await query("update platform_notifications set status='read',read_at=now() where id=$1 and tenant_id=$2 and user_id=$3 and channel='in_app' and body like $4 returning id,status,read_at",[req.params.notificationId,t.id,user.id,"%"+order.order_no+"%"]);
  if(!updated.rowCount)return fail(res,404,"اعلان سفارش پیدا نشد");
  res.json(updated.rows[0]);
}));

logisticsRouter.get("/api/logistics/shipments",requireAuth,asyncHandler(async(req,res)=>{
  const t=await tenantOf(req); if(!t)return fail(res,403,"سازمان معتبر پیدا نشد");
  res.json((await query(
    "select s.*,coalesce(o.order_no,mo.order_no) order_no,mo.shipping_address,mo.delivery_method_snapshot,mo.delivery_quote_snapshot,mo.shipping_amount,mo.total_amount,mo.currency,r.name route_name,v.plate_no,d.name driver_name from logistics_shipments s left join logistics_supply_orders o on o.id=s.supply_order_id left join marketplace_orders mo on mo.id=s.marketplace_order_id and mo.tenant_id=s.tenant_id left join logistics_routes r on r.id=s.route_id left join logistics_vehicles v on v.id=s.vehicle_id left join logistics_drivers d on d.id=s.driver_id where s.tenant_id=$1 order by s.created_at desc",
    [t.id]
  )).rows);
}));

logisticsRouter.post("/api/logistics/shipments",requireAuth,requirePermission("modules:12-logistics-supply:write"),asyncHandler(async(req,res)=>{
  const t=await tenantOf(req),b=req.body||{}; if(!t)return fail(res,403,"سازمان معتبر پیدا نشد");
  if(!b.shipmentNo||!b.origin||!b.destination)return fail(res,400,"اطلاعات مرسوله کامل نیست");
  if(!b.vehicleId||!b.driverId)return fail(res,400,"برای ثبت حمل، ناوگان و راننده الزامی است");
  const c=await pool.connect();
  try{
    await c.query("begin");
    let order:any=null;
    if(b.supplyOrderId){
      order=(await c.query("select * from logistics_supply_orders where id=$1 and tenant_id=$2 for update",[b.supplyOrderId,t.id])).rows[0];
      if(!order)throw new Error("سفارش تأمین پیدا نشد");
      if(!["approved","assigned"].includes(order.status))throw new Error("سفارش باید تأیید شده باشد");
    }
    let vehicle:any=null;
    if(b.vehicleId){
      vehicle=(await c.query("select * from logistics_vehicles where id=$1 and tenant_id=$2 for update",[b.vehicleId,t.id])).rows[0];
      if(!vehicle)throw new Error("ناوگان پیدا نشد");
      if(vehicle.status!=="available")throw new Error("ناوگان انتخاب‌شده در دسترس نیست");
    }
    if(b.driverId){
      const d=(await c.query("select status,license_expiry from logistics_drivers where id=$1 and tenant_id=$2",[b.driverId,t.id])).rows[0];
      if(!d||d.status!=="active")throw new Error("راننده فعال پیدا نشد");
      if(d.license_expiry&&new Date(d.license_expiry)<new Date())throw new Error("گواهینامه راننده منقضی شده است");
    }
    const r=(await c.query(
      "insert into logistics_shipments(tenant_id,shipment_no,supply_order_id,route_id,vehicle_id,driver_id,origin,destination,tracking_code,created_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning *",
      [t.id,b.shipmentNo,b.supplyOrderId||null,b.routeId||null,b.vehicleId||null,b.driverId||null,b.origin,b.destination,b.trackingCode||null,(req as any).user.id]
    )).rows[0];
    if(b.vehicleId)await c.query("update logistics_vehicles set status='assigned' where id=$1 and tenant_id=$2",[b.vehicleId,t.id]);
    if(order)await c.query("update logistics_supply_orders set status='assigned',updated_at=now() where id=$1 and tenant_id=$2",[order.id,t.id]);
    await c.query("commit");
    await audit(t.id,"shipment",r.id,"created",null,r.status,(req as any).user.id);
    res.status(201).json(r);
  }catch(e:any){await c.query("rollback");res.status(400).json({error:e.message||"ثبت مرسوله ناموفق بود"});}
  finally{c.release();}
}));

logisticsRouter.patch("/api/logistics/shipments/:id/status",requireAuth,asyncHandler(async(req,res)=>{
  const t=await tenantOf(req),b=req.body||{}; if(!t)return fail(res,403,"سازمان معتبر پیدا نشد");
  const isDelivery=["delivered","failed"].includes(b.status);
  const permission=isDelivery?"modules:12-logistics-supply:deliver":"modules:12-logistics-supply:dispatch";
  if(!(await can(req,permission)))return fail(res,403,"دسترسی لازم برای این عملیات وجود ندارد");
  if(b.status==="delivered"&&!String(b.location||"").trim())return fail(res,400,"محل تحویل الزامی است");
  if(b.status==="failed"&&!String(b.reason||"").trim())return fail(res,400,"علت عدم تحویل الزامی است");
  const allowed:any={planned:["assigned","cancelled"],assigned:["picked_up","cancelled"],picked_up:["in_transit","failed"],in_transit:["delivered","failed"],failed:["assigned","cancelled"],delivered:[],cancelled:[]};
  const c=await pool.connect();
  try{
    await c.query("begin");
    const s=(await c.query("select * from logistics_shipments where id=$1 and tenant_id=$2 for update",[req.params.id,t.id])).rows[0];
    if(!s){await c.query("rollback");return fail(res,404,"مرسوله پیدا نشد");}
    if(!allowed[s.status]?.includes(b.status)){await c.query("rollback");return fail(res,409,"تغییر وضعیت مرسوله مجاز نیست");}
    if(s.marketplace_order_id&&b.status==="cancelled"){await c.query("rollback");return fail(res,409,"لغو مرسوله سفارش فروشگاه باید از مسیر لغو سفارش انجام شود");}
    if(b.status==="picked_up"&&(!s.vehicle_id||!s.driver_id)){await c.query("rollback");return fail(res,409,"مرسوله بدون ناوگان و راننده قابل دریافت نیست");}
    let marketplaceOrder:any=null;
    if(s.marketplace_order_id&&["in_transit","delivered"].includes(b.status)){
      marketplaceOrder=(await c.query("select * from marketplace_orders where id=$1 and tenant_id=$2 for update",[s.marketplace_order_id,t.id])).rows[0];
      const expected=b.status==="in_transit"?"processing":"shipped";
      if(!marketplaceOrder||marketplaceOrder.status!==expected){await c.query("rollback");return fail(res,409,b.status==="in_transit"?"سفارش باید در وضعیت آماده‌سازی باشد":"سفارش پیش از ثبت تحویل باید ارسال شده باشد");}
    }
    if(b.status==="assigned"&&s.vehicle_id){
      const vehicle=(await c.query("select status from logistics_vehicles where id=$1 and tenant_id=$2 for update",[s.vehicle_id,t.id])).rows[0];
      if(!vehicle||vehicle.status!=="available"){await c.query("rollback");return fail(res,409,"ناوگان برای تخصیص مجدد در دسترس نیست");}
      await c.query("update logistics_vehicles set status='assigned' where id=$1 and tenant_id=$2",[s.vehicle_id,t.id]);
    }
    const r=(await c.query(
      "update logistics_shipments set status=$1,dispatch_at=case when $1='in_transit' then coalesce(dispatch_at,now()) else dispatch_at end,delivered_at=case when $1='delivered' then now() else delivered_at end,delivered_reason=case when $1='delivered' then $2 else delivered_reason end,failed_reason=case when $1='failed' then $2 else failed_reason end,updated_at=now() where id=$3 and tenant_id=$4 returning *",
      [b.status,b.status==="failed"?b.reason:(b.status==="delivered"?b.location:null),s.id,t.id]
    )).rows[0];
    if(s.vehicle_id&&["delivered","failed","cancelled"].includes(b.status)){
      await c.query("update logistics_vehicles set status='available' where id=$1 and tenant_id=$2 and status='assigned'",[s.vehicle_id,t.id]);
    }
    if(s.supply_order_id&&b.status==="in_transit"){
      await c.query("update logistics_supply_orders set status='shipped',updated_at=now() where id=$1 and tenant_id=$2 and status in ('assigned','approved')",[s.supply_order_id,t.id]);
    }
    if(s.supply_order_id&&b.status==="delivered"){
      await c.query("update logistics_supply_orders set status='delivered',updated_at=now() where id=$1 and tenant_id=$2",[s.supply_order_id,t.id]);
    }
    if(s.supply_order_id&&b.status==="cancelled"){
      await c.query("update logistics_supply_orders set status='cancelled',updated_at=now() where id=$1 and tenant_id=$2 and status not in ('delivered','cancelled')",[s.supply_order_id,t.id]);
    }
    if(s.marketplace_order_id&&b.status==="in_transit"){
      await c.query("update marketplace_orders set status='shipped',shipped_at=coalesce(shipped_at,now()),updated_at=now() where id=$1 and tenant_id=$2",[s.marketplace_order_id,t.id]);
      await c.query("insert into platform_audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,after_data) values($1,$2,'marketplace.order_shipped','marketplace_order',$3,$4)",[t.id,(req as any).user.id,s.marketplace_order_id,JSON.stringify({shipmentId:s.id,trackingCode:s.tracking_code})]);
    }
    if(s.marketplace_order_id&&b.status==="delivered"){
      await c.query("update marketplace_orders set status='delivered',delivered_at=coalesce(delivered_at,now()),updated_at=now() where id=$1 and tenant_id=$2",[s.marketplace_order_id,t.id]);
      await c.query("insert into platform_audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,after_data) values($1,$2,'marketplace.order_delivered','marketplace_order',$3,$4)",[t.id,(req as any).user.id,s.marketplace_order_id,JSON.stringify({shipmentId:s.id,location:b.location})]);
    }
    await c.query("insert into logistics_delivery_events(tenant_id,shipment_id,status,location,description,actor_user_id) values($1,$2,$3,$4,$5,$6)",[t.id,s.id,b.status,b.location||null,b.description||b.reason||null,(req as any).user.id]);
    const customerNoticeMap:Record<string,string[]>={
      assigned:["مرسوله آماده ارسال شد","ناوگان و راننده برای سفارش شما تخصیص یافتند."],
      picked_up:["مرسوله از انبار دریافت شد","مرسوله سفارش شما از مبدأ دریافت شد."],
      in_transit:["سفارش شما در مسیر تحویل است","مرسوله سفارش شما ارسال شده و در مسیر مقصد قرار دارد."],
      delivered:["سفارش شما تحویل شد","تحویل سفارش شما در سامانه ثبت شد."],
      failed:["تحویل سفارش انجام نشد","برای مرسوله شما عدم تحویل ثبت شده است. لطفاً جزئیات رهگیری را بررسی کنید."]
    };
    const customerNotice=customerNoticeMap[String(b.status)];
    if(s.marketplace_order_id&&customerNotice){
      const customer=marketplaceOrder||((await c.query("select customer_ref,order_no from marketplace_orders where id=$1 and tenant_id=$2",[s.marketplace_order_id,t.id])).rows[0]);
      if(customer?.customer_ref&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(customer.customer_ref)){
        await c.query("insert into platform_notifications(tenant_id,user_id,channel,title,body,status) values($1,$2::uuid,'in_app',$3,$4,'queued')",[t.id,customer.customer_ref,customerNotice[0],"سفارش "+customer.order_no+" · "+customerNotice[1]]);
      }
    }
    await c.query("commit");
    await audit(t.id,"shipment",s.id,"status_change",s.status,b.status,(req as any).user.id,b.reason||b.location);
    res.json(r);
  }catch(e){await c.query("rollback");throw e}finally{c.release();}
}));

logisticsRouter.get("/api/logistics/shipments/:id/tracking",requireAuth,asyncHandler(async(req,res)=>{
  const t=await tenantOf(req); if(!t)return fail(res,403,"سازمان معتبر پیدا نشد");
  if(!(await can(req,"modules:12-logistics-supply:track")))return fail(res,403,"دسترسی رهگیری ندارید");
  const s=(await query("select s.*,coalesce(o.order_no,mo.order_no) order_no from logistics_shipments s left join logistics_supply_orders o on o.id=s.supply_order_id left join marketplace_orders mo on mo.id=s.marketplace_order_id and mo.tenant_id=s.tenant_id where s.id=$1 and s.tenant_id=$2",[req.params.id,t.id])).rows[0];
  if(!s)return fail(res,404,"مرسوله پیدا نشد");
  res.json({shipment:s,events:(await query("select * from logistics_delivery_events where tenant_id=$1 and shipment_id=$2 order by occurred_at",[t.id,s.id])).rows});
}));

logisticsRouter.get("/api/logistics/reports",requireAuth,asyncHandler(async(req,res)=>{
  const t=await tenantOf(req); if(!t)return fail(res,403,"سازمان معتبر پیدا نشد");
  const [byShipment,byVehicle,byRoute]=await Promise.all([
    query("select status,count(*)::int total from logistics_shipments where tenant_id=$1 group by status order by status",[t.id]),
    query("select v.id,v.plate_no,v.title,count(s.id)::int shipments,count(s.id) filter(where s.status='delivered')::int delivered from logistics_vehicles v left join logistics_shipments s on s.vehicle_id=v.id and s.tenant_id=v.tenant_id where v.tenant_id=$1 group by v.id order by v.title",[t.id]),
    query("select r.id,r.code,r.name,count(s.id)::int shipments,count(s.id) filter(where s.status='delivered')::int delivered from logistics_routes r left join logistics_shipments s on s.route_id=r.id and s.tenant_id=r.tenant_id where r.tenant_id=$1 group by r.id order by r.name",[t.id])
  ]);
  res.json({byShipment:byShipment.rows,byVehicle:byVehicle.rows,byRoute:byRoute.rows});
}));

logisticsRouter.patch("/api/logistics/vehicles/:id/status",requireAuth,asyncHandler(async(req,res)=>{
  const t=await tenantOf(req),b=req.body||{};if(!t)return fail(res,403,"سازمان معتبر پیدا نشد");
  if(!(await can(req,"modules:12-logistics-supply:write")))return fail(res,403,"دسترسی مدیریت ناوگان ندارید");
  const allowed:any={available:["maintenance","inactive"],maintenance:["available","inactive"],inactive:["available"],assigned:[]};
  const c=await pool.connect();
  try{
    await c.query("begin");
    const v=(await c.query("select * from logistics_vehicles where id=$1 and tenant_id=$2 for update",[req.params.id,t.id])).rows[0];
    if(!v){await c.query("rollback");return fail(res,404,"خودرو پیدا نشد");}
    if(v.status===b.status){await c.query("commit");return res.json(v);}
    if(!allowed[v.status]?.includes(b.status)){await c.query("rollback");return fail(res,409,"تغییر وضعیت خودرو مجاز نیست");}
    const active=(await c.query("select id from logistics_shipments where tenant_id=$1 and vehicle_id=$2 and status in ('planned','assigned','picked_up','in_transit') limit 1 for update",[t.id,v.id])).rows[0];
    if(active){await c.query("rollback");return fail(res,409,"تا پایان مأموریت فعال امکان تغییر وضعیت خودرو وجود ندارد");}
    const updated=(await c.query("update logistics_vehicles set status=$1 where id=$2 and tenant_id=$3 returning *",[b.status,v.id,t.id])).rows[0];
    await c.query("commit");
    await audit(t.id,"vehicle",v.id,"status_change",v.status,b.status,(req as any).user.id,b.reason);
    res.json(updated);
  }catch(e){await c.query("rollback");throw e;}finally{c.release();}
}));

logisticsRouter.patch("/api/logistics/drivers/:id/status",requireAuth,asyncHandler(async(req,res)=>{
  const t=await tenantOf(req),b=req.body||{};if(!t)return fail(res,403,"سازمان معتبر پیدا نشد");
  if(!(await can(req,"modules:12-logistics-supply:write")))return fail(res,403,"دسترسی مدیریت رانندگان ندارید");
  const allowed:any={active:["inactive","suspended"],inactive:["active"],suspended:["active"]};
  const c=await pool.connect();
  try{
    await c.query("begin");
    const d=(await c.query("select * from logistics_drivers where id=$1 and tenant_id=$2 for update",[req.params.id,t.id])).rows[0];
    if(!d){await c.query("rollback");return fail(res,404,"راننده پیدا نشد");}
    if(d.status===b.status){await c.query("commit");return res.json(d);}
    if(!allowed[d.status]?.includes(b.status)){await c.query("rollback");return fail(res,409,"تغییر وضعیت راننده مجاز نیست");}
    const active=(await c.query("select id from logistics_shipments where tenant_id=$1 and driver_id=$2 and status in ('planned','assigned','picked_up','in_transit') limit 1 for update",[t.id,d.id])).rows[0];
    if(active){await c.query("rollback");return fail(res,409,"تا پایان مأموریت فعال امکان تغییر وضعیت راننده وجود ندارد");}
    const updated=(await c.query("update logistics_drivers set status=$1 where id=$2 and tenant_id=$3 returning *",[b.status,d.id,t.id])).rows[0];
    await c.query("commit");
    await audit(t.id,"driver",d.id,"status_change",d.status,b.status,(req as any).user.id,b.reason);
    res.json(updated);
  }catch(e){await c.query("rollback");throw e;}finally{c.release();}
}));



logisticsRouter.get("/api/logistics/marketplace-delivery-quotes",requireAuth,requirePermission("modules:12-logistics-supply:write"),asyncHandler(async(req,res)=>{
  const t=await tenantOf(req);if(!t)return fail(res,403,"سازمان معتبر پیدا نشد");
  const rows=await query("select q.*,o.order_no,o.status as order_status,o.currency,o.total_amount,o.shipping_address,dm.title as delivery_method_title from marketplace_delivery_quotes q join marketplace_orders o on o.id=q.order_id and o.tenant_id=q.tenant_id left join commerce_delivery_methods dm on dm.id=o.delivery_method_id where q.tenant_id=$1 order by q.created_at desc limit 250",[t.id]);
  res.json(rows.rows);
}));
logisticsRouter.post("/api/logistics/marketplace-orders/:orderId/delivery-quotes",requireAuth,requirePermission("modules:12-logistics-supply:write"),asyncHandler(async(req,res)=>{
  const t=await tenantOf(req),b=req.body||{};if(!t)return fail(res,403,"سازمان معتبر پیدا نشد");
  const carrierCost=Number(b.carrierCost),customerCharge=Number(b.customerCharge);
  const minDays=b.estimatedBusinessDaysMin==null?null:Number(b.estimatedBusinessDaysMin),maxDays=b.estimatedBusinessDaysMax==null?null:Number(b.estimatedBusinessDaysMax);
  const currency=String(b.currency||"").trim().toUpperCase();
  const carrierName=String(b.carrierName||"").trim().slice(0,120),serviceName=String(b.serviceName||"").trim().slice(0,120);
  const notes=String(b.notes||"").trim().slice(0,1000);
  if(!Number.isFinite(carrierCost)||carrierCost<0||!Number.isFinite(customerCharge)||customerCharge<0)return fail(res,400,"هزینه شرکت حمل و مبلغ مشتری باید عدد معتبر و غیرمنفی باشند");
  if((minDays!==null&&!Number.isInteger(minDays))||(maxDays!==null&&!Number.isInteger(maxDays))||(minDays!==null&&minDays<0)||(maxDays!==null&&maxDays<0)||(minDays!==null&&maxDays!==null&&maxDays<minDays))return fail(res,400,"بازه زمان تحویل معتبر نیست");
  if(!/^[A-Z]{3}$/.test(currency))return fail(res,400,"واحد پول پیش‌فاکتور معتبر نیست");
  const expiresAt=b.expiresAt?new Date(b.expiresAt):null;
  if(expiresAt&&(!Number.isFinite(expiresAt.getTime())||expiresAt.getTime()<=Date.now()))return fail(res,400,"زمان اعتبار پیش‌فاکتور باید در آینده باشد");
  const c=await pool.connect();
  try{
    await c.query("begin");
    const order=(await c.query("select * from marketplace_orders where id=$1 and tenant_id=$2 for update",[req.params.orderId,t.id])).rows[0];
    if(!order){await c.query("rollback");return fail(res,404,"سفارش فروشگاه پیدا نشد");}
    if(!["pending","confirmed"].includes(order.status)){await c.query("rollback");return fail(res,409,"برای سفارش پرداخت‌شده یا در حال پردازش نمی‌توان پیش‌فاکتور حمل صادر کرد");}
    if(!order.delivery_quote_required){await c.query("rollback");return fail(res,409,"این سفارش از چرخه پیش‌فاکتور حمل استفاده نمی‌کند");}
    if(!order.delivery_method_id){await c.query("rollback");return fail(res,409,"روش ارسال سفارش ثبت نشده است");}
    if(String(order.currency||"IRR").toUpperCase()!==currency){await c.query("rollback");return fail(res,409,"واحد پول پیش‌فاکتور با سفارش یکسان نیست");}
    const priorPayment=(await c.query("select id from marketplace_payments where tenant_id=$1 and order_id=$2 limit 1 for update",[t.id,order.id])).rowCount;
    if(priorPayment){await c.query("rollback");return fail(res,409,"پس از ایجاد تلاش پرداخت، صدور یا تغییر پیش‌فاکتور حمل مجاز نیست");}
    const acceptedQuote=(await c.query("select id from marketplace_delivery_quotes where tenant_id=$1 and order_id=$2 and status='accepted' limit 1 for update",[t.id,order.id])).rowCount;
    if(acceptedQuote){await c.query("rollback");return fail(res,409,"پیش‌فاکتور قبلاً توسط مشتری تأیید شده و قابل جایگزینی نیست");}
    await c.query("update marketplace_delivery_quotes set status='superseded',updated_at=now() where tenant_id=$1 and order_id=$2 and status='offered'",[t.id,order.id]);
    const versionRow=(await c.query("select coalesce(max(version),0)+1 as version from marketplace_delivery_quotes where tenant_id=$1 and order_id=$2",[t.id,order.id])).rows[0];
    const quote=(await c.query("insert into marketplace_delivery_quotes(tenant_id,order_id,version,currency,carrier_cost,customer_charge,carrier_name,service_name,estimated_business_days_min,estimated_business_days_max,notes,expires_at,created_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) returning *",[t.id,order.id,versionRow.version,currency,carrierCost,customerCharge,carrierName||null,serviceName||null,minDays,maxDays,notes||null,expiresAt?.toISOString()||null,(req as any).user.id])).rows[0];
    await c.query("insert into platform_audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,after_data) values($1,$2,'marketplace.delivery_quote_offered','marketplace_order',$3,$4)",[t.id,(req as any).user.id,order.id,JSON.stringify({quoteId:quote.id,version:quote.version,carrierCost,customerCharge,currency,expiresAt:quote.expires_at})]);
    await c.query("commit");
    res.status(201).json({quote});
  }catch(e){await c.query("rollback");throw e;}finally{c.release();}
}));


logisticsRouter.get("/api/logistics/carrier-invoices",requireAuth,requirePermission("modules:12-logistics-supply:read"),asyncHandler(async(req,res)=>{
  const t=await tenantOf(req);if(!t)return fail(res,403,"سازمان معتبر پیدا نشد");
  const [invoices,candidates,suppliers]=await Promise.all([
    query("select i.*,s.shipment_no,o.order_no,p.title supplier_name,r.status payable_status from logistics_carrier_invoices i join logistics_shipments s on s.id=i.shipment_id and s.tenant_id=i.tenant_id join marketplace_orders o on o.id=i.order_id and o.tenant_id=i.tenant_id left join accounting_parties p on p.id=i.party_id and p.tenant_id=i.tenant_id left join accounting_receivable_payables r on r.id=i.payable_id and r.tenant_id=i.tenant_id where i.tenant_id=$1 order by i.created_at desc limit 300",[t.id]),
    query("select s.id shipment_id,s.shipment_no,s.delivered_at,o.id order_id,o.order_no,o.currency,q.id quote_id,q.carrier_name,q.service_name,q.carrier_cost,q.currency quote_currency from logistics_shipments s join marketplace_orders o on o.id=s.marketplace_order_id and o.tenant_id=s.tenant_id join marketplace_delivery_quotes q on q.id=o.delivery_quote_id and q.tenant_id=o.tenant_id where s.tenant_id=$1 and s.status='delivered' and o.status='delivered' and q.status='accepted' and not exists(select 1 from logistics_carrier_invoices i where i.tenant_id=s.tenant_id and i.shipment_id=s.id and i.status<>'void') order by s.delivered_at desc nulls last",[t.id]),
    query("select id,party_code,title from accounting_parties where tenant_id=$1 and party_type='supplier' and status='active' order by title",[t.id])
  ]);
  res.json({items:invoices.rows,candidates:candidates.rows,suppliers:suppliers.rows});
}));

logisticsRouter.post("/api/logistics/carrier-invoices",requireAuth,requirePermission("modules:12-logistics-supply:write"),asyncHandler(async(req,res)=>{
  const t=await tenantOf(req),b=req.body||{};if(!t)return fail(res,403,"سازمان معتبر پیدا نشد");
  const shipmentId=String(b.shipmentId||"").trim();
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(shipmentId))return fail(res,400,"شناسه مرسوله معتبر نیست");
  const invoiceNo=String(b.invoiceNo||"").trim().slice(0,120);
  const invoiceAmount=Number(b.invoiceAmount);
  const notes=String(b.notes||"").trim().slice(0,1000);
  if(!invoiceNo)return fail(res,400,"شماره صورتحساب شرکت حمل الزامی است");
  if(b.invoiceAmount===undefined||b.invoiceAmount===null||String(b.invoiceAmount).trim()===""||!Number.isFinite(invoiceAmount)||invoiceAmount<=0)return fail(res,400,"مبلغ صورتحساب باید عدد معتبر و بزرگ‌تر از صفر باشد");
  const c=await pool.connect();
  try{
    await c.query("begin");
    const source=(await c.query("select s.id shipment_id,s.shipment_no,s.status shipment_status,o.id order_id,o.order_no,o.status order_status,o.currency order_currency,o.delivery_quote_id,q.status quote_status,q.currency quote_currency,q.carrier_cost,q.carrier_name from logistics_shipments s join marketplace_orders o on o.id=s.marketplace_order_id and o.tenant_id=s.tenant_id join marketplace_delivery_quotes q on q.id=o.delivery_quote_id and q.tenant_id=o.tenant_id where s.id=$1 and s.tenant_id=$2 for update of s,o,q",[shipmentId,t.id])).rows[0];
    if(!source){await c.query("rollback");return fail(res,404,"مرسوله یا پیش‌فاکتور تأییدشده آن پیدا نشد");}
    if(source.shipment_status!=="delivered"||source.order_status!=="delivered"){await c.query("rollback");return fail(res,409,"ثبت صورتحساب فقط برای مرسوله‌ای که تحویل آن نهایی شده مجاز است");}
    if(source.quote_status!=="accepted"||!source.delivery_quote_id){await c.query("rollback");return fail(res,409,"پیش‌فاکتور تأییدشده‌ای برای این مرسوله وجود ندارد");}
    const currency=String(source.quote_currency||source.order_currency||"IRR").toUpperCase();
    const quotedCost=Number(source.carrier_cost);
    if(!Number.isFinite(quotedCost)||quotedCost<0){await c.query("rollback");return fail(res,409,"مبلغ مرجع پیش‌فاکتور معتبر نیست");}
    const variance=Number((invoiceAmount-quotedCost).toFixed(2));
    const status=Math.abs(variance)<=0.005?"matched":"disputed";
    const row=(await c.query("insert into logistics_carrier_invoices(tenant_id,shipment_id,order_id,delivery_quote_id,invoice_no,carrier_name,currency,quoted_cost,invoice_amount,variance_amount,status,notes,created_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) returning *",[t.id,source.shipment_id,source.order_id,source.delivery_quote_id,invoiceNo,String(source.carrier_name||"شرکت حمل ثبت‌شده").slice(0,120),currency,quotedCost,invoiceAmount,variance,status,notes||null,(req as any).user.id])).rows[0];
    await c.query("insert into platform_audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,after_data) values($1,$2,'logistics.carrier_invoice_recorded','logistics_carrier_invoice',$3,$4)",[t.id,(req as any).user.id,row.id,JSON.stringify({shipmentId:source.shipment_id,orderId:source.order_id,invoiceNo,quotedCost,invoiceAmount,variance,currency,status})]);
    await c.query("commit");
    res.status(201).json({invoice:row});
  }catch(e:any){
    await c.query("rollback");
    if(e?.code==="23505")return fail(res,409,"برای این مرسوله قبلاً صورتحساب فعال ثبت شده است");
    throw e;
  }finally{c.release();}
}));

logisticsRouter.post("/api/logistics/carrier-invoices/:id/approve",requireAuth,requirePermission("modules:12-logistics-supply:write"),requirePermission("accounting-finance.write"),asyncHandler(async(req,res)=>{
  const t=await tenantOf(req),b=req.body||{};if(!t)return fail(res,403,"سازمان معتبر پیدا نشد");
  const partyId=String(b.partyId||"").trim();
  const resolutionNote=String(b.resolutionNote||"").trim().slice(0,1000);
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(partyId))return fail(res,400,"انتخاب طرف حساب تأمین‌کننده الزامی است");
  const c=await pool.connect();
  try{
    await c.query("begin");
    const invoice=(await c.query("select i.*,o.shipping_amount from logistics_carrier_invoices i join marketplace_orders o on o.id=i.order_id and o.tenant_id=i.tenant_id where i.id=$1 and i.tenant_id=$2 for update of i,o",[req.params.id,t.id])).rows[0];
    if(!invoice){await c.query("rollback");return fail(res,404,"صورتحساب شرکت حمل پیدا نشد");}
    if(invoice.status==="approved"){await c.query("commit");return res.json({invoice,idempotent:true});}
    if(!["matched","disputed"].includes(invoice.status)){await c.query("rollback");return fail(res,409,"وضعیت صورتحساب برای تأیید مجاز نیست");}
    if(invoice.status==="disputed"&&!resolutionNote){await c.query("rollback");return fail(res,400,"برای تأیید اختلاف مبلغ، توضیح تصمیم الزامی است");}
    const party=(await c.query("select id,title from accounting_parties where id=$1 and tenant_id=$2 and party_type='supplier' and status='active' for share",[partyId,t.id])).rows[0];
    if(!party){await c.query("rollback");return fail(res,400,"طرف حساب انتخاب‌شده، تأمین‌کننده فعال این سازمان نیست");}
    const payable=(await c.query("insert into accounting_receivable_payables(tenant_id,party_id,direction,reference_no,issue_date,original_amount,currency,description,created_by,metadata) values($1,$2,'payable',$3,current_date,$4,$5,$6,$7,$8) returning *",[t.id,partyId,invoice.invoice_no,Number(invoice.invoice_amount),invoice.currency,"صورتحساب حمل "+invoice.invoice_no+" · مرسوله "+invoice.shipment_id,(req as any).user.id,JSON.stringify({sourceModule:"logistics",sourceType:"carrier_invoice",sourceId:invoice.id,shipmentId:invoice.shipment_id,orderId:invoice.order_id,quotedCost:Number(invoice.quoted_cost),invoiceAmount:Number(invoice.invoice_amount)})])).rows[0];
    const variance=Number(invoice.variance_amount);
    let ledgerAdjustmentEntryId:string|null=null;
    if(Math.abs(variance)>0.005){
      const amount=Math.abs(variance);
      const customerShipping=Math.max(0,Number(invoice.shipping_amount||0));
      const quotedCost=Math.max(0,Number(invoice.quoted_cost||0));
      const lines:any[]=[];
      if(variance>0){
        const revenueReduction=Math.min(variance,Math.max(0,customerShipping-quotedCost));
        const additionalExpense=variance-revenueReduction;
        if(revenueReduction>0)lines.push({accountCode:"4201",accountName:"درآمد خدمات حمل",accountType:"revenue",debit:revenueReduction});
        if(additionalExpense>0)lines.push({accountCode:"5201",accountName:"هزینه مازاد حمل سفارش",accountType:"expense",debit:additionalExpense});
        lines.push({accountCode:"2201",accountName:"بستانکاران شرکت‌های حمل",accountType:"liability",credit:variance});
      }else{
        const expenseReduction=Math.min(amount,Math.max(0,quotedCost-customerShipping));
        const marginIncrease=amount-expenseReduction;
        lines.push({accountCode:"2201",accountName:"بستانکاران شرکت‌های حمل",accountType:"liability",debit:amount});
        if(expenseReduction>0)lines.push({accountCode:"5201",accountName:"هزینه مازاد حمل سفارش",accountType:"expense",credit:expenseReduction});
        if(marginIncrease>0)lines.push({accountCode:"4201",accountName:"درآمد خدمات حمل",accountType:"revenue",credit:marginIncrease});
      }
      ledgerAdjustmentEntryId=await postLedgerEntry(c,{tenantId:t.id,entryNo:"CINV-ADJ-"+String(invoice.id).slice(0,12),sourceType:"logistics_carrier_invoice_adjustment",sourceId:invoice.id,description:"تعدیل اختلاف صورتحساب حمل "+invoice.invoice_no,createdBy:(req as any).user.id,currency:invoice.currency,lines});
    }
    const updated=(await c.query("update logistics_carrier_invoices set status='approved',party_id=$2,payable_id=$3,ledger_adjustment_entry_id=$4,resolution_note=$5,reviewed_by=$6,reviewed_at=now(),updated_at=now() where id=$1 and tenant_id=$7 returning *",[invoice.id,partyId,payable.id,ledgerAdjustmentEntryId,resolutionNote||null,(req as any).user.id,t.id])).rows[0];
    await c.query("insert into platform_audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,after_data) values($1,$2,'logistics.carrier_invoice_approved','logistics_carrier_invoice',$3,$4)",[t.id,(req as any).user.id,invoice.id,JSON.stringify({status:updated.status,partyId,partyTitle:party.title,payableId:payable.id,ledgerAdjustmentEntryId,varianceAmount:variance,resolutionNote:updated.resolution_note})]);
    await c.query("commit");
    res.json({invoice:updated,payable,ledgerAdjustmentEntryId});
  }catch(e){await c.query("rollback");throw e;}finally{c.release();}
}));

logisticsRouter.get("/api/logistics/delivery-methods",requireAuth,asyncHandler(async(req,res)=>{
  const t=await tenantOf(req);if(!t)return fail(res,403,"سازمان معتبر پیدا نشد");
  const rows=await query("select id,code,title,carrier_type,business_days_min,business_days_max,cutoff_hour_local,cost,currency,enabled,rules,created_at from commerce_delivery_methods where tenant_id=$1 order by enabled desc,title",[t.id]);
  res.json(rows.rows);
}));
logisticsRouter.post("/api/logistics/delivery-methods",requireAuth,requirePermission("modules:12-logistics-supply:write"),asyncHandler(async(req,res)=>{
  const t=await tenantOf(req),b=req.body||{};if(!t)return fail(res,403,"سازمان معتبر پیدا نشد");
  const code=String(b.code||"").trim().toLowerCase().replace(/[^a-z0-9_-]/g,"").slice(0,60);
  const title=String(b.title||"").trim().slice(0,120);
  const carrierType=String(b.carrierType||"");
  const minDays=Number(b.businessDaysMin),maxDays=Number(b.businessDaysMax),cutoff=Number(b.cutoffHourLocal),cost=Number(b.cost);
  const currency=String(b.currency||"IRR").trim().toUpperCase();
  if(!code||!title)return fail(res,400,"شناسه و عنوان روش ارسال الزامی است");
  if(!["courier","post","pickup","freight","digital"].includes(carrierType))return fail(res,400,"نوع روش ارسال معتبر نیست");
  if(!Number.isInteger(minDays)||!Number.isInteger(maxDays)||minDays<0||maxDays<minDays||maxDays>90)return fail(res,400,"بازه روز کاری باید عدد صحیح و از صفر تا ۹۰ باشد");
  if(!Number.isInteger(cutoff)||cutoff<0||cutoff>23)return fail(res,400,"ساعت پایان پذیرش باید بین صفر تا ۲۳ باشد");
  if(!Number.isFinite(cost)||cost<0)return fail(res,400,"هزینه ارسال باید عدد معتبر و غیرمنفی باشد");
  if(!/^[A-Z]{3}$/.test(currency))return fail(res,400,"واحد پول باید کد سه‌حرفی معتبر باشد");
  try{
    const row=await query("insert into commerce_delivery_methods(tenant_id,code,title,carrier_type,business_days_min,business_days_max,cutoff_hour_local,cost,currency,enabled) values($1,$2,$3,$4,$5,$6,$7,$8,$9,true) returning id,code,title,carrier_type,business_days_min,business_days_max,cutoff_hour_local,cost,currency,enabled",[t.id,code,title,carrierType,minDays,maxDays,cutoff,cost,currency]);
    res.status(201).json(row.rows[0]);
  }catch(e:any){if(e?.code==="23505")return fail(res,409,"شناسه این روش ارسال قبلاً ثبت شده است");throw e;}
}));
logisticsRouter.patch("/api/logistics/delivery-methods/:id/enabled",requireAuth,requirePermission("modules:12-logistics-supply:write"),asyncHandler(async(req,res)=>{
  const t=await tenantOf(req);if(!t)return fail(res,403,"سازمان معتبر پیدا نشد");
  if(typeof req.body?.enabled!=="boolean")return fail(res,400,"وضعیت فعال یا غیرفعال باید مشخص باشد");
  const row=await query("update commerce_delivery_methods set enabled=$1 where id=$2 and tenant_id=$3 returning id,code,title,carrier_type,business_days_min,business_days_max,cutoff_hour_local,cost,currency,enabled",[req.body.enabled,req.params.id,t.id]);
  if(!row.rowCount)return fail(res,404,"روش ارسال پیدا نشد");
  res.json(row.rows[0]);
}));


logisticsRouter.get("/api/logistics/delivery-methods/:id/products",requireAuth,asyncHandler(async(req,res)=>{
  const t=await tenantOf(req);if(!t)return fail(res,403,"سازمان معتبر پیدا نشد");
  const method=await query("select id from commerce_delivery_methods where id=$1 and tenant_id=$2",[req.params.id,t.id]);
  if(!method.rowCount)return fail(res,404,"روش ارسال پیدا نشد");
  const rows=await query("select p.id,p.sku,p.title,coalesce(r.enabled,false) as enabled from products p left join product_delivery_rules r on r.product_id=p.id and r.delivery_method_id=$1 and r.tenant_id=$2 where p.tenant_id=$2 order by p.title",[req.params.id,t.id]);
  res.json(rows.rows);
}));
logisticsRouter.put("/api/logistics/delivery-methods/:id/products",requireAuth,requirePermission("modules:12-logistics-supply:write"),asyncHandler(async(req,res)=>{
  const t=await tenantOf(req);if(!t)return fail(res,403,"سازمان معتبر پیدا نشد");
  const ids=req.body?.productIds;
  if(!Array.isArray(ids)||ids.length>1000||ids.some((id:any)=>typeof id!=="string"||!id.trim()))return fail(res,400,"فهرست کالاهای انتخاب‌شده معتبر نیست");
  const uniqueIds=[...new Set(ids.map((id:string)=>id.trim()))];
  const client=await pool.connect();
  try{
    await client.query("begin");
    const method=await client.query("select id from commerce_delivery_methods where id=$1 and tenant_id=$2 for update",[req.params.id,t.id]);
    if(!method.rowCount){await client.query("rollback");return fail(res,404,"روش ارسال پیدا نشد");}
    if(uniqueIds.length){
      const valid=await client.query("select id from products where tenant_id=$1 and id=any($2::uuid[])",[t.id,uniqueIds]);
      if(valid.rowCount!==uniqueIds.length){await client.query("rollback");return fail(res,400,"یک یا چند کالا در محدوده سازمانی جاری وجود ندارد");}
    }
    await client.query("delete from product_delivery_rules where tenant_id=$1 and delivery_method_id=$2",[t.id,req.params.id]);
    if(uniqueIds.length)await client.query("insert into product_delivery_rules(tenant_id,product_id,delivery_method_id,enabled) select $1,p.id,$2,true from products p where p.tenant_id=$1 and p.id=any($3::uuid[])",[t.id,req.params.id,uniqueIds]);
    await client.query("commit");
    res.json({deliveryMethodId:req.params.id,assignedProductCount:uniqueIds.length});
  }catch(e){await client.query("rollback");throw e;}finally{client.release();}
}));
