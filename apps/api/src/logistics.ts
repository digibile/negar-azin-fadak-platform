import {Router} from "express";
import {query,pool} from "./db.js";
import {requireAuth,requirePermission} from "./auth.js";
import {asyncHandler} from "./http.js";
import {resolveTenant} from "./tenant-context.js";

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
  const r=await query("insert into logistics_supply_plans(tenant_id,plan_no,planned_date,notes,created_by) values($1,$2,$3,$4,$5) returning *",[t.id,b.planNo,b.plannedDate||null,b.notes||null,req.user.id]);
  await audit(t.id,"supply_plan",r.rows[0].id,"created",null,r.rows[0].status,req.user.id);
  res.status(201).json(r.rows[0]);
}));
logisticsRouter.patch("/api/logistics/plans/:id/status",requireAuth,requirePermission("modules:12-logistics-supply:write"),asyncHandler(async(req,res)=>{
  const t=await tenantOf(req),b=req.body||{}; if(!t)return fail(res,403,"سازمان معتبر پیدا نشد");
  const p=(await query("select * from logistics_supply_plans where id=$1 and tenant_id=$2",[req.params.id,t.id])).rows[0];
  if(!p)return fail(res,404,"برنامه پیدا نشد");
  const allowed:any={draft:["approved","cancelled"],approved:["released","cancelled"],released:["closed"],closed:[],cancelled:[]};
  if(!allowed[p.status]?.includes(b.status))return fail(res,409,"تغییر وضعیت برنامه مجاز نیست");
  const r=(await query("update logistics_supply_plans set status=$1,approved_by=case when $1='approved' then $2 else approved_by end where id=$3 and tenant_id=$4 returning *",[b.status,req.user.id,p.id,t.id])).rows[0];
  await audit(t.id,"supply_plan",p.id,"status_change",p.status,b.status,req.user.id,b.reason);
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
    [t.id,b.orderNo,b.planId||null,b.origin,b.destination,b.cargoDescription||null,Number(b.quantity||0),b.requestedDate||null,b.notes||null,req.user.id]
  );
  await audit(t.id,"supply_order",r.rows[0].id,"created",null,r.rows[0].status,req.user.id);
  res.status(201).json(r.rows[0]);
}));
logisticsRouter.patch("/api/logistics/orders/:id/status",requireAuth,requirePermission("modules:12-logistics-supply:write"),asyncHandler(async(req,res)=>{
  const t=await tenantOf(req),b=req.body||{}; if(!t)return fail(res,403,"سازمان معتبر پیدا نشد");
  const o=(await query("select * from logistics_supply_orders where id=$1 and tenant_id=$2",[req.params.id,t.id])).rows[0];
  if(!o)return fail(res,404,"سفارش تأمین پیدا نشد");
  const allowed:any={draft:["submitted","cancelled"],submitted:["approved","cancelled"],approved:["assigned","cancelled"],assigned:["shipped","cancelled"],shipped:["delivered","cancelled"],delivered:[],cancelled:[]};
  if(!allowed[o.status]?.includes(b.status))return fail(res,409,"تغییر وضعیت سفارش مجاز نیست");
  const r=(await query("update logistics_supply_orders set status=$1,approved_by=case when $1='approved' then $2 else approved_by end,updated_at=now() where id=$3 and tenant_id=$4 returning *",[b.status,req.user.id,o.id,t.id])).rows[0];
  await audit(t.id,"supply_order",o.id,"status_change",o.status,b.status,req.user.id,b.reason);
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

logisticsRouter.get("/api/logistics/shipments",requireAuth,asyncHandler(async(req,res)=>{
  const t=await tenantOf(req); if(!t)return fail(res,403,"سازمان معتبر پیدا نشد");
  res.json((await query(
    "select s.*,o.order_no,r.name route_name,v.plate_no,d.name driver_name from logistics_shipments s left join logistics_supply_orders o on o.id=s.supply_order_id left join logistics_routes r on r.id=s.route_id left join logistics_vehicles v on v.id=s.vehicle_id left join logistics_drivers d on d.id=s.driver_id where s.tenant_id=$1 order by s.created_at desc",
    [t.id]
  )).rows);
}));

logisticsRouter.post("/api/logistics/shipments",requireAuth,requirePermission("modules:12-logistics-supply:write"),asyncHandler(async(req,res)=>{
  const t=await tenantOf(req),b=req.body||{}; if(!t)return fail(res,403,"سازمان معتبر پیدا نشد");
  if(!b.shipmentNo||!b.origin||!b.destination)return fail(res,400,"اطلاعات مرسوله کامل نیست");
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
      [t.id,b.shipmentNo,b.supplyOrderId||null,b.routeId||null,b.vehicleId||null,b.driverId||null,b.origin,b.destination,b.trackingCode||null,req.user.id]
    )).rows[0];
    if(b.vehicleId)await c.query("update logistics_vehicles set status='assigned' where id=$1 and tenant_id=$2",[b.vehicleId,t.id]);
    if(order)await c.query("update logistics_supply_orders set status='assigned',updated_at=now() where id=$1 and tenant_id=$2",[order.id,t.id]);
    await c.query("commit");
    await audit(t.id,"shipment",r.id,"created",null,r.status,req.user.id);
    res.status(201).json(r);
  }catch(e:any){await c.query("rollback");res.status(400).json({error:e.message||"ثبت مرسوله ناموفق بود"});}
  finally{c.release();}
}));

