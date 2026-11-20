import {Router} from "express";
import {query,pool} from "./db.js";
import {requireAuth,requirePermission} from "./auth.js";
import {asyncHandler} from "./http.js";
import {resolveTenant} from "./tenant-context.js";

export const logisticsRouter=Router();
const tenantOf=(req:any)=>resolveTenant(req,req.user);
const fail=(res:any,status:number,error:string,details?:any)=>res.status(status).json({error,...(details||{})});

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
  const planNo=String(b.planNo??"").trim();
  if(!planNo||planNo.length>120)return fail(res,400,"شماره برنامه معتبر نیست");
  if(b.plannedDate&&!/^\\d{4}-\\d{2}-\\d{2}$/.test(String(b.plannedDate)))return fail(res,400,"تاریخ برنامه معتبر نیست");
  const r=await query("insert into logistics_supply_plans(tenant_id,plan_no,planned_date,notes,created_by) values($1,$2,$3,$4,$5) returning *",[t.id,planNo,b.plannedDate||null,b.notes||null,(req as any).user.id]);
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

logisticsRouter.get("/api/logistics/marketplace-orders/eligible",requireAuth,asyncHandler(async(req,res)=>{
  const t=await tenantOf(req); if(!t)return fail(res,403,"سازمان معتبر پیدا نشد");
  const r=await query(
    "select o.id,o.order_no,o.status,o.created_at,o.total_amount,o.currency,a.recipient_name,a.mobile,a.province,a.city,a.address_line,so.id as supply_order_id,so.status as supply_status,(select coalesce(jsonb_agg(jsonb_build_object('status',ir.status,'quantity',ir.quantity,'inventoryProductId',ir.inventory_product_id) order by ir.created_at),'[]'::jsonb) from marketplace_inventory_reservations ir where ir.tenant_id=o.tenant_id and ir.marketplace_order_id=o.id) as inventory_reservations,(select coalesce(jsonb_agg(jsonb_build_object('title',p.title,'quantity',oi.quantity) order by oi.created_at),'[]'::jsonb) from marketplace_order_items oi join products p on p.id=oi.product_id where oi.order_id=o.id) as items from marketplace_orders o left join marketplace_customer_addresses a on a.id=o.delivery_address_id and a.tenant_id=o.tenant_id left join logistics_supply_orders so on so.tenant_id=o.tenant_id and so.marketplace_order_id=o.id where o.tenant_id=$1 and o.status='paid' order by o.created_at asc limit 200",
    [t.id]
  );
  res.json(r.rows);
}));

logisticsRouter.get("/api/logistics/orders",requireAuth,asyncHandler(async(req,res)=>{
  const t=await tenantOf(req); if(!t)return fail(res,403,"سازمان معتبر پیدا نشد");
  const r=await query(
    "select o.*,p.plan_no from logistics_supply_orders o left join logistics_supply_plans p on p.id=o.plan_id where o.tenant_id=$1 order by o.created_at desc",
    [t.id]
  );
  res.json(r.rows);
}));

