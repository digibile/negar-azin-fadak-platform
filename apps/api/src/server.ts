import express from "express";
import cors from "cors";
import "dotenv/config";
import {query} from "./db.js";
import {ensureAdmin,hashPassword,verifyPassword,issueSession,clearSession,requireAuth,requireCsrf,requirePermission} from "./auth.js";
import {asyncHandler,errorHandler,notFound} from "./http.js";
import {loginSchema,userCreateSchema,formSchema,pageSchema,menuUpdateSchema} from "./validation.js";
import {domainFinanceRouter} from "./domain-finance.js";

const app=express();

const requireModulePermission=async(user:any,moduleId:number,action:"read"|"write"|"delete")=>{
 if(user.role==="admin") return true;
 const p=await query(
  "select 1 from role_permissions rp join module_permissions mp on mp.permission=rp.permission where rp.role=$1 and mp.module_id=$2 and mp.permission='modules:'||(select code from platform_modules where id=$2)||':'||$3",
  [user.role,moduleId,action]
 );
 return Boolean(p.rowCount);
};
const allowedOrigins=(process.env.CORS_ORIGIN||"http://localhost:3000").split(",").map(x=>x.trim()).filter(Boolean);
app.disable("x-powered-by");
app.use(cors({origin:(origin,callback)=>{if(!origin||allowedOrigins.includes(origin))return callback(null,true);callback(new Error("مبدأ درخواست مجاز نیست"))},credentials:true}));
app.use(express.json({limit:"2mb"}));
app.use((req,res,next)=>{if(["GET","HEAD","OPTIONS"].includes(req.method)||req.path==="/api/auth/login")return next();return requireCsrf(req,res,next);});

app.get("/health",asyncHandler(async(_req,res)=>{await query("select 1");res.json({status:"ok",database:"ok"});}));
app.use("/api/domain",domainFinanceRouter);

app.post("/api/auth/login",asyncHandler(async(req,res)=>{
 const input=loginSchema.parse(req.body);
 const r=await query("select id,email,password_hash,full_name,role from users where email=$1 and status='active'",[input.email.toLowerCase()]);
 if(!r.rowCount||!(await verifyPassword(input.password,r.rows[0].password_hash)))return res.status(401).json({error:"اطلاعات ورود نادرست است"});
 const u=r.rows[0];
 issueSession(res,{id:u.id,email:u.email,role:u.role});
 res.json({user:{id:u.id,email:u.email,fullName:u.full_name,role:u.role}});
}));

app.get("/api/auth/me",requireAuth,(req,res)=>res.json({user:(req as any).user}));
app.post("/api/auth/logout",requireAuth,(req,res)=>{clearSession(res);res.status(204).end();});

// Platform module catalog
app.get("/api/platform/modules",requireAuth,asyncHandler(async(req,res)=>{
 const user=(req as any).user;
 const r=await query("select m.id,m.code,m.title,m.core,m.parent_id,m.sort_order,m.is_active,mp.permission from platform_modules m left join module_permissions mp on mp.module_id=m.id where m.is_active=true order by m.sort_order,m.id");
 if(user.role==="admin") return res.json(r.rows);
 const permissions=await query("select permission from role_permissions where role=$1",[user.role]);
 const allowed=new Set(permissions.rows.map((x:any)=>x.permission));
 res.json(r.rows.filter((x:any)=>!x.permission||allowed.has(x.permission)));
}));

app.get("/api/dashboard/menu-tree",requireAuth,asyncHandler(async(req,res)=>{
 const user=(req as any).user;
 const r=await query("select id,parent_id,title,path,icon,sort_order,permission from menu_items where is_active=true order by sort_order,id");
 const rows=r.rows as any[];
 if(user.role==="admin")return res.json(rows);
 const permissions=await query("select permission from role_permissions where role=$1",[user.role]);
 const allowed=new Set(permissions.rows.map((x:any)=>x.permission));
 res.json(rows.filter(x=>!x.permission||allowed.has(x.permission)));
}));

app.get("/api/admin/users",requireAuth,requirePermission("users:manage"),asyncHandler(async(_req,res)=>res.json((await query("select id,email,full_name,role,status,created_at from users order by created_at desc")).rows)));
app.post("/api/admin/users",requireAuth,requirePermission,asyncHandler(async(req,res)=>{
 const input=userCreateSchema.parse(req.body),hash=await hashPassword(input.password);
 const r=await query("insert into users(email,password_hash,full_name,role) values($1,$2,$3,$4) returning id,email,full_name,role,status",[input.email.toLowerCase(),hash,input.fullName,input.role]);
 res.status(201).json(r.rows[0]);
}));

