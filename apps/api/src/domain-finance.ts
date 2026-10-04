import {Router, type Request, type Response} from "express";
import {query} from "./db.js";
import {requireAuth} from "./auth.js";

type ModuleDef={code:string;table:string;columns:string[];required:string[]};
const modules:ModuleDef[]=[
 {code:"accounting-finance",table:"financial_accounts",columns:["code","name","account_type"],required:["code","name","account_type"]},
 {code:"treasury-bank",table:"bank_accounts",columns:["bank_name","account_number","iban"],required:["bank_name","account_number"]},
 {code:"wallet-ledger",table:"wallets",columns:["owner_ref","currency","balance"],required:["owner_ref"]},
 {code:"credit-facilities",table:"credit_facilities",columns:["code","name","limit_amount"],required:["code","name"]},
 {code:"credit-scoring",table:"credit_scorecards",columns:["subject_ref","score","decision"],required:["subject_ref"]},
 {code:"loans-contracts",table:"loan_contracts",columns:["contract_no","borrower_ref","principal","rate"],required:["contract_no","borrower_ref","principal"]},
 {code:"installments",table:"installment_plans",columns:["contract_ref","installment_count","period_months"],required:["contract_ref","installment_count","period_months"]},
 {code:"collections",table:"collection_cases",columns:["case_no","subject_ref","amount_due"],required:["case_no","subject_ref"]}
];
const byCode=new Map(modules.map(x=>[x.code,x]));
const permission=async(user:any,moduleId:number,action:"read"|"write"|"delete")=>{
 if(user.role==="admin")return true;
 const r=await query("select 1 from role_permissions rp join module_permissions mp on mp.permission=rp.permission join platform_modules m on m.id=mp.module_id where rp.role=$1 and m.id=$2 and mp.permission='modules:'||m.code||':'||$3",[user.role,moduleId,action]);
 return Boolean(r.rowCount);
};
const moduleId=async(code:string)=>{
 const r=await query("select id,title from platform_modules where code=$1 and is_active=true",[code]);
 return r.rowCount?r.rows[0]:null;
};
const router=Router();

router.get("/:code",requireAuth,async(req:Request,res:Response)=>{
 const def=byCode.get(req.params.code); if(!def)return res.status(404).json({error:"ماژول دامنه‌ای پیدا نشد"});
 const user=(req as any).user, mod=await moduleId(def.code); if(!mod)return res.status(404).json({error:"ماژول فعال نیست"});
 if(!(await permission(user,mod.id,"read")))return res.status(403).json({error:"دسترسی مشاهده مجاز نیست"});
 const r=await query("select * from "+def.table+" order by updated_at desc");
 res.json({module:{code:def.code,title:mod.title},items:r.rows});
});

router.post("/:code",requireAuth,async(req:Request,res:Response)=>{
 const def=byCode.get(req.params.code); if(!def)return res.status(404).json({error:"ماژول دامنه‌ای پیدا نشد"});
 const user=(req as any).user, mod=await moduleId(def.code); if(!mod)return res.status(404).json({error:"ماژول فعال نیست"});
 if(!(await permission(user,mod.id,"write")))return res.status(403).json({error:"دسترسی ثبت مجاز نیست"});
 const body=req.body||{};
 for(const key of def.required)if(body[key]===undefined||body[key]===null||body[key]==="")return res.status(400).json({error:"فیلد الزامی: "+key});
 const cols=def.columns.filter(k=>body[k]!==undefined);
 const values=cols.map(k=>body[k]);
 const params=values.map((_,i)=>"$"+(i+1)).join(",");
 const r=await query("insert into "+def.table+" ("+cols.join(",")+") values ("+params+") returning *",values);
 res.status(201).json(r.rows[0]);
});

router.patch("/:code/:id",requireAuth,async(req:Request,res:Response)=>{
 const def=byCode.get(req.params.code); if(!def)return res.status(404).json({error:"ماژول دامنه‌ای پیدا نشد"});
 const user=(req as any).user, mod=await moduleId(def.code); if(!mod)return res.status(404).json({error:"ماژول فعال نیست"});
 if(!(await permission(user,mod.id,"write")))return res.status(403).json({error:"دسترسی ویرایش مجاز نیست"});
 const body=req.body||{}, cols=def.columns.filter(k=>body[k]!==undefined);
 if(!cols.length)return res.status(400).json({error:"فیلدی برای ویرایش ارسال نشده است"});
 const sets=cols.map((k,i)=>k+"=$"+(i+1)).join(",");
 const values=cols.map(k=>body[k]); values.push(req.params.id);
 const r=await query("update "+def.table+" set "+sets+",updated_at=now() where id=$"+values.length+" returning *",values);
 if(!r.rowCount)return res.status(404).json({error:"رکورد پیدا نشد"});
 res.json(r.rows[0]);
});

router.delete("/:code/:id",requireAuth,async(req:Request,res:Response)=>{
 const def=byCode.get(req.params.code); if(!def)return res.status(404).json({error:"ماژول دامنه‌ای پیدا نشد"});
 const user=(req as any).user, mod=await moduleId(def.code); if(!mod)return res.status(404).json({error:"ماژول فعال نیست"});
 if(!(await permission(user,mod.id,"delete")))return res.status(403).json({error:"دسترسی حذف مجاز نیست"});
 const r=await query("delete from "+def.table+" where id=$1 returning id",[req.params.id]);
 if(!r.rowCount)return res.status(404).json({error:"رکورد پیدا نشد"});
 res.status(204).end();
});
export {router as domainFinanceRouter};