logisticsRouter.post("/api/logistics/orders/from-marketplace/:orderId",requireAuth,requirePermission("modules:12-logistics-supply:write"),asyncHandler(async(req,res)=>{
  const t=await tenantOf(req),sourceWarehouseId=String(req.body?.sourceWarehouseId??"").trim();
  if(!t)return fail(res,403,"سازمان معتبر پیدا نشد");
  if(!sourceWarehouseId)return fail(res,400,"انتخاب انبار مبدأ الزامی است");
  const c=await pool.connect();
  try{
    await c.query("begin");
    const warehouse=(await c.query("select id,name,address from inventory_warehouses where id=$1 and tenant_id=$2 and status='active' for share",[sourceWarehouseId,t.id])).rows[0];
    if(!warehouse){await c.query("rollback");return fail(res,400,"انبار مبدأ فعال و متعلق به سازمان نیست");}
    const origin=[warehouse.name,warehouse.address].filter(Boolean).join("، ");
    if(!origin||origin.length>250){await c.query("rollback");return fail(res,400,"نشانی انبار مبدأ معتبر نیست");}
    const order=(await c.query(
      "select o.id,o.order_no,o.status,a.province,a.city,a.address_line,(select coalesce(sum(oi.quantity),0) from marketplace_order_items oi where oi.order_id=o.id) quantity,(select string_agg(p.title||' × '||oi.quantity,', ' order by oi.created_at) from marketplace_order_items oi join products p on p.id=oi.product_id where oi.order_id=o.id) cargo from marketplace_orders o left join marketplace_customer_addresses a on a.id=o.delivery_address_id and a.tenant_id=o.tenant_id where o.id=$1 and o.tenant_id=$2 for update of o",
      [req.params.orderId,t.id]
    )).rows[0];
    if(!order){await c.query("rollback");return fail(res,404,"سفارش فروشگاه پیدا نشد");}
    if(order.status!=="paid"){await c.query("rollback");return fail(res,409,"فقط سفارش پرداخت‌شده قابل ارجاع به لجستیک است");}
    const existing=await c.query("select * from logistics_supply_orders where tenant_id=$1 and marketplace_order_id=$2 for update",[t.id,order.id]);
    if(existing.rowCount){await c.query("commit");return res.json({supplyOrder:existing.rows[0],idempotent:true});}
    const destination=[order.province,order.city,order.address_line].filter(Boolean).join("، ");
    if(!destination){await c.query("rollback");return fail(res,409,"نشانی تحویل سفارش ثبت نشده است");}

    const orderItems=(await c.query(
      "select oi.product_id,ip.id as inventory_product_id,mil.quantity_factor,round(sum(oi.quantity)*mil.quantity_factor,4)::numeric warehouse_quantity from marketplace_order_items oi join products p on p.id=oi.product_id and p.tenant_id=$2 left join marketplace_inventory_product_links mil on mil.tenant_id=p.tenant_id and mil.product_id=p.id left join inventory_products ip on ip.id=mil.inventory_product_id and ip.tenant_id=mil.tenant_id and ip.status='active' where oi.order_id=$1 group by oi.product_id,ip.id,mil.quantity_factor order by ip.id nulls last,oi.product_id",
      [order.id,t.id]
    )).rows;
    if(!orderItems.length){await c.query("rollback");return fail(res,409,"اقلام سفارش برای رزرو انبار پیدا نشدند");}
    if(orderItems.some((item:any)=>!item.inventory_product_id||Number(item.warehouse_quantity)<=0)){await c.query("rollback");return fail(res,409,"همه کالاهای سفارش باید به کالای انبار متصل و دارای ضریب تبدیل معتبر باشند");}

    const totals=new Map<string,number>();
    for(const item of orderItems)totals.set(item.inventory_product_id,(totals.get(item.inventory_product_id)||0)+Number(item.warehouse_quantity));
    for(const [inventoryProductId,required] of [...totals.entries()].sort((a,b)=>a[0].localeCompare(b[0]))){
      const stock=(await c.query("select quantity,reserved_quantity from inventory_stock where tenant_id=$1 and warehouse_id=$2 and product_id=$3 for update",[t.id,warehouse.id,inventoryProductId])).rows[0];
      if(!stock){await c.query("rollback");return fail(res,409,"برای یکی از کالاهای سفارش در انبار مبدأ موجودی ثبت نشده است");}
      if(Number(stock.quantity)-Number(stock.reserved_quantity)<required){await c.query("rollback");return fail(res,409,"موجودی آزاد انبار برای تکمیل سفارش کافی نیست",{inventoryProductId,available:Number(stock.quantity)-Number(stock.reserved_quantity),required});}
    }

    const created=(await c.query(
      "insert into logistics_supply_orders(tenant_id,order_no,marketplace_order_id,source_warehouse_id,origin,destination,cargo_description,quantity,status,created_by) values($1,$2,$3,$4,$5,$6,$7,$8,'submitted',$9) returning *",
      [t.id,order.order_no,order.id,warehouse.id,origin,destination,order.cargo||"اقلام سفارش فروشگاه",Number(order.quantity||0),(req as any).user.id]
    )).rows[0];
    for(const [inventoryProductId,required] of [...totals.entries()].sort((a,b)=>a[0].localeCompare(b[0]))){
      const updated=await c.query("update inventory_stock set reserved_quantity=reserved_quantity+$1,updated_at=now() where tenant_id=$2 and warehouse_id=$3 and product_id=$4 and quantity-reserved_quantity >= $1",[required,t.id,warehouse.id,inventoryProductId]);
      if(!updated.rowCount)throw new Error("موجودی آزاد انبار هنگام رزرو تغییر کرده است؛ عملیات دوباره بررسی شود");
    }
    for(const item of orderItems){
      const reservation=(await c.query("insert into marketplace_inventory_reservations(tenant_id,supply_order_id,marketplace_order_id,warehouse_id,marketplace_product_id,inventory_product_id,quantity,status) values($1,$2,$3,$4,$5,$6,$7,'reserved') returning id",[t.id,created.id,order.id,warehouse.id,item.product_id,item.inventory_product_id,item.warehouse_quantity])).rows[0];
      await c.query("insert into inventory_events(tenant_id,entity_type,entity_id,event_type,quantity,actor_user_id,reason) values($1,'marketplace_reservation',$2,'reserved',$3,$4,$5)",[t.id,reservation.id,item.warehouse_quantity,(req as any).user.id,"رزرو سفارش "+order.order_no]);
    }
    await c.query("insert into logistics_events(tenant_id,entity_type,entity_id,event_type,from_status,to_status,actor_user_id,reason) values($1,'supply_order',$2,'marketplace_order_linked',null,'submitted',$3,$4)",[t.id,created.id,(req as any).user.id,"سفارش فروشگاه "+order.order_no+"؛ رزرو موجودی انبار"]);
    await c.query("insert into platform_audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,after_data) values($1,$2,'logistics.marketplace_order_linked','logistics_supply_order',$3,$4)",[t.id,(req as any).user.id,created.id,JSON.stringify({marketplaceOrderId:order.id,orderNo:order.order_no,warehouseId:warehouse.id,reservedItems:orderItems.length})]);
    await c.query("commit");
    res.status(201).json({supplyOrder:created,idempotent:false,reservation:{status:"reserved",items:orderItems.length,warehouseId:warehouse.id}});
  }catch(e){await c.query("rollback");throw e;}finally{c.release();}
}));
logisticsRouter.post("/api/logistics/orders",requireAuth,requirePermission("modules:12-logistics-supply:write"),asyncHandler(async(req,res)=>{
  const t=await tenantOf(req),b=req.body||{}; if(!t)return fail(res,403,"سازمان معتبر پیدا نشد");
  const quantity=Number(b.quantity??0),orderNo=String(b.orderNo??"").trim(),origin=String(b.origin??"").trim(),destination=String(b.destination??"").trim();
  if(!orderNo||orderNo.length>120||!origin||origin.length>250||!destination||destination.length>250)return fail(res,400,"شماره سفارش، مبدأ و مقصد معتبر و الزامی هستند");
  if(!Number.isFinite(quantity)||quantity<0)return fail(res,400,"مقدار سفارش باید عدد معتبر و غیرمنفی باشد");
  if(b.planId){
    const p=(await query("select id,status from logistics_supply_plans where id=$1 and tenant_id=$2",[b.planId,t.id])).rows[0];
    if(!p)return fail(res,404,"برنامه تأمین پیدا نشد");
    if(!["approved","released"].includes(p.status))return fail(res,409,"سفارش فقط به برنامه تأییدشده یا آزادشده متصل می‌شود");
  }
  const r=await query(
    "insert into logistics_supply_orders(tenant_id,order_no,plan_id,origin,destination,cargo_description,quantity,requested_date,notes,created_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning *",
    [t.id,orderNo,b.planId||null,origin,destination,b.cargoDescription||null,quantity,b.requestedDate||null,b.notes||null,(req as any).user.id]
  );
  await audit(t.id,"supply_order",r.rows[0].id,"created",null,r.rows[0].status,(req as any).user.id);
  res.status(201).json(r.rows[0]);
}));
logisticsRouter.patch("/api/logistics/orders/:id/status",requireAuth,requirePermission("modules:12-logistics-supply:write"),asyncHandler(async(req,res)=>{
  const t=await tenantOf(req),b=req.body||{};if(!t)return fail(res,403,"سازمان معتبر پیدا نشد");
  const c=await pool.connect();
  let beforeStatus="";
  try{
    await c.query("begin");
    const o=(await c.query("select * from logistics_supply_orders where id=$1 and tenant_id=$2 for update",[req.params.id,t.id])).rows[0];
    if(!o){await c.query("rollback");return fail(res,404,"سفارش تأمین پیدا نشد");}
    beforeStatus=o.status;
    const allowed:any={draft:["submitted","cancelled"],submitted:["approved","cancelled"],approved:["assigned","cancelled"],assigned:["shipped","cancelled"],shipped:["delivered","cancelled"],delivered:[],cancelled:[]};
    if(!allowed[o.status]?.includes(b.status)){await c.query("rollback");return fail(res,409,"تغییر وضعیت سفارش مجاز نیست");}

    if(b.status==="shipped"){
      const reservations=(await c.query("select * from marketplace_inventory_reservations where tenant_id=$1 and supply_order_id=$2 and status='reserved' order by inventory_product_id for update",[t.id,o.id])).rows;
      if(o.marketplace_order_id&&!reservations.length){await c.query("rollback");return fail(res,409,"رزرو انبار این سفارش موجود نیست؛ اعزام بدون رزرو مجاز نیست");}
      for(const reservation of reservations){
        const consumed=await c.query("update inventory_stock set quantity=quantity-$1,reserved_quantity=reserved_quantity-$1,updated_at=now() where tenant_id=$2 and warehouse_id=$3 and product_id=$4 and quantity >= $1 and reserved_quantity >= $1",[reservation.quantity,t.id,reservation.warehouse_id,reservation.inventory_product_id]);
        if(!consumed.rowCount)throw new Error("موجودی یا رزرو انبار با مقدار ثبت‌شده هم‌خوانی ندارد؛ اعزام متوقف شد");
        await c.query("update marketplace_inventory_reservations set status='consumed',updated_at=now() where id=$1 and tenant_id=$2",[reservation.id,t.id]);
        await c.query("insert into inventory_events(tenant_id,entity_type,entity_id,event_type,quantity,actor_user_id,reason) values($1,'marketplace_reservation',$2,'consumed',$3,$4,$5)",[t.id,reservation.id,reservation.quantity,(req as any).user.id,"اعزام سفارش "+o.order_no]);
      }
    }else if(b.status==="cancelled"&&["draft","submitted","approved","assigned"].includes(o.status)){
      const reservations=(await c.query("select * from marketplace_inventory_reservations where tenant_id=$1 and supply_order_id=$2 and status='reserved' order by inventory_product_id for update",[t.id,o.id])).rows;
      for(const reservation of reservations){
        const released=await c.query("update inventory_stock set reserved_quantity=reserved_quantity-$1,updated_at=now() where tenant_id=$2 and warehouse_id=$3 and product_id=$4 and reserved_quantity >= $1",[reservation.quantity,t.id,reservation.warehouse_id,reservation.inventory_product_id]);
        if(!released.rowCount)throw new Error("مقدار رزرو انبار با دفتر رزرو هم‌خوانی ندارد؛ لغو متوقف شد");
        await c.query("update marketplace_inventory_reservations set status='released',updated_at=now() where id=$1 and tenant_id=$2",[reservation.id,t.id]);
        await c.query("insert into inventory_events(tenant_id,entity_type,entity_id,event_type,quantity,actor_user_id,reason) values($1,'marketplace_reservation',$2,'released',$3,$4,$5)",[t.id,reservation.id,reservation.quantity,(req as any).user.id,"لغو سفارش "+o.order_no]);
      }
    }
    const r=(await c.query("update logistics_supply_orders set status=$1,approved_by=case when $1='approved' then $2 else approved_by end,updated_at=now() where id=$3 and tenant_id=$4 returning *",[b.status,(req as any).user.id,o.id,t.id])).rows[0];
    await c.query("insert into logistics_events(tenant_id,entity_type,entity_id,event_type,from_status,to_status,actor_user_id,reason) values($1,'supply_order',$2,'status_change',$3,$4,$5,$6)",[t.id,o.id,beforeStatus,b.status,(req as any).user.id,b.reason||null]);
    await c.query("commit");
    await audit(t.id,"supply_order",o.id,"status_change",beforeStatus,b.status,(req as any).user.id,b.reason);
    res.json(r);
  }catch(e:any){await c.query("rollback");throw e;}finally{c.release();}
}));
logisticsRouter.get("/api/logistics/vehicles",requireAuth,asyncHandler(async(req,res)=>{
  const t=await tenantOf(req); if(!t)return fail(res,403,"سازمان معتبر پیدا نشد");
  res.json((await query("select * from logistics_vehicles where tenant_id=$1 order by title",[t.id])).rows);
}));
logisticsRouter.post("/api/logistics/vehicles",requireAuth,requirePermission("modules:12-logistics-supply:write"),asyncHandler(async(req,res)=>{
  const t=await tenantOf(req),b=req.body||{}; if(!t)return fail(res,403,"سازمان معتبر پیدا نشد");
  const plateNo=String(b.plateNo??"").trim(),title=String(b.title??"").trim(),capacity=Number(b.capacity??0);
  if(!plateNo||plateNo.length>40||!title||title.length>160||!Number.isFinite(capacity)||capacity<0)return fail(res,400,"پلاک، عنوان و ظرفیت خودرو معتبر هستند");
  const r=(await query("insert into logistics_vehicles(tenant_id,plate_no,title,vehicle_type,capacity) values($1,$2,$3,$4,$5) returning *",[t.id,plateNo,title,b.vehicleType||null,capacity])).rows[0];await audit(t.id,"vehicle",r.id,"created",null,r.status,(req as any).user.id);res.status(201).json(r);
}));