app.get("/api/content/forms",requireAuth,requirePermission("templates:manage"),asyncHandler(async(_req,res)=>res.json((await query("select * from form_definitions order by updated_at desc")).rows)));
app.post("/api/content/forms",requireAuth,requirePermission("templates:manage"),asyncHandler(async(req,res)=>{const input=formSchema.parse(req.body);const r=await query("insert into form_definitions(name,slug,module_key,schema) values($1,$2,$3,$4) returning *",[input.name,input.slug,input.moduleKey,input.schema]);res.status(201).json(r.rows[0]);}));
app.put("/api/content/forms/:id",requireAuth,requirePermission("templates:manage"),asyncHandler(async(req,res)=>{const input=formSchema.parse(req.body);const r=await query("update form_definitions set name=$1,module_key=$2,schema=$3,updated_at=now() where id=$4 returning *",[input.name,input.moduleKey,input.schema,req.params.id]);if(!r.rowCount)return res.status(404).json({error:"فرم پیدا نشد"});res.json(r.rows[0]);}));

app.get("/api/content/pages",requireAuth,requirePermission("frontend:manage"),asyncHandler(async(_req,res)=>res.json((await query("select * from page_definitions order by updated_at desc")).rows)));
app.post("/api/content/pages",requireAuth,requirePermission("frontend:manage"),asyncHandler(async(req,res)=>{const input=pageSchema.parse(req.body);const r=await query("insert into page_definitions(name,slug,module_key,definition) values($1,$2,$3,$4) returning *",[input.name,input.slug,input.moduleKey,input.definition]);res.status(201).json(r.rows[0]);}));
app.put("/api/content/pages/:id",requireAuth,requirePermission("frontend:manage"),asyncHandler(async(req,res)=>{const input=pageSchema.parse(req.body);const r=await query("update page_definitions set name=$1,module_key=$2,definition=$3,updated_at=now() where id=$4 returning *",[input.name,input.moduleKey,input.definition,req.params.id]);if(!r.rowCount)return res.status(404).json({error:"صفحه پیدا نشد"});res.json(r.rows[0]);}));

app.get("/api/content/menus",requireAuth,requirePermission("menus:manage"),asyncHandler(async(_req,res)=>res.json((await query("select * from menu_items order by sort_order,id")).rows)));
app.put("/api/content/menus/:id",requireAuth,requirePermission("menus:manage"),asyncHandler(async(req,res)=>{const input=menuUpdateSchema.parse(req.body);const r=await query("update menu_items set title=$1,path=$2,permission=$3,updated_at=now() where id=$4 returning *",[input.title,input.path,input.permission??null,req.params.id]);if(!r.rowCount)return res.status(404).json({error:"آیتم منو پیدا نشد"});res.json(r.rows[0]);}));

app.get("/api/platform/modules/:code",requireAuth,asyncHandler(async(req,res)=>{
 const user=(req as any).user;
 const r=await query("select m.id,m.code,m.title,m.core,m.parent_id,m.sort_order,m.is_active,rt.lifecycle,rt.route,rt.api_prefix,rt.owner_team,rt.description from platform_modules m left join module_runtime rt on rt.module_id=m.id where m.code=$1 and m.is_active=true",[req.params.code]);
 if(!r.rowCount)return res.status(404).json({error:"ماژول پیدا نشد"});
 const moduleRow=r.rows[0];
 if(user.role!=="admin"){
  const p=await query("select 1 from role_permissions rp join module_permissions mp on mp.permission=rp.permission where rp.role=$1 and mp.module_id=$2",[user.role,moduleRow.id]);
  if(!p.rowCount)return res.status(403).json({error:"دسترسی به ماژول مجاز نیست"});
 }
 const actions=await query("select id,action_code,title,permission,is_active from module_actions where module_id=$1 and is_active=true order by id",[moduleRow.id]);
 res.json({...moduleRow,actions:actions.rows});
}));

app.get("/api/platform/modules/:code/actions",requireAuth,asyncHandler(async(req,res)=>{
 const user=(req as any).user;
 const r=await query("select m.id from platform_modules m where m.code=$1 and m.is_active=true",[req.params.code]);
 if(!r.rowCount)return res.status(404).json({error:"ماژول پیدا نشد"});
 const p=await query("select 1 from role_permissions rp join module_permissions mp on mp.permission=rp.permission where rp.role=$1 and mp.module_id=$2",[user.role,r.rows[0].id]);
 if(user.role!=="admin"&&!p.rowCount)return res.status(403).json({error:"دسترسی مجاز نیست"});
 const actions=await query("select id,action_code,title,permission,is_active from module_actions where module_id=$1 and is_active=true order by id",[r.rows[0].id]);
 res.json(actions.rows);
}));


// Persistent module record runtime
app.get("/api/platform/modules/:code/schema",requireAuth,asyncHandler(async(req,res)=>{
 const user=(req as any).user;
 const m=await query("select id,code,title from platform_modules where code=$1 and is_active=true",[req.params.code]);
 if(!m.rowCount)return res.status(404).json({error:"ماژول پیدا نشد"});
 if(!(await requireModulePermission(user,m.rows[0].id,"read")))return res.status(403).json({error:"دسترسی مشاهده مجاز نیست"});
 const r=await query("select field_key,title,field_type,required,sort_order,options from module_field_definitions where module_id=$1 order by sort_order,id",[m.rows[0].id]);
 res.json({module:m.rows[0],fields:r.rows});
}));

