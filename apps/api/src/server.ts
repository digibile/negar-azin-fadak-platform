import express from "express";
import cors from "cors";
import "dotenv/config";
import {query} from "./db.js";
import {ensureAdmin,hashPassword,verifyPassword,sign,requireAuth,requirePermission} from "./auth.js";
import {asyncHandler,errorHandler,notFound} from "./http.js";
import {loginSchema,userCreateSchema,formSchema,pageSchema,menuUpdateSchema} from "./validation.js";

const app=express();
const allowedOrigins=(process.env.CORS_ORIGIN||"http://localhost:3000").split(",").map(x=>x.trim()).filter(Boolean);
app.disable("x-powered-by");
app.use(cors({origin:(origin,callback)=>{if(!origin||allowedOrigins.includes(origin))return callback(null,true);callback(new Error("مبدأ درخواست مجاز نیست"))},credentials:true}));
app.use(express.json({limit:"2mb"}));

app.get("/health",asyncHandler(async(_req,res)=>{await query("select 1");res.json({status:"ok",database:"ok"});}));

app.post("/api/auth/login",asyncHandler(async(req,res)=>{
 const input=loginSchema.parse(req.body);
 const r=await query("select id,email,password_hash,full_name,role from users where email=$1 and status='active'",[input.email.toLowerCase()]);
 if(!r.rowCount||!(await verifyPassword(input.password,r.rows[0].password_hash)))return res.status(401).json({error:"اطلاعات ورود نادرست است"});
 const u=r.rows[0];
 res.json({token:sign({id:u.id,email:u.email,role:u.role}),user:{id:u.id,email:u.email,fullName:u.full_name,role:u.role}});
}));

app.get("/api/auth/me",requireAuth,(req,res)=>res.json({user:(req as any).user}));
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
app.post("/api/admin/users",requireAuth,requireAdmin,asyncHandler(async(req,res)=>{
 const input=userCreateSchema.parse(req.body),hash=await hashPassword(input.password);
 const r=await query("insert into users(email,password_hash,full_name,role) values($1,$2,$3,$4) returning id,email,full_name,role,status",[input.email.toLowerCase(),hash,input.fullName,input.role]);
 res.status(201).json(r.rows[0]);
}));

app.get("/api/content/forms",requireAuth,requirePermission("templates:manage"),asyncHandler(async(_req,res)=>res.json((await query("select * from form_definitions order by updated_at desc")).rows)));
app.post("/api/content/forms",requireAuth,requirePermission("templates:manage"),asyncHandler(async(req,res)=>{const input=formSchema.parse(req.body);const r=await query("insert into form_definitions(name,slug,schema) values($1,$2,$3) returning *",[input.name,input.slug,input.schema]);res.status(201).json(r.rows[0]);}));
app.put("/api/content/forms/:id",requireAuth,requirePermission("templates:manage"),asyncHandler(async(req,res)=>{const input=formSchema.parse(req.body);const r=await query("update form_definitions set name=$1,schema=$2,updated_at=now() where id=$3 returning *",[input.name,input.schema,req.params.id]);if(!r.rowCount)return res.status(404).json({error:"فرم پیدا نشد"});res.json(r.rows[0]);}));

app.get("/api/content/pages",requireAuth,requirePermission("frontend:manage"),asyncHandler(async(_req,res)=>res.json((await query("select * from page_definitions order by updated_at desc")).rows)));
app.post("/api/content/pages",requireAuth,requirePermission("frontend:manage"),asyncHandler(async(req,res)=>{const input=pageSchema.parse(req.body);const r=await query("insert into page_definitions(name,slug,definition) values($1,$2,$3) returning *",[input.name,input.slug,input.definition]);res.status(201).json(r.rows[0]);}));
app.put("/api/content/pages/:id",requireAuth,requirePermission("frontend:manage"),asyncHandler(async(req,res)=>{const input=pageSchema.parse(req.body);const r=await query("update page_definitions set name=$1,definition=$2,updated_at=now() where id=$3 returning *",[input.name,input.definition,req.params.id]);if(!r.rowCount)return res.status(404).json({error:"صفحه پیدا نشد"});res.json(r.rows[0]);}));

app.get("/api/content/menus",requireAuth,requirePermission("menus:manage"),asyncHandler(async(_req,res)=>res.json((await query("select * from menu_items order by sort_order,id")).rows)));
app.put("/api/content/menus/:id",requireAuth,requirePermission("menus:manage"),asyncHandler(async(req,res)=>{const input=menuUpdateSchema.parse(req.body);const r=await query("update menu_items set title=$1,path=$2,permission=$3,updated_at=now() where id=$4 returning *",[input.title,input.path,input.permission??null,req.params.id]);if(!r.rowCount)return res.status(404).json({error:"آیتم منو پیدا نشد"});res.json(r.rows[0]);}));

app.use(notFound);
app.use(errorHandler);

const port=Number(process.env.PORT||4000);
const server=app.listen(port,()=>console.log("NAF API listening on",port));
const shutdown=async()=>{server.close();const {pool}=await import("./db.js");await pool.end();process.exit(0)};
process.on("SIGTERM",shutdown);process.on("SIGINT",shutdown);
if(process.env.ADMIN_EMAIL&&process.env.ADMIN_PASSWORD)ensureAdmin(process.env.ADMIN_EMAIL,process.env.ADMIN_PASSWORD).catch(console.error);
