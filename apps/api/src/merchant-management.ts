import {Router} from "express";
import {query,pool} from "./db.js";
import {requireAuth,requirePermission} from "./auth.js";
import {asyncHandler} from "./http.js";
import {resolveTenant} from "./tenant-context.js";
import {ensureCanonicalParty,normalizeNationalId} from "./canonical-party.js";

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
    "select m.id,m.party_id,p.title as canonical_party_title,m.code,m.legal_name,m.display_name,m.business_type,m.national_id,m.tax_id,m.iban,m.settlement_account_ref,m.contract_ref,m.commission_rate,m.status,m.verification_status,m.verified_at,m.verified_by,m.verification_reason,m.created_at,m.updated_at from payment_merchants m left join accounting_parties p on p.id=m.party_id and p.tenant_id=m.tenant_id where "+where+" order by m.created_at desc",
    params
  );
  res.json({tenant:t,items:r.rows,total:r.rowCount});
}));

merchantRouter.get("/api/merchants/:id",requireAuth,requirePermission("merchant:view"),asyncHandler(async(req,res)=>{
  const t=await tenant(req);
  if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
  const r=await query("select m.*,p.title as canonical_party_title from payment_merchants m left join accounting_parties p on p.id=m.party_id and p.tenant_id=m.tenant_id where m.id=$1 and m.tenant_id=$2",[req.params.id,t.id]);
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
  const nationalId=str(req.body?.nationalId,80)||null;
  const taxId=str(req.body?.taxId,80)||null;
  const client=await pool.connect();
  try{
    await client.query("begin");
    const partyId=await ensureCanonicalParty(client,{
      tenantId:t.id,kind:"other",title:legalName,nationalId,taxId,
      phone:str(req.body?.phone,80)||null,email:str(req.body?.email,200)||null,
      sourceSystem:"payment_merchants"
    });
    const r=await client.query(
      "insert into payment_merchants(tenant_id,party_id,code,legal_name,display_name,business_type,national_id,tax_id,iban,settlement_account_ref,contract_ref,commission_rate,metadata) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) returning *",
      [t.id,partyId,code,legalName,displayName,businessType,nationalId,taxId,str(req.body?.iban,50)||null,str(req.body?.settlementAccountRef,120)||null,str(req.body?.contractRef,120)||null,commissionRate,req.body?.metadata&&typeof req.body.metadata==="object"?req.body.metadata:{}]
    );
    await client.query("commit");
    res.status(201).json(r.rows[0]);
  }catch(error:any){
    await client.query("rollback");
    if(error?.statusCode)return res.status(error.statusCode).json({error:error.message});
    throw error;
  }finally{client.release();}
}));

merchantRouter.patch("/api/merchants/:id",requireAuth,requirePermission("merchant:manage"),asyncHandler(async(req,res)=>{
  const t=await tenant(req);
  if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
  const businessType=req.body?.businessType===undefined?null:str(req.body?.businessType,30);
  const commissionRate=req.body?.commissionRate===undefined?null:num(req.body?.commissionRate);
  if(businessType!==null&&!["individual","company","organization"].includes(businessType))return res.status(400).json({error:"نوع پذیرنده نامعتبر است"});
  if(commissionRate!==null&&(commissionRate<0||commissionRate>100))return res.status(400).json({error:"نرخ کارمزد نامعتبر است"});
  const client=await pool.connect();
  try{
    await client.query("begin");
    const current=await client.query("select * from payment_merchants where id=$1 and tenant_id=$2 for update",[req.params.id,t.id]);
    if(!current.rowCount){await client.query("rollback");return res.status(404).json({error:"پذیرنده پیدا نشد"});}
    const old=current.rows[0];
    const nationalIdProvided=req.body?.nationalId!==undefined;
    const nationalId=nationalIdProvided?(str(req.body?.nationalId,80)||null):old.national_id;
    if(old.party_id&&nationalIdProvided&&normalizeNationalId(nationalId)!==normalizeNationalId(old.national_id)){
      await client.query("rollback");
      return res.status(409).json({error:"شناسه ملی پذیرنده پس از اتصال به طرف‌حساب مرکزی قابل تغییر مستقیم نیست؛ ابتدا درخواست اصلاح هویت و تطبیق مستند انجام شود."});
    }
    let partyId:string|null=old.party_id||null;
    if(!partyId&&nationalId){
      partyId=await ensureCanonicalParty(client,{
        tenantId:t.id,kind:"other",title:str(req.body?.legalName,250)||old.legal_name,
        nationalId,taxId:str(req.body?.taxId,80)||old.tax_id||null,
        sourceSystem:"payment_merchants_legacy_update"
      });
    }
    const legalName=str(req.body?.legalName,250)||null;
    const taxId=str(req.body?.taxId,80)||null;
    const updated=await client.query(
      "update payment_merchants set party_id=coalesce($1,party_id),legal_name=coalesce($2,legal_name),display_name=coalesce($3,display_name),business_type=coalesce($4,business_type),national_id=case when $5::boolean then $6 else national_id end,tax_id=coalesce($7,tax_id),iban=coalesce($8,iban),settlement_account_ref=coalesce($9,settlement_account_ref),contract_ref=coalesce($10,contract_ref),commission_rate=coalesce($11,commission_rate),updated_at=now() where id=$12 and tenant_id=$13 returning *",
      [partyId,legalName,str(req.body?.displayName,250)||null,businessType,nationalIdProvided,nationalId,taxId,str(req.body?.iban,50)||null,str(req.body?.settlementAccountRef,120)||null,str(req.body?.contractRef,120)||null,commissionRate,req.params.id,t.id]
    );
    if(partyId){
      await client.query(
        "update accounting_parties set title=coalesce($1,title),tax_id=coalesce($2,tax_id),updated_at=now() where id=$3 and tenant_id=$4",
        [legalName,taxId,partyId,t.id]
      );
    }
    await client.query("commit");
    res.json(updated.rows[0]);
  }catch(error:any){
    await client.query("rollback");
    if(error?.statusCode)return res.status(error.statusCode).json({error:error.message});
    if(error?.code==="23505")return res.status(409).json({error:"شناسه ملی یا پذیرنده با رکورد دیگری تداخل دارد؛ تطبیق مرکزی را بررسی کنید."});
    throw error;
  }finally{client.release();}
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