logisticsRouter.patch("/api/logistics/vehicles/:id",requireAuth,requirePermission("modules:12-logistics-supply:write"),asyncHandler(async(req,res)=>{
  const t=await tenantOf(req),b=req.body||{};if(!t)return fail(res,403,"سازمان معتبر پیدا نشد");
  const old=(await query("select * from logistics_vehicles where id=$1 and tenant_id=$2",[req.params.id,t.id])).rows[0];if(!old)return fail(res,404,"خودرو پیدا نشد");
  const plateNo=String(b.plateNo??old.plate_no).trim(),title=String(b.title??old.title).trim(),capacity=Number(b.capacity??old.capacity),status=b.status??old.status;
  if(!plateNo||!title||!Number.isFinite(capacity)||capacity<0||!["available","assigned","maintenance","inactive"].includes(status))return fail(res,400,"اطلاعات خودرو معتبر نیست");
  if(old.status==="assigned"&&status!=="assigned")return fail(res,409,"خودروی تخصیص‌یافته تا پایان مأموریت قابل تغییر وضعیت نیست");
  const r=await query("update logistics_vehicles set plate_no=$1,title=$2,vehicle_type=$3,capacity=$4,status=$5 where id=$6 and tenant_id=$7 returning *",[plateNo,title,b.vehicleType??old.vehicle_type,capacity,status,old.id,t.id]);await audit(t.id,"vehicle",old.id,"updated",old.status,r.rows[0].status,(req as any).user.id);res.json(r.rows[0]);
}));