app.get("/api/platform/modules/:code/records",requireAuth,asyncHandler(async(req,res)=>{
 const user=(req as any).user;
 const m=await query("select id,code,title from platform_modules where code=$1 and is_active=true",[req.params.code]);
 if(!m.rowCount)return res.status(404).json({error:"ماژول پیدا نشد"});
 if(user.role!=="admin"){
  const p=await query("select 1 from role_permissions rp join module_permissions mp on mp.permission=rp.permission where rp.role=$1 and mp.module_id=$2",[user.role,m.rows[0].id]);
  if(!p.rowCount)return res.status(403).json({error:"دسترسی به ماژول مجاز نیست"});
 }
 const page=Math.max(1,Number(req.query.page)||1);
 const pageSize=Math.min(100,Math.max(1,Number(req.query.pageSize)||20));
 const q=typeof req.query.q==="string"?req.query.q.trim():"";
 const status=typeof req.query.status==="string"?req.query.status.trim():"";
 const where=["module_id=$1"];
 const params:any[]=[m.rows[0].id];
 if(q){params.push("%"+q+"%");where.push("(title ilike $"+params.length+" or record_type ilike $"+params.length+" or data::text ilike $"+params.length+")");}
 if(status){params.push(status);where.push("status=$"+params.length);}
 const count=await query("select count(*)::int as total from module_records where "+where.join(" and "),params);
 const total=count.rows[0].total;
 const offset=(page-1)*pageSize;
 params.push(pageSize,offset);
 const r=await query("select id,record_type,title,status,data,created_by,created_at,updated_at from module_records where "+where.join(" and ")+" order by updated_at desc limit $"+(params.length-1)+" offset $"+params.length,params);
 res.json({items:r.rows,page,pageSize,total,totalPages:Math.ceil(total/pageSize)});
}));

app.post("/api/platform/modules/:code/records",requireAuth,asyncHandler(async(req,res)=>{
 const user=(req as any).user;
 const m=await query("select id from platform_modules where code=$1 and is_active=true",[req.params.code]);
 if(!m.rowCount)return res.status(404).json({error:"ماژول پیدا نشد"});
 if(!(await requireModulePermission(user,m.rows[0].id,"write")))
  return res.status(403).json({error:"دسترسی ثبت و ویرایش مجاز نیست"});
 const {recordType,title,status="active",data={}}=req.body||{};
 if(typeof recordType!=="string"||typeof title!=="string"||!data||typeof data!=="object"||Array.isArray(data))return res.status(400).json({error:"ساختار رکورد نامعتبر است"});
 const r=await query("insert into module_records(module_id,record_type,title,status,data,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$6) returning *",[m.rows[0].id,recordType,title,status,data,user.id]);
 res.status(201).json(r.rows[0]);
}));

app.patch("/api/platform/modules/:code/records/:id",requireAuth,asyncHandler(async(req,res)=>{
 const user=(req as any).user;
 const m=await query("select id from platform_modules where code=$1 and is_active=true",[req.params.code]);
 if(!m.rowCount)return res.status(404).json({error:"ماژول پیدا نشد"});
 if(!(await requireModulePermission(user,m.rows[0].id,"write")))
  return res.status(403).json({error:"دسترسی ویرایش مجاز نیست"});
 const {title,status,data}=req.body||{};
 const r=await query("update module_records set title=coalesce($1,title),status=coalesce($2,status),data=coalesce($3,data),updated_by=$6,updated_at=now() where id=$4 and module_id=$5 returning *",[title,status,data,req.params.id,m.rows[0].id,user.id]);
 if(!r.rowCount)return res.status(404).json({error:"رکورد پیدا نشد"});
 res.json(r.rows[0]);
}));

app.delete("/api/platform/modules/:code/records/:id",requireAuth,asyncHandler(async(req,res)=>{
 const user=(req as any).user;
 const m=await query("select id from platform_modules where code=$1 and is_active=true",[req.params.code]);
 if(!m.rowCount)return res.status(404).json({error:"ماژول پیدا نشد"});
 if(!(await requireModulePermission(user,m.rows[0].id,"delete")))
  return res.status(403).json({error:"دسترسی حذف مجاز نیست"});
 const r=await query("delete from module_records where id=$1 and module_id=$2 returning id",[req.params.id,m.rows[0].id]);
 if(!r.rowCount)return res.status(404).json({error:"رکورد پیدا نشد"});
 res.status(204).end();
}));

app.use(notFound);
app.use(errorHandler);

const port=Number(process.env.PORT||4000);
const server=app.listen(port,()=>console.log("NAF API listening on",port));
const shutdown=async()=>{server.close();const {pool}=await import("./db.js");await pool.end();process.exit(0)};
process.on("SIGTERM",shutdown);process.on("SIGINT",shutdown);
if(process.env.ADMIN_EMAIL&&process.env.ADMIN_PASSWORD)ensureAdmin(process.env.ADMIN_EMAIL,process.env.ADMIN_PASSWORD).catch(console.error);
