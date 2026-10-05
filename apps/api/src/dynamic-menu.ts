import {Router, type Request, type Response} from "express";
import {query} from "./db.js";
import {requireAuth, requirePermission} from "./auth.js";

const router=Router();

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
 const sql=`select mi.id,mi.menu_key,mi.parent_id,mi.title,mi.path,mi.icon,mi.sort_order,mi.permission,mi.children,
   mip.is_shared,mip.sort_order as panel_sort_order,
   coalesce((
     select jsonb_agg(
       jsonb_build_object(
         'id',c.id,
         'menu_key',c.menu_key,
         'parent_id',c.parent_id,
         'title',c.title,
         'path',c.path,
         'icon',c.icon,
         'sort_order',c.sort_order,
         'permission',c.permission
       ) order by cp.sort_order,c.sort_order,c.id
     )
     from menu_items c
     join menu_item_panels cp on cp.menu_item_id=c.id
     where c.parent_id=mi.id
       and c.is_active=true
       and cp.panel_code=$1
       and cp.is_visible=true
       ${childAccess}
   ),'[]'::jsonb) as child_items
   from menu_items mi
   join menu_item_panels mip on mip.menu_item_id=mi.id
   where mi.is_active=true and mi.parent_id is null and mip.panel_code=$1 and mip.is_visible=true${access}
   order by mip.sort_order,mi.sort_order,mi.id`;
 const rows=(await query(sql,params)).rows;
 res.json({panel,items:rows,total:rows.length});
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