logisticsRouter.get("/api/logistics/drivers",requireAuth,asyncHandler(async(req,res)=>{
  const t=await tenantOf(req); if(!t)return fail(res,403,"سازمان معتبر پیدا نشد");
  res.json((await query("select * from logistics_drivers where tenant_id=$1 order by name",[t.id])).rows);
}));
logisticsRouter.post("/api/logistics/drivers",requireAuth,requirePermission("modules:12-logistics-supply:write"),asyncHandler(async(req,res)=>{
  const t=await tenantOf(req),b=req.body||{}; if(!t)return fail(res,403,"سازمان معتبر پیدا نشد");
  const name=String(b.name??"").trim(),mobile=String(b.mobile??"").trim(),licenseNo=String(b.licenseNo??"").trim();
  if(!name||name.length>160||mobile.length>40||licenseNo.length>80)return fail(res,400,"اطلاعات راننده معتبر نیست");
  if(b.licenseExpiry&&!/^\\d{4}-\\d{2}-\\d{2}$/.test(String(b.licenseExpiry)))return fail(res,400,"تاریخ اعتبار گواهینامه معتبر نیست");
  const r=(await query("insert into logistics_drivers(tenant_id,name,mobile,license_no,license_expiry) values($1,$2,$3,$4,$5) returning *",[t.id,name,mobile||null,licenseNo||null,b.licenseExpiry||null])).rows[0];await audit(t.id,"driver",r.id,"created",null,r.status,(req as any).user.id);res.status(201).json(r);
}));
logisticsRouter.get("/api/logistics/routes",requireAuth,asyncHandler(async(req,res)=>{
  const t=await tenantOf(req); if(!t)return fail(res,403,"سازمان معتبر پیدا نشد");
  res.json((await query("select * from logistics_routes where tenant_id=$1 order by name",[t.id])).rows);
}));
logisticsRouter.post("/api/logistics/routes",requireAuth,requirePermission("modules:12-logistics-supply:write"),asyncHandler(async(req,res)=>{
  const t=await tenantOf(req),b=req.body||{}; if(!t)return fail(res,403,"سازمان معتبر پیدا نشد");
  const code=String(b.code??"").trim(),name=String(b.name??"").trim(),origin=String(b.origin??"").trim(),destination=String(b.destination??"").trim(),distance=Number(b.distanceKm??0);
  if(!code||code.length>80||!name||name.length>160||!origin||origin.length>250||!destination||destination.length>250||!Number.isFinite(distance)||distance<0)return fail(res,400,"اطلاعات مسیر و مسافت باید معتبر باشند");
  const r=(await query("insert into logistics_routes(tenant_id,code,name,origin,destination,distance_km) values($1,$2,$3,$4,$5,$6) returning *",[t.id,code,name,origin,destination,distance])).rows[0];await audit(t.id,"route",r.id,"created",null,r.status,(req as any).user.id);res.status(201).json(r);
}));