logisticsRouter.patch("/api/logistics/shipments/:id/status",requireAuth,asyncHandler(async(req,res)=>{
  const t=await tenantOf(req),b=req.body||{}; if(!t)return fail(res,403,"سازمان معتبر پیدا نشد");
  const s=(await query("select * from logistics_shipments where id=$1 and tenant_id=$2",[req.params.id,t.id])).rows[0];
  if(!s)return fail(res,404,"مرسوله پیدا نشد");
  const isDelivery=["delivered","failed"].includes(b.status);
  const permission=isDelivery?"modules:12-logistics-supply:deliver":"modules:12-logistics-supply:dispatch";
  if(!(await can(req,permission)))return fail(res,403,"دسترسی لازم برای این عملیات وجود ندارد");
  const allowed:any={planned:["assigned","cancelled"],assigned:["picked_up","cancelled"],picked_up:["in_transit","failed"],in_transit:["delivered","failed"],failed:["assigned","cancelled"],delivered:[],cancelled:[]};
  if(!allowed[s.status]?.includes(b.status))return fail(res,409,"تغییر وضعیت مرسوله مجاز نیست");
  if(b.status==="delivered"&&!String(b.location||"").trim())return fail(res,400,"محل تحویل الزامی است");
  if(b.status==="failed"&&!String(b.reason||"").trim())return fail(res,400,"علت عدم تحویل الزامی است");
  const c=await pool.connect();
  try{
    await c.query("begin");
    const r=(await c.query(
      "update logistics_shipments set status=$1,dispatch_at=case when $1='in_transit' then coalesce(dispatch_at,now()) else dispatch_at end,delivered_at=case when $1='delivered' then now() else delivered_at end,delivered_reason=case when $1='delivered' then $2 else delivered_reason end,failed_reason=case when $1='failed' then $2 else failed_reason end,updated_at=now() where id=$3 and tenant_id=$4 returning *",
      [b.status,b.status==="failed"?b.reason:(b.status==="delivered"?b.location:null),s.id,t.id]
    )).rows[0];
    if(s.vehicle_id&&["delivered","failed","cancelled"].includes(b.status)){
      await c.query("update logistics_vehicles set status='available' where id=$1 and tenant_id=$2 and status='assigned'",[s.vehicle_id,t.id]);
    }
    if(s.supply_order_id&&b.status==="delivered"){
      await c.query("update logistics_supply_orders set status='delivered',updated_at=now() where id=$1 and tenant_id=$2",[s.supply_order_id,t.id]);
    }
    if(s.supply_order_id&&b.status==="cancelled"){
      await c.query("update logistics_supply_orders set status='cancelled',updated_at=now() where id=$1 and tenant_id=$2 and status not in ('delivered','cancelled')",[s.supply_order_id,t.id]);
    }
    await c.query("insert into logistics_delivery_events(tenant_id,shipment_id,status,location,description,actor_user_id) values($1,$2,$3,$4,$5,$6)",[t.id,s.id,b.status,b.location||null,b.description||b.reason||null,req.user.id]);
    await c.query("commit");
    await audit(t.id,"shipment",s.id,"status_change",s.status,b.status,req.user.id,b.reason||b.location);
    res.json(r);
  }catch(e){await c.query("rollback");throw e}finally{c.release();}
}));

logisticsRouter.get("/api/logistics/shipments/:id/tracking",requireAuth,asyncHandler(async(req,res)=>{
  const t=await tenantOf(req); if(!t)return fail(res,403,"سازمان معتبر پیدا نشد");
  if(!(await can(req,"modules:12-logistics-supply:track")))return fail(res,403,"دسترسی رهگیری ندارید");
  const s=(await query("select s.*,o.order_no from logistics_shipments s left join logistics_supply_orders o on o.id=s.supply_order_id where s.id=$1 and s.tenant_id=$2",[req.params.id,t.id])).rows[0];
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
