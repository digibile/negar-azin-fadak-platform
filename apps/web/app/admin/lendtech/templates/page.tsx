"use client";

import Link from "next/link";
import {FormEvent,useEffect,useState} from "react";
import {api} from "../../../../lib/api";

type Template={id:string;group_key:string;version:number;title:string;template_type:string;status:string;valid_from?:string|null;valid_to?:string|null;published_at?:string|null};
type Variable={id:string;key:string;label:string;data_type:string;source:string;required:boolean;sensitivity:string};
type DocumentItem={id:string;document_no:string;title:string;stage:string;status:string;template_version:number;contract_no:string;application_no:string;product_code:string;customer_ref:string;created_at:string};
const initialBody="<h1>قرارداد تسهیلات</h1>\n<p>شماره قرارداد: {{contract_number}}</p>\n<p>تاریخ تنظیم: {{contract_date}}</p>\n<p>این قرارداد میان {{company_name}} و {{applicant_name}} منعقد می‌شود.</p>\n<p>موضوع قرارداد: تسهیلات طرح {{product_name}} به مبلغ {{loan_amount}} با مدت {{loan_months}} ماه.</p>\n<p>نرخ سود/کارمزد: {{loan_interest_percent}}</p>\n<p>مبلغ اولین قسط: {{loan_installment_amount}}</p>\n<p>مجموع بازپرداخت: {{loan_total_repay}}</p>\n{{installments_table}}\n<p>شماره درخواست: {{request_id}}</p>";

