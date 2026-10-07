import {Router} from "express";
import {query} from "./db.js";
import {requireAuth,requirePermission} from "./auth.js";
import {asyncHandler} from "./http.js";
import {resolveTenant} from "./tenant-context.js";

export const merchantRouter=Router();

const str=(v:unknown,max=500)=>typeof v==="string"?v.trim().slice(0,max):"";
const num=(v:unknown)=>{const n=Number(v);return Number.isFinite(n)?n:null;};

async function tenant(req:any){return resolveTenant(req,(req as any).user);}

merchantRouter.get("/api/merchants",requireAuth,requirePermission("merchant:view"),asyncHandler(async(req,res)=>{
  const t=await tenant(req);
  if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
  const q=str(req.query.q,150);
  const params:any[]=[t.id];
  let where="m.tenant_id=$1";
  if(q){
    params.push("%"+q+"%");
    where+=" and (m.code ilike $2 or m.legal_name ilike $2 or m.display_name ilike $2 or coalesce(m.national_id,'') ilike $2)";
  }
  const r=await query(
    "select m.id,m.code,m.legal_name,m.display_name,m.business_type,m.national_id,m.tax_id,m.iban,m.settlement_account_ref,m.contract_ref,m.commission_rate,m.status,m.verification_status,m.verified_at,m.verified_by,m.verification_reason,m.created_at,m.updated_at from payment_merchants m where "+where+" order by m.created_at desc",
    params
  );
  res.json({tenant:t,items:r.rows,total:r.rowCount});
}));

merchantRouter.get("/api/merchants/:id",requireAuth,requirePermission("merchant:view"),asyncHandler(async(req,res)=>{
  const t=await tenant(req);
  if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
  const r=await query("select * from payment_merchants where id=$1 and tenant_id=$2",[req.params.id,t.id]);
  if(!r.rowCount)return res.status(404).json({error:"پذیرنده پیدا نشد"});
  res.json(r.rows[0]);
}));

merchantRouter.post("/api/merchants",requireAuth,requirePermission("merchant:manage"),asyncHandler(async(req,res)=>{
  const t=await tenant(req);
  if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
  const code=str(req.body?.code,80),legalName=str(req.body?.legalName,250),displayName=str(req.body?.displayName,250);
  const businessType=str(req.body?.businessType,30)||"company";
  const commissionRate=num(req.body?.commissionRate??0);
  if(!code||!legalName||!displayName)return res.status(400).json({error:"کد، نام حقوقی و نام نمایشی پذیرنده الزامی است"});
  if(!["individual","company","organization"].includes(businessType))return res.status(400).json({error:"نوع پذیرنده نامعتبر است"});
  if(commissionRate===null||commissionRate<0||commissionRate>100)return res.status(400).json({error:"نرخ کارمزد نامعتبر است"});
  const r=await query(
    "insert into payment_merchants(tenant_id,code,legal_name,display_name,business_type,national_id,tax_id,iban,settlement_account_ref,contract_ref,commission_rate,metadata) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) returning *",
    [t.id,code,legalName,displayName,businessType,str(req.body?.nationalId,80)||null,str(req.body?.taxId,80)||null,str(req.body?.iban,50)||null,str(req.body?.settlementAccountRef,120)||null,str(req.body?.contractRef,120)||null,commissionRate,req.body?.metadata&&typeof req.body.metadata==="object"?req.body.metadata:{}]
  );
  res.status(201).json(r.rows[0]);
}));

merchantRouter.patch("/api/merchants/:id",requireAuth,requirePermission("merchant:manage"),asyncHandler(async(req,res)=>{
  const t=await tenant(req);
  if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
  const businessType=str(req.body?.businessType,30)||"company";
  const commissionRate=num(req.body?.commissionRate??0);
  if(!["individual","company","organization"].includes(businessType))return res.status(400).json({error:"نوع پذیرنده نامعتبر است"});
  if(commissionRate===null||commissionRate<0||commissionRate>100)return res.status(400).json({error:"نرخ کارمزد نامعتبر است"});
  const r=await query(
    "update payment_merchants set legal_name=coalesce($1,legal_name),display_name=coalesce($2,display_name),business_type=$3,national_id=coalesce($4,national_id),tax_id=coalesce($5,tax_id),iban=coalesce($6,iban),settlement_account_ref=coalesce($7,settlement_account_ref),contract_ref=coalesce($8,contract_ref),commission_rate=$9,updated_at=now() where id=$10 and tenant_id=$11 returning *",
    [str(req.body?.legalName,250)||null,str(req.body?.displayName,250)||null,businessType,str(req.body?.nationalId,80)||null,str(req.body?.taxId,80)||null,str(req.body?.iban,50)||null,str(req.body?.settlementAccountRef,120)||null,str(req.body?.contractRef,120)||null,commissionRate,req.params.id,t.id]
  );
  if(!r.rowCount)return res.status(404).json({error:"پذیرنده پیدا نشد"});
  res.json(r.rows[0]);
}));

merchantRouter.patch("/api/merchants/:id/status",requireAuth,requirePermission("merchant:manage"),asyncHandler(async(req,res)=>{
  const t=await tenant(req);
  if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
  const status=str(req.body?.status,20);
  if(!["pending","review","active","suspended","rejected","closed"].includes(status))return res.status(400).json({error:"وضعیت پذیرنده نامعتبر است"});
  const r=await query("update payment_merchants set status=$1,updated_at=now() where id=$2 and tenant_id=$3 returning *",[status,req.params.id,t.id]);
  if(!r.rowCount)return res.status(404).json({error:"پذیرنده پیدا نشد"});
  res.json(r.rows[0]);
}));

merchantRouter.post("/api/merchants/:id/verify",requireAuth,requirePermission("merchant:verify"),asyncHandler(async(req,res)=>{
  const t=await tenant(req);
  if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
  const decision=str(req.body?.decision,20);
  const reason=str(req.body?.reason,500)||null;
  if(!["approve","reject"].includes(decision))return res.status(400).json({error:"تصمیم احراز پذیرنده نامعتبر است"});
  const status=decision==="approve"?"active":"rejected";
  const verificationStatus=decision==="approve"?"verified":"rejected";
  const r=await query(
    "update payment_merchants set status=$1,verification_status=$2,verified_at=now(),verified_by=$3,verification_reason=$4,updated_at=now() where id=$5 and tenant_id=$6 returning *",
    [status,verificationStatus,(req as any).user.id,reason,req.params.id,t.id]
  );
  if(!r.rowCount)return res.status(404).json({error:"پذیرنده پیدا نشد"});
  await query(
    "insert into platform_audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,after_data) values($1,$2,$3,'payment_merchant',$4,$5)",
    [t.id,(req as any).user.id,"merchant.verification."+decision,r.rows[0].id,JSON.stringify({status,verificationStatus,reason})]
  );
  res.json(r.rows[0]);
}));
