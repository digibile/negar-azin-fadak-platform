import {Router, type Request, type Response} from "express";
import {query} from "./db.js";
import {requireAuth, requirePermission} from "./auth.js";

const router=Router();

const CANONICAL_ROOT_KEYS=[
 "central-01-governance","central-02-organization","central-03-people","central-04-hr","central-05-commerce",
 "central-06-finance","central-07-credit","central-08-supply","central-09-projects","central-10-legal",
 "central-11-documents","central-12-payments","central-13-data-ai","central-14-integrations","central-15-risk",
 "central-16-assets","central-17-builders","central-18-notifications","central-19-security","central-20-settings",
 "central-21-domains","central-22-merchants","central-23-sellers"
] as const;

router.get("/api/dashboard/menu-tree",requireAuth,async(req:Request,res:Response)=>{
 const panel=typeof req.query.panel==="string"&&req.query.panel.trim()?req.query.panel.trim():"admin";
 const user=(req as any).user;
 const params:any[]=[panel];
 let access="";
 if(user.role!=="admin"){
  params.push(user.role);
  access=" and (mi.permission is null or exists (select 1 from role_permissions rp where rp.role=$2 and rp.permission=mi.permission))";
 }
 const childAccess=user.role==="admin"?"":" and (c.permission is null or exists (select 1 from role_permissions crp where crp.role=$2 and crp.permission=c.permission))";
 const grandChildAccess=user.role==="admin"?"":" and (gc.permission is null or exists (select 1 from role_permissions grp where grp.role=$2 and grp.permission=gc.permission))";
 const rootParam=params.length+1;
 const sql=`select mi.id,mi.menu_key,mi.parent_id,mi.title,mi.path,mi.icon,mi.sort_order,mi.permission,mi.children,
   coalesce(mip.is_shared,true) as is_shared,
   coalesce(mip.sort_order,mi.sort_order) as panel_sort_order,
   coalesce((
     select jsonb_agg(
       jsonb_build_object(
         'id',c.id,'menu_key',c.menu_key,'parent_id',c.parent_id,
         'title',c.title,'path',c.path,'icon',c.icon,'sort_order',c.sort_order,
         'permission',c.permission,
         'child_items',coalesce((
           select jsonb_agg(
             jsonb_build_object(
               'id',gc.id,'menu_key',gc.menu_key,'parent_id',gc.parent_id,
               'title',gc.title,'path',gc.path,'icon',gc.icon,
               'sort_order',gc.sort_order,'permission',gc.permission
             )
             order by coalesce(gp.sort_order,gc.sort_order),gc.sort_order,gc.id
           )
           from menu_items gc
           left join menu_item_panels gp on gp.menu_item_id=gc.id and gp.panel_code=$1
           where gc.parent_id=c.id and gc.is_active=true
             and (gp.menu_item_id is null or gp.is_visible=true)
             ${grandChildAccess}
         ),'[]'::jsonb)
       )
       order by coalesce(cp.sort_order,c.sort_order),c.sort_order,c.id
     )
     from menu_items c
     left join menu_item_panels cp on cp.menu_item_id=c.id and cp.panel_code=$1
     where c.parent_id=mi.id and c.is_active=true
       and (cp.menu_item_id is null or cp.is_visible=true)
       ${childAccess}
   ),'[]'::jsonb) as child_items
   from menu_items mi
   left join menu_item_panels mip on mip.menu_item_id=mi.id and mip.panel_code=$1
   where mi.is_active=true
     and mi.parent_id is null
     and mi.menu_key = any($${rootParam})
     and (mip.menu_item_id is null or mip.is_visible=true)
     ${access}
   order by coalesce(mip.sort_order,mi.sort_order),mi.sort_order,mi.id`;
 params.push(CANONICAL_ROOT_KEYS);
 const rows=(await query(sql,params)).rows;
 res.json({panel,items:rows,total:rows.length,canonicalTotal:CANONICAL_ROOT_KEYS.length});
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