export default function ContractTemplatesAdmin(){
 const [templates,setTemplates]=useState<Template[]>([]);
 const [variables,setVariables]=useState<Variable[]>([]);
 const [documents,setDocuments]=useState<DocumentItem[]>([]);
 const [title,setTitle]=useState("");
 const [bodyHtml,setBodyHtml]=useState(initialBody);
 const [productCode,setProductCode]=useState("");
 const [groupKey,setGroupKey]=useState("");
 const [stage,setStage]=useState("signature");
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [message,setMessage]=useState("");
 const [problems,setProblems]=useState<string[]>([]);

 async function load(){
  setLoading(true);setError("");
  try{
   const [t,v,d]=await Promise.all([
    api<{items:Template[]}>("/api/lendtech/contract-templates"),
    api<{items:Variable[]}>("/api/lendtech/contract-variables"),
    api<{items:DocumentItem[]}>("/api/lendtech/contract-documents")
   ]);
   setTemplates(t.items||[]);setVariables(v.items||[]);setDocuments(d.items||[]);
   if(!groupKey&&t.items?.length)setGroupKey(t.items.find(x=>x.status==="published")?.group_key||t.items[0].group_key);
  }catch(e){setError(e instanceof Error?e.message:"دریافت اطلاعات قالب قرارداد انجام نشد");}
  finally{setLoading(false);}
 }
 useEffect(()=>{void load();},[]);

 async function run(label:string,fn:()=>Promise<any>){
  setBusy(true);setError("");setMessage("");setProblems([]);
  try{const result=await fn();if(result?.problems?.length)setProblems(result.problems);setMessage(label);await load();}
  catch(e){setError(e instanceof Error?e.message:"عملیات ناموفق بود");}
  finally{setBusy(false);}
 }
 async function create(e:FormEvent){
  e.preventDefault();
  await run("پیش‌نویس قالب قرارداد ایجاد شد",()=>api("/api/lendtech/contract-templates",{method:"POST",body:JSON.stringify({title,type:"Company",bodyHtml})}));
 }
 async function saveMapping(){
  if(!productCode.trim()||!groupKey)return setError("کد طرح و قالب منتشرشده را انتخاب کنید");
  await run("اتصال قالب به طرح تسهیلات ثبت شد",()=>api("/api/lendtech/products/"+encodeURIComponent(productCode)+"/contract-templates",{method:"PUT",body:JSON.stringify({items:[{groupKey,stage,required:true,condition:"",requiresReview:true,sortOrder:10}]})}));
 }
 async function templateAction(id:string,action:string){
  await run("عملیات قالب انجام شد",()=>api("/api/lendtech/contract-templates/"+id+"/"+action,{method:"POST",body:JSON.stringify({})}));
 }
 async function validate(id:string){
  await run("اعتبارسنجی قالب انجام شد",()=>api("/api/lendtech/contract-templates/"+id+"/validate",{method:"POST",body:JSON.stringify({})}));
 }
 async function present(id:string){
  await run("سند برای امضای مشتری ارائه شد",()=>api("/api/lendtech/contract-documents/"+id+"/present",{method:"POST",body:JSON.stringify({})}));
 }

 const published=templates.filter(x=>x.status==="published");
 return <main dir="rtl" style={{maxWidth:1500,margin:"0 auto",padding:"24px",display:"grid",gap:20,color:"var(--foreground,#0f172a)"}}>
  <header style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:16,flexWrap:"wrap"}}>
   <div><p style={{margin:0,color:"var(--muted-foreground,#64748b)"}}>مرکز عملیاتی اعتبارات و تسهیلات</p><h1 style={{margin:"6px 0"}}>قالب قرارداد و امضای الکترونیکی</h1><p style={{margin:0,color:"var(--muted-foreground,#64748b)"}}>نسخه‌بندی، اعتبارسنجی، تأیید، انتشار و ارائه سند از همان چرخه تسهیلات مرکزی.</p></div>
   <Link href="/admin/lendtech" style={{padding:"10px 14px",border:"1px solid var(--border,#cbd5e1)",borderRadius:10,textDecoration:"none"}}>بازگشت به مرکز تسهیلات</Link>
  </header>
  {error&&<div role="alert" style={{padding:12,borderRadius:10,background:"#fee2e2",color:"#991b1b"}}>{error}</div>}
  {message&&<div role="status" style={{padding:12,borderRadius:10,background:"#dcfce7",color:"#166534"}}>{message}</div>}
  {problems.length>0&&<section style={{padding:14,border:"1px solid #f59e0b",borderRadius:12}}><b>موارد نیازمند اصلاح</b><ul>{problems.map((x,i)=><li key={i}>{x}</li>)}</ul></section>}
  <section style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,320px),1fr))",gap:18}}>
   <form onSubmit={create} style={{display:"grid",gap:10,padding:18,border:"1px solid var(--border,#e2e8f0)",borderRadius:14}}>
    <h2 style={{margin:0}}>تعریف قالب جدید</h2>
    <label>عنوان قالب<input value={title} onChange={e=>setTitle(e.target.value)} required maxLength={160} style={{display:"block",width:"100%",padding:10,marginTop:6}}/></label>
    <label>متن HTML قالب<textarea value={bodyHtml} onChange={e=>setBodyHtml(e.target.value)} required rows={12} style={{display:"block",width:"100%",padding:10,marginTop:6,fontFamily:"monospace",direction:"ltr"}}/></label>
    <small>متغیرها از داده‌های درخواست، قرارداد، مشتری و سازمان خوانده می‌شوند. کد دلخواه یا اسکریپت در قالب پذیرفته نمی‌شود.</small>
    <button disabled={busy} type="submit" style={{padding:12,border:0,borderRadius:10,background:"var(--accent,#0f766e)",color:"white",fontWeight:700}}>ایجاد پیش‌نویس</button>
   </form>
   <div style={{display:"grid",gap:12,alignContent:"start",padding:18,border:"1px solid var(--border,#e2e8f0)",borderRadius:14}}>
    <h2 style={{margin:0}}>اتصال قالب به طرح تسهیلات</h2>
    <label>کد طرح تسهیلات<input value={productCode} onChange={e=>setProductCode(e.target.value)} placeholder="کد واقعی طرح" style={{display:"block",width:"100%",padding:10,marginTop:6}}/></label>
    <label>قالب منتشرشده<select value={groupKey} onChange={e=>setGroupKey(e.target.value)} style={{display:"block",width:"100%",padding:10,marginTop:6}}><option value="">انتخاب قالب</option>{published.map(x=><option key={x.group_key} value={x.group_key}>{x.title} · نسخه {x.version}</option>)}</select></label>
    <label>مرحله استفاده<select value={stage} onChange={e=>setStage(e.target.value)} style={{display:"block",width:"100%",padding:10,marginTop:6}}><option value="approval">تأیید</option><option value="signature">امضا</option><option value="disbursement">پرداخت</option></select></label>
    <button disabled={busy||!published.length} onClick={saveMapping} style={{padding:12,border:0,borderRadius:10,background:"var(--accent,#0f766e)",color:"white",fontWeight:700}}>ذخیره اتصال</button>
    <p style={{margin:0,fontSize:12,color:"var(--muted-foreground,#64748b)"}}>تولید سند فقط برای قرارداد واقعی و طرحی که قالب منتشرشده دارد فعال می‌شود.</p>
   </div>
  </section>
  <section style={{padding:18,border:"1px solid var(--border,#e2e8f0)",borderRadius:14}}>
   <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center"}}><h2 style={{margin:0}}>قالب‌های ثبت‌شده</h2><button onClick={()=>load()} disabled={loading}>به‌روزرسانی</button></div>
   {loading?<p>در حال دریافت اطلاعات...</p>:<div style={{display:"grid",gap:10,marginTop:12}}>{templates.map(x=><article key={x.id} style={{display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap",alignItems:"center",padding:12,border:"1px solid var(--border,#e2e8f0)",borderRadius:10}}>
    <div><b>{x.title}</b><div style={{fontSize:12,color:"var(--muted-foreground,#64748b)"}}>نسخه {x.version} · {x.status} · {x.group_key}</div></div>
    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
     <button disabled={busy} onClick={()=>validate(x.id)}>اعتبارسنجی</button>
     {x.status==="draft"&&<button disabled={busy} onClick={()=>templateAction(x.id,"approve")}>تأیید</button>}
     {x.status==="approved"&&<button disabled={busy} onClick={()=>templateAction(x.id,"publish")}>انتشار</button>}
     {x.status!=="draft"&&<button disabled={busy} onClick={()=>templateAction(x.id,"new-version")}>نسخه جدید</button>}
     {x.status==="published"&&<button disabled={busy} onClick={()=>templateAction(x.id,"archive")}>بایگانی</button>}
    </div>
   </article>)}</div>}
  </section>
  <section style={{padding:18,border:"1px solid var(--border,#e2e8f0)",borderRadius:14}}>
   <h2 style={{margin:"0 0 12px"}}>تعریف متغیرهای قرارداد</h2>
   <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:10}}><button disabled={busy} onClick={()=>run("متغیرهای پیش‌فرض همگام شدند",()=>api("/api/lendtech/contract-variables/sync-defaults",{method:"POST",body:JSON.stringify({})}))}>همگام‌سازی متغیرهای پیش‌فرض</button></div>
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(230px,1fr))",gap:8}}>{variables.map(v=><div key={v.id} style={{padding:10,border:"1px solid var(--border,#e2e8f0)",borderRadius:9}}><b>{v.label}</b><div style={{fontSize:12,color:"var(--muted-foreground,#64748b)"}} dir="ltr">{v.key} · {v.source}:{v.data_type} {v.required?"· الزامی":""}</div></div>)}</div>
  </section>
  <section style={{padding:18,border:"1px solid var(--border,#e2e8f0)",borderRadius:14}}>
   <h2 style={{margin:"0 0 12px"}}>صف اسناد تولیدشده و بازبینی</h2>
   <div style={{display:"grid",gap:8}}>{documents.map(d=><article key={d.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap",padding:12,border:"1px solid var(--border,#e2e8f0)",borderRadius:10}}>
    <div><b>{d.title}</b><div style={{fontSize:12,color:"var(--muted-foreground,#64748b)"}}>{d.document_no} · {d.contract_no} · {d.application_no} · {d.product_code} · {d.status}</div></div>
    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}><a href={"/api/lendtech/contract-documents/"+d.id+"/html"} target="_blank" rel="noreferrer">مشاهده سند</a>{d.status==="draft"&&<button disabled={busy} onClick={()=>present(d.id)}>ارائه برای امضا</button>}</div>
   </article>)}{!documents.length&&!loading&&<p>سندی هنوز تولید نشده است.</p>}</div>
  </section>
 </main>;
}
