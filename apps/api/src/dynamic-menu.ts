import {Router, type Request, type Response} from "express";
import {query} from "./db.js";
import {requireAuth, requirePermission} from "./auth.js";

const router=Router();

const CANONICAL_ROOT_KEYS=[
 "01-dashboard","02-organizations","03-users-access","04-customers-360","05-smart-calendar","06-business-rules","07-sla",
 "08-accounting-finance","09-commerce-stores","10-domains","11-merchants","12-sellers","13-payments-settlement","14-form-builder",
 "15-menu-builder","16-page-builder","17-frontend-management","18-notifications","19-documents-governance","20-system-settings",
 "21-purchasing-supply","22-sales-revenue","23-inventory-warehouse","24-production","25-costing","26-treasury-bank",
 "27-receivables","28-payables","29-wallet-ledger","30-projects-cost-centers","31-fixed-assets","32-tax-e-invoicing",
 "33-budget-financial-control","34-financial-commitments","35-credit-financing","36-loans","37-collateral-guarantees",
 "38-collections","39-human-resources","40-ai-finance","41-ai-documents-ocr","42-audit-internal-control","43-communication-hub",
 "44-marketing-content","45-search-analytics","46-unified-applications","47-contracts-legal","48-shipping-delivery","49-reconciliation",
 "50-release-health"
] as const;

router.get("/api/dashboard/menu-tree",requireAuth,async(req:Request,res:Response)=>{
 const panel=typeof req.query.panel==="string"&&req.query.panel.trim()?req.query.panel.trim():"admin";
 const user=(req as any).user;
 const params:any[]=[panel,CANONICAL_ROOT_KEYS];
 let access="";
 if(user.role!=="admin"){
  params.push(user.role);
  access=" and (mi.permission is null or exists (select 1 from role_permissions rp where rp.role=$3 and rp.permission=mi.permission))";
 }
 const sql=`
   select mi.id,mi.menu_key,mi.parent_id,mi.title,mi.path,mi.icon,mi.sort_order,mi.permission,mi.children,
          coalesce(mip.is_shared,true) as is_shared,
          coalesce(mip.sort_order,mi.sort_order) as panel_sort_order
   from menu_items mi
   left join menu_item_panels mip on mip.menu_item_id=mi.id and mip.panel_code=$1
   where mi.is_active=true
     and (mip.menu_item_id is null or mip.is_visible=true)
     and (mi.menu_key=any($2) or mi.parent_id is not null)
     ${access}
   order by coalesce(mip.sort_order,mi.sort_order),mi.sort_order,mi.id`;
 const rows=(await query(sql,params)).rows;
 const visible=new Set(rows.map((r:any)=>String(r.id)));
 const roots=rows.filter((r:any)=>r.parent_id===null&&CANONICAL_ROOT_KEYS.includes(r.menu_key));
 const childrenByParent=new Map<string,any[]>();
 for(const row of rows){
  if(row.parent_id===null)continue;
  const key=String(row.parent_id);
  if(!childrenByParent.has(key))childrenByParent.set(key,[]);
  childrenByParent.get(key)!.push(row);
 }
 const build=(row:any):any=>{
  const children=(childrenByParent.get(String(row.id))||[]).filter((child:any)=>{
   if(user.role==="admin")return true;
   return child.permission===null||child.permission===undefined||true;
  }).sort((a:any,b:any)=>(a.panel_sort_order??a.sort_order)-(b.panel_sort_order??b.sort_order)||a.id-b.id);
  return {
   id:row.id,menu_key:row.menu_key,parent_id:row.parent_id,title:row.title,path:row.path,icon:row.icon??null,
   sort_order:row.sort_order,permission:row.permission,children:row.children||[],is_shared:Boolean(row.is_shared),
   child_items:children.map(build)
  };
 };
 const items=roots.sort((a:any,b:any)=>(a.panel_sort_order??a.sort_order)-(b.panel_sort_order??b.sort_order)||a.id-b.id).map(build);
 res.json({panel,items,total:items.length,canonicalTotal:CANONICAL_ROOT_KEYS.length});
});
router.patch("/api/dashboard/menu-items/:id",requireAuth,requirePermission("menus:manage"),async(req:Request,res:Response)=>{
 const {title,path,permission,parentId,children}=req.body||{};
 const r=await query(
  "update menu_items set title=coalesce($1,title),path=coalesce($2,path),permission=$3,parent_id=$4,children=coalesce($5,children),updated_at=now() where id=$6 returning *",
  [title,path,permission??null,parentId??null,children??[],req.params.id]
 );
 if(!r.rowCount)return res.status(404).json({error:"آیتم منو پیدا نشد"});
 res.json(r.rows[0]);
});

router.patch("/api/dashboard/menu-items/:id/move",requireAuth,requirePermission("menus:manage"),async(req:Request,res:Response)=>{
 const {panel="admin",sortOrder,parentId,visible=true,shared=true}=req.body||{};
 if(!Number.isInteger(sortOrder))return res.status(400).json({error:"ترتیب منو نامعتبر است"});
 const client=await (await import("./db.js")).pool.connect();
 try{
  await client.query("begin");
  const item=await client.query("select id from menu_items where id=$1 for update",[req.params.id]);
  if(!item.rowCount){await client.query("rollback");return res.status(404).json({error:"آیتم منو پیدا نشد"});}
  await client.query("update menu_items set parent_id=$1,updated_at=now() where id=$2",[parentId??null,req.params.id]);
  await client.query(
   "insert into menu_item_panels(menu_item_id,panel_code,is_shared,sort_order,is_visible) values($1,$2,$3,$4,$5) on conflict(menu_item_id,panel_code) do update set is_shared=excluded.is_shared,sort_order=excluded.sort_order,is_visible=excluded.is_visible",
   [req.params.id,panel,Boolean(shared),sortOrder,Boolean(visible)]
  );
  await client.query("commit");
  res.json({ok:true,id:req.params.id,panel,sortOrder,parentId:parentId??null,shared:Boolean(shared),visible:Boolean(visible)});
 }catch(error){await client.query("rollback");throw error}finally{client.release();}
});

router.patch("/api/dashboard/menu-items/:id/panels/:panel",requireAuth,requirePermission("menus:manage"),async(req:Request,res:Response)=>{
 const {shared=true,visible=true,sortOrder=0}=req.body||{};
 const r=await query(
  "insert into menu_item_panels(menu_item_id,panel_code,is_shared,sort_order,is_visible) values($1,$2,$3,$4,$5) on conflict(menu_item_id,panel_code) do update set is_shared=excluded.is_shared,sort_order=excluded.sort_order,is_visible=excluded.is_visible",
  [req.params.id,req.params.panel,Boolean(shared),Number(sortOrder)||0,Boolean(visible)]
 );
 res.json({ok:true});
});

export {router as dynamicMenuRouter};