logisticsRouter.patch("/api/logistics/plans/:id",requireAuth,requirePermission("modules:12-logistics-supply:write"),asyncHandler(async(req,res)=>{
  const t=await tenantOf(req),b=req.body||{};if(!t)return fail(res,403,"سازمان معتبر پیدا نشد");
  const old=(await query("select * from logistics_supply_plans where id=$1 and tenant_id=$2",[req.params.id,t.id])).rows[0];
  if(!old)return fail(res,404,"برنامه پیدا نشد");
  if(old.status!=="draft")return fail(res,409,"فقط برنامه پیش‌نویس قابل ویرایش است");
  const planNo=String(b.planNo??old.plan_no).trim(),plannedDate=b.plannedDate??old.planned_date,notes=b.notes??old.notes;
  if(!planNo||planNo.length>120)return fail(res,400,"شماره برنامه معتبر نیست");
  const r=await query("update logistics_supply_plans set plan_no=$1,planned_date=$2,notes=$3 where id=$4 and tenant_id=$5 and status='draft' returning *",[planNo,plannedDate,notes,old.id,t.id]);
  if(!r.rowCount)return fail(res,409,"برنامه در این فاصله تغییر کرده است");
  await audit(t.id,"supply_plan",old.id,"updated",old.status,old.status,(req as any).user.id);
  res.json(r.rows[0]);
}));
logisticsRouter.patch("/api/logistics/orders/:id",requireAuth,requirePermission("modules:12-logistics-supply:write"),asyncHandler(async(req,res)=>{
  const t=await tenantOf(req),b=req.body||{};if(!t)return fail(res,403,"سازمان معتبر پیدا نشد");
  const old=(await query("select * from logistics_supply_orders where id=$1 and tenant_id=$2",[req.params.id,t.id])).rows[0];
  if(!old)return fail(res,404,"سفارش تأمین پیدا نشد");
  if(old.status!=="draft")return fail(res,409,"فقط سفارش پیش‌نویس قابل ویرایش است");
  const planId=b.planId===undefined?old.plan_id:(b.planId||null);
  if(planId){const p=(await query("select id,status from logistics_supply_plans where id=$1 and tenant_id=$2",[planId,t.id])).rows[0];if(!p)return fail(res,400,"برنامه متعلق به سازمان نیست");if(!["approved","released"].includes(p.status))return fail(res,409,"برنامه انتخاب‌شده تأیید نشده است");}
  const orderNo=String(b.orderNo??old.order_no).trim(),origin=String(b.origin??old.origin).trim(),destination=String(b.destination??old.destination).trim(),quantity=Number(b.quantity??old.quantity);
  if(!orderNo||!origin||!destination||!Number.isFinite(quantity)||quantity<0)return fail(res,400,"اطلاعات سفارش معتبر نیست");
  const r=await query("update logistics_supply_orders set order_no=$1,plan_id=$2,origin=$3,destination=$4,cargo_description=$5,quantity=$6,requested_date=$7,notes=$8,updated_at=now() where id=$9 and tenant_id=$10 and status='draft' returning *",[orderNo,planId,origin,destination,b.cargoDescription??old.cargo_description,quantity,b.requestedDate??old.requested_date,b.notes??old.notes,old.id,t.id]);
  if(!r.rowCount)return fail(res,409,"سفارش در این فاصله تغییر کرده است");
  await audit(t.id,"supply_order",old.id,"updated",old.status,old.status,(req as any).user.id);
  res.json(r.rows[0]);
}));


