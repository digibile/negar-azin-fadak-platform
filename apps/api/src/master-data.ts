import {Router} from "express";
import {query} from "./db.js";
import {requireAuth,requireCsrf,requirePermission} from "./auth.js";
const router=Router();
const read= requirePermission("master-data.read");\nconst write= requirePermission("master-data.write");\nasync function audit(req:any,entity:string,id:number|undefined,action:string,before:any,after:any){
 await query("insert into master_data_audit(entity_type,entity_id,action,actor_user_id,before_data,after_data) values($1,$2,$3,$4,$5,$6)",[entity,id,action,req.user?.id,before?JSON.stringify(before):null,after?JSON.stringify(after):null]);
}
router.get("/api/master-data/overview",requireAuth,read,async(_req,res)=>{
 const [sets,codes,units,auditRows]=await Promise.all([
  query("select id,data_key,title,description,is_system,is_active from master_data_sets order by title"),
  query("select id,namespace,code,title,value,is_active from master_data_codes order by namespace,code"),
  query("select id,unit_key,title,symbol,unit_type,factor,base_unit_key,is_active from master_units order by unit_type,title"),
  query("select a.id,a.entity_type,a.entity_id,a.action,a.actor_user_id,a.created_at,u.full_name actor_name from master_data_audit a left join users u on u.id=a.actor_user_id order by a.created_at desc limit 100")
 ]);
 res.json({sets:sets.rows,codes:codes.rows,units:units.rows,audit:auditRows.rows});
});
router.post("/api/master-data/sets",requireAuth,write,requireCsrf,async(req,res)=>{
 const {dataKey,title,description=""}=req.body||{};
 if(!/^[a-z][a-z0-9_-]{1,60}$/.test(String(dataKey||""))||!String(title||"").trim())return res.status(400).json({error:"شناسه و عنوان تعریف پایه الزامی است"});
 const r=await query("insert into master_data_sets(data_key,title,description) values($1,$2,$3) returning *",[dataKey,String(title).trim(),description]);
 await audit(req,"set",r.rows[0].id,"create",null,r.rows[0]);res.status(201).json(r.rows[0]);
});
router.patch("/api/master-data/sets/:id",requireAuth,write,requireCsrf,async(req,res)=>{
 const old=await query("select * from master_data_sets where id=$1",[req.params.id]);if(!old.rowCount)return res.status(404).json({error:"تعریف پایه پیدا نشد"});
 const r=await query("update master_data_sets set title=coalesce($1,title),description=coalesce($2,description),is_active=coalesce($3,is_active),updated_at=now() where id=$4 returning *",[req.body?.title||null,req.body?.description??null,req.body?.is_active??null,req.params.id]);
 await audit(req,"set",Number(req.params.id),"update",old.rows[0],r.rows[0]);res.json(r.rows[0]);
});
router.post("/api/master-data/sets/:id/items",requireAuth,write,requireCsrf,async(req,res)=>{
 const {itemKey,title,code,parentId,sortOrder=0,metadata={}}=req.body||{};
 if(!/^[a-z0-9][a-z0-9_-]{0,60}$/.test(String(itemKey||""))||!String(title||"").trim())return res.status(400).json({error:"کلید و عنوان آیتم الزامی است"});
 const r=await query("insert into master_data_items(data_set_id,item_key,title,code,parent_id,sort_order,metadata) values($1,$2,$3,$4,$5,$6,$7) returning *",[req.params.id,itemKey,title,code||null,parentId||null,Number(sortOrder),metadata]);
 await audit(req,"item",r.rows[0].id,"create",null,r.rows[0]);res.status(201).json(r.rows[0]);
});
router.patch("/api/master-data/items/:id",requireAuth,write,requireCsrf,async(req,res)=>{
 const old=await query("select * from master_data_items where id=$1",[req.params.id]);if(!old.rowCount)return res.status(404).json({error:"آیتم پیدا نشد"});
 const r=await query("update master_data_items set title=coalesce($1,title),code=coalesce($2,code),sort_order=coalesce($3,sort_order),is_active=coalesce($4,is_active),metadata=coalesce($5,metadata),updated_at=now() where id=$6 returning *",[req.body?.title||null,req.body?.code??null,req.body?.sortOrder??null,req.body?.is_active??null,req.body?.metadata??null,req.params.id]);
 await audit(req,"item",Number(req.params.id),"update",old.rows[0],r.rows[0]);res.json(r.rows[0]);
});
router.post("/api/master-data/codes",requireAuth,write,requireCsrf,async(req,res)=>{
 const {namespace,code,title,value}=req.body||{};if(!String(namespace).trim()||!String(code).trim()||!String(title).trim())return res.status(400).json({error:"فضای نام، کد و عنوان الزامی است"});
 const r=await query("insert into master_data_codes(namespace,code,title,value) values($1,$2,$3,$4) returning *",[namespace,code,title,value||null]);res.status(201).json(r.rows[0]);
});
router.post("/api/master-data/units",requireAuth,write,requireCsrf,async(req,res)=>{
 const {unitKey,title,symbol,unitType,factor=1,baseUnitKey}=req.body||{};if(!String(unitKey).trim()||!String(title).trim()||!String(unitType).trim())return res.status(400).json({error:"شناسه، عنوان و نوع واحد الزامی است"});
 const r=await query("insert into master_units(unit_key,title,symbol,unit_type,factor,base_unit_key) values($1,$2,$3,$4,$5,$6) returning *",[unitKey,title,symbol||null,unitType,Number(factor),baseUnitKey||unitKey]);res.status(201).json(r.rows[0]);
});
export {router as masterDataRouter};