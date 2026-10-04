import {Router} from "express";
import {query} from "./db.js";
import {requireAuth} from "./auth.js";

const modules = {
  "sales-trade": ["sales_orders", ["order_no","customer_ref","amount"], ["order_no"]],
  "marketplace": ["marketplace_listings", ["listing_no","title","price"], ["listing_no","title"]],
  "delivery-logistics": ["delivery_orders", ["order_no","recipient_ref","delivery_date"], ["order_no"]],
  "commission": ["commission_rules", ["code","name","rate"], ["code","name"]],
  "settlement": ["settlements", ["settlement_no","party_ref","amount"], ["settlement_no","party_ref","amount"]],
  "payments": ["payments", ["payment_no","amount","payment_method"], ["payment_no","amount","payment_method"]],
  "providers-integrations": ["service_providers", ["code","name","base_url"], ["code","name"]]
} as const;

const router=Router();

async function getModule(code:string){
  const r=await query("select id,title from platform_modules where code=$1 and is_active=true",[code]);
  return r.rowCount ? r.rows[0] : null;
}
async function allowed(user:any,id:number,action:string){
  if(user.role==="admin") return true;
  const r=await query("select 1 from role_permissions rp join module_permissions mp on mp.permission=rp.permission join platform_modules m on m.id=mp.module_id where rp.role=$1 and m.id=$2 and mp.permission='modules:'||m.code||':'||$3",[user.role,id,action]);
  return Boolean(r.rowCount);
}

router.get("/:code",requireAuth,async(req:any,res:any)=>{
  const def=modules[req.params.code as keyof typeof modules]; if(!def)return res.status(404).json({error:"ماژول تجارت پیدا نشد"});
  const m=await getModule(req.params.code); if(!m)return res.status(404).json({error:"ماژول فعال نیست"});
  if(!(await allowed(req.user,m.id,"read")))return res.status(403).json({error:"دسترسی مشاهده مجاز نیست"});
  const page=Math.max(1,Number(req.query.page)||1);
  const pageSize=Math.min(100,Math.max(1,Number(req.query.pageSize)||25));
  const q=typeof req.query.q==="string"?req.query.q.trim():"";
  const params:any[]=[]; const where:string[]=[];
  if(q){params.push("%"+q+"%");where.push("cast(row_to_json(t) as text) ilike $"+params.length);}
  const whereSql=where.length?" where "+where.join(" and "):"";
  const count=await query("select count(*)::int as total from "+def[0]+" t"+whereSql,params);
  const total=count.rows[0].total; const offset=(page-1)*pageSize;
  params.push(pageSize,offset);
  const r=await query("select t.* from "+def[0]+" t"+whereSql+" order by t.updated_at desc limit $"+(params.length-1)+" offset $"+params.length,params);
  res.json({module:m,items:r.rows,pagination:{page,pageSize,total,totalPages:Math.ceil(total/pageSize)}});
});

router.post("/:code",requireAuth,async(req:any,res:any)=>{
  const def=modules[req.params.code as keyof typeof modules]; if(!def)return res.status(404).json({error:"ماژول تجارت پیدا نشد"});
  const m=await getModule(req.params.code); if(!m)return res.status(404).json({error:"ماژول فعال نیست"});
  if(!(await allowed(req.user,m.id,"write")))return res.status(403).json({error:"دسترسی ثبت مجاز نیست"});
  const body=req.body||{}; for(const k of def[2]) if(body[k]===undefined||body[k]===null||body[k]==="") return res.status(400).json({error:"فیلد الزامی: "+k});
  const cols=def[1].filter(k=>body[k]!==undefined); const vals=cols.map(k=>body[k]);
  const placeholders=vals.map((_,i)=>"$"+(i+1)).join(",");
  const r=await query("insert into "+def[0]+" ("+cols.join(",")+") values ("+placeholders+") returning *",vals);
  res.status(201).json(r.rows[0]);
});

router.patch("/:code/:id",requireAuth,async(req:any,res:any)=>{
  const def=modules[req.params.code as keyof typeof modules]; if(!def)return res.status(404).json({error:"ماژول تجارت پیدا نشد"});
  const m=await getModule(req.params.code); if(!m)return res.status(404).json({error:"ماژول فعال نیست"});
  if(!(await allowed(req.user,m.id,"write")))return res.status(403).json({error:"دسترسی ویرایش مجاز نیست"});
  const body=req.body||{}; const cols=def[1].filter(k=>body[k]!==undefined); if(!cols.length)return res.status(400).json({error:"فیلدی برای ویرایش ارسال نشده است"});
  const vals=cols.map(k=>body[k]); vals.push(req.params.id);
  const sets=cols.map((k,i)=>k+"=$"+(i+1)).join(",");
  const r=await query("update "+def[0]+" set "+sets+",updated_at=now() where id=$"+vals.length+" returning *",vals);
  if(!r.rowCount)return res.status(404).json({error:"رکورد پیدا نشد"}); res.json(r.rows[0]);
});

router.delete("/:code/:id",requireAuth,async(req:any,res:any)=>{
  const def=modules[req.params.code as keyof typeof modules]; if(!def)return res.status(404).json({error:"ماژول تجارت پیدا نشد"});
  const m=await getModule(req.params.code); if(!m)return res.status(404).json({error:"ماژول فعال نیست"});
  if(!(await allowed(req.user,m.id,"delete")))return res.status(403).json({error:"دسترسی حذف مجاز نیست"});
  const r=await query("delete from "+def[0]+" where id=$1 returning id",[req.params.id]);
  if(!r.rowCount)return res.status(404).json({error:"رکورد پیدا نشد"}); res.status(204).end();
});

export {router as domainCommerceRouter};