logisticsRouter.patch("/api/logistics/drivers/:id",requireAuth,requirePermission("modules:12-logistics-supply:write"),asyncHandler(async(req,res)=>{
  const t=await tenantOf(req),b=req.body||{};if(!t)return fail(res,403,"سازمان معتبر پیدا نشد");
  const old=(await query("select * from logistics_drivers where id=$1 and tenant_id=$2",[req.params.id,t.id])).rows[0];if(!old)return fail(res,404,"راننده پیدا نشد");
  const name=String(b.name??old.name).trim(),status=b.status??old.status,expiry=b.licenseExpiry===undefined?old.license_expiry:(b.licenseExpiry||null);
  if(!name||!["active","inactive","suspended"].includes(status))return fail(res,400,"اطلاعات راننده معتبر نیست");
  if(expiry!==null&&!/^\d{4}-\d{2}-\d{2}$/.test(String(expiry)))return fail(res,400,"تاریخ اعتبار گواهینامه معتبر نیست");
  const r=await query("update logistics_drivers set name=$1,mobile=$2,license_no=$3,license_expiry=$4,status=$5 where id=$6 and tenant_id=$7 returning *",[name,b.mobile??old.mobile,b.licenseNo??old.license_no,expiry,status,old.id,t.id]);await audit(t.id,"driver",old.id,"updated",old.status,r.rows[0].status,(req as any).user.id);res.json(r.rows[0]);
}));
logisticsRouter.patch("/api/logistics/routes/:id",requireAuth,requirePermission("modules:12-logistics-supply:write"),asyncHandler(async(req,res)=>{
  const t=await tenantOf(req),b=req.body||{};if(!t)return fail(res,403,"سازمان معتبر پیدا نشد");
  const old=(await query("select * from logistics_routes where id=$1 and tenant_id=$2",[req.params.id,t.id])).rows[0];if(!old)return fail(res,404,"مسیر پیدا نشد");
  const code=String(b.code??old.code).trim(),name=String(b.name??old.name).trim(),origin=String(b.origin??old.origin??"").trim(),destination=String(b.destination??old.destination??"").trim(),distance=Number(b.distanceKm??old.distance_km),status=b.status??old.status;
  if(!code||!name||!origin||!destination||!Number.isFinite(distance)||distance<0||!["active","inactive"].includes(status))return fail(res,400,"اطلاعات مسیر معتبر نیست");
  const r=await query("update logistics_routes set code=$1,name=$2,origin=$3,destination=$4,distance_km=$5,status=$6 where id=$7 and tenant_id=$8 returning *",[code,name,origin,destination,distance,status,old.id,t.id]);await audit(t.id,"route",old.id,"updated",old.status,r.rows[0].status,(req as any).user.id);res.json(r.rows[0]);
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
      // Lock the driver row so concurrent dispatch requests cannot assign the same driver twice.
      const d=(await c.query("select id,status,license_expiry from logistics_drivers where id=$1 and tenant_id=$2 for update",[b.driverId,t.id])).rows[0];
      if(!d||d.status!=="active")throw new Error("راننده فعال پیدا نشد");
      if(d.license_expiry&&new Date(d.license_expiry)<new Date())throw new Error("گواهینامه راننده منقضی شده است");
      const activeAssignment=await c.query(
        "select 1 from logistics_shipments where tenant_id=$1 and driver_id=$2 and status in ('planned','assigned','picked_up','in_transit') limit 1",
        [t.id,b.driverId]
      );
      if(activeAssignment.rowCount)throw new Error("این راننده در یک مأموریت فعال دیگر تخصیص داده شده است");
    }
    if(b.routeId){const route=(await c.query("select id from logistics_routes where id=$1 and tenant_id=$2 and status='active'",[b.routeId,t.id])).rows[0];if(!route)throw new Error("مسیر انتخاب‌شده متعلق به سازمان نیست یا غیرفعال است");}
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
  const t=await tenantOf(req),b=req.body||{};if(!t)return fail(res,403,"سازمان معتبر پیدا نشد");
  const c=await pool.connect();
  let beforeStatus="";
  let shipmentId="";
  try{
    await c.query("begin");
    const shipment=(await c.query("select * from logistics_shipments where id=$1 and tenant_id=$2 for update",[req.params.id,t.id])).rows[0];
    if(!shipment){await c.query("rollback");return fail(res,404,"مرسوله پیدا نشد");}
    shipmentId=shipment.id;beforeStatus=shipment.status;
    const isDelivery=["delivered","failed"].includes(b.status);
    const permission=isDelivery?"modules:12-logistics-supply:deliver":"modules:12-logistics-supply:dispatch";
    if(!(await can(req,permission))){await c.query("rollback");return fail(res,403,"دسترسی لازم برای این عملیات وجود ندارد");}
    const allowed:any={planned:["assigned","cancelled"],assigned:["picked_up","cancelled"],picked_up:["in_transit","failed"],in_transit:["delivered","failed"],failed:["assigned","cancelled"],delivered:[],cancelled:[]};
    if(!allowed[shipment.status]?.includes(b.status)){await c.query("rollback");return fail(res,409,"تغییر وضعیت مرسوله مجاز نیست");}
    if(b.status==="picked_up"&&(!shipment.vehicle_id||!shipment.driver_id)){await c.query("rollback");return fail(res,409,"مرسوله بدون ناوگان و راننده قابل دریافت نیست");}
    if(b.status==="delivered"&&!String(b.location||"").trim()){await c.query("rollback");return fail(res,400,"محل تحویل الزامی است");}
    if(b.status==="failed"&&!String(b.reason||"").trim()){await c.query("rollback");return fail(res,400,"علت عدم تحویل الزامی است");}

    const updated=(await c.query(
      "update logistics_shipments set status=$1,dispatch_at=case when $1='in_transit' then coalesce(dispatch_at,now()) else dispatch_at end,delivered_at=case when $1='delivered' then now() else delivered_at end,delivered_reason=case when $1='delivered' then $2 else delivered_reason end,failed_reason=case when $1='failed' then $2 else failed_reason end,updated_at=now() where id=$3 and tenant_id=$4 and status=$5 returning *",
      [b.status,b.status==="failed"?b.reason:(b.status==="delivered"?b.location:null),shipment.id,t.id,shipment.status]
    )).rows[0];
    if(!updated){await c.query("rollback");return fail(res,409,"وضعیت مرسوله هم‌زمان تغییر کرده است؛ اطلاعات را تازه‌سازی کنید");}

    if(shipment.vehicle_id&&["delivered","failed","cancelled"].includes(b.status)){
      await c.query("update logistics_vehicles set status='available' where id=$1 and tenant_id=$2 and status='assigned'",[shipment.vehicle_id,t.id]);
    }
    if(shipment.supply_order_id&&["in_transit","delivered","cancelled"].includes(b.status)){
      const supply=(await c.query("select * from logistics_supply_orders where id=$1 and tenant_id=$2 for update",[shipment.supply_order_id,t.id])).rows[0];
      if(supply&&b.status==="in_transit"&&["assigned","approved"].includes(supply.status)){
        const reservations=(await c.query("select * from marketplace_inventory_reservations where tenant_id=$1 and supply_order_id=$2 and status='reserved' order by inventory_product_id for update",[t.id,supply.id])).rows;
        if(supply.marketplace_order_id&&!reservations.length)throw new Error("رزرو انبار این سفارش موجود نیست؛ حرکت مرسوله متوقف شد");
        for(const reservation of reservations){
          const consumed=await c.query("update inventory_stock set quantity=quantity-$1,reserved_quantity=reserved_quantity-$1,updated_at=now() where tenant_id=$2 and warehouse_id=$3 and product_id=$4 and quantity >= $1 and reserved_quantity >= $1",[reservation.quantity,t.id,reservation.warehouse_id,reservation.inventory_product_id]);
          if(!consumed.rowCount)throw new Error("موجودی یا رزرو انبار با دفتر رزرو هم‌خوانی ندارد؛ حرکت مرسوله متوقف شد");
          await c.query("update marketplace_inventory_reservations set status='consumed',updated_at=now() where id=$1 and tenant_id=$2",[reservation.id,t.id]);
          await c.query("insert into inventory_events(tenant_id,entity_type,entity_id,event_type,quantity,actor_user_id,reason) values($1,'marketplace_reservation',$2,'consumed',$3,$4,$5)",[t.id,reservation.id,reservation.quantity,(req as any).user.id,"حرکت مرسوله "+shipment.shipment_no]);
        }
        await c.query("update logistics_supply_orders set status='shipped',updated_at=now() where id=$1 and tenant_id=$2",[supply.id,t.id]);
      }else if(supply&&b.status==="delivered"){
        await c.query("update logistics_supply_orders set status='delivered',updated_at=now() where id=$1 and tenant_id=$2 and status not in ('cancelled')",[supply.id,t.id]);
      }else if(supply&&b.status==="cancelled"&&["draft","submitted","approved","assigned"].includes(supply.status)){
        const reservations=(await c.query("select * from marketplace_inventory_reservations where tenant_id=$1 and supply_order_id=$2 and status='reserved' order by inventory_product_id for update",[t.id,supply.id])).rows;
        for(const reservation of reservations){
          const released=await c.query("update inventory_stock set reserved_quantity=reserved_quantity-$1,updated_at=now() where tenant_id=$2 and warehouse_id=$3 and product_id=$4 and reserved_quantity >= $1",[reservation.quantity,t.id,reservation.warehouse_id,reservation.inventory_product_id]);
          if(!released.rowCount)throw new Error("رزرو انبار با دفتر موجودی هم‌خوانی ندارد؛ لغو مرسوله متوقف شد");
          await c.query("update marketplace_inventory_reservations set status='released',updated_at=now() where id=$1 and tenant_id=$2",[reservation.id,t.id]);
          await c.query("insert into inventory_events(tenant_id,entity_type,entity_id,event_type,quantity,actor_user_id,reason) values($1,'marketplace_reservation',$2,'released',$3,$4,$5)",[t.id,reservation.id,reservation.quantity,(req as any).user.id,"لغو مرسوله "+shipment.shipment_no]);
        }
        await c.query("update logistics_supply_orders set status='cancelled',updated_at=now() where id=$1 and tenant_id=$2",[supply.id,t.id]);
      }
    }
    await c.query("insert into logistics_delivery_events(tenant_id,shipment_id,status,location,description,actor_user_id) values($1,$2,$3,$4,$5,$6)",[t.id,shipment.id,b.status,b.location||null,b.description||b.reason||null,(req as any).user.id]);
    await c.query("commit");
    await audit(t.id,"shipment",shipment.id,"status_change",beforeStatus,b.status,(req as any).user.id,b.reason||b.location);
    res.json(updated);
  }catch(e:any){await c.query("rollback");throw e;}finally{c.release();}
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
