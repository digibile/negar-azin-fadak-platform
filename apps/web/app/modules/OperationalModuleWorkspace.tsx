"use client";

import {useEffect,useMemo,useState} from "react";
import {useSearchParams} from "next/navigation";

type Field={field_key:string;title:string;field_type:string;required:boolean;sort_order:number;options?:{options?:string[]}};
type Action={id:number;action_code:string;title:string;permission:string;is_active:boolean};
type RecordItem={id:number;record_type:string;title:string;status:string;data:Record<string,unknown>;created_at:string;updated_at:string};

const api=(process.env.NEXT_PUBLIC_API_BASE_URL||process.env.NEXT_PUBLIC_API_URL||"").replace(/\/$/,"");
const url=(path:string)=>api+path;
const csrf=()=>document.cookie.split(";").map(x=>x.trim()).find(x=>x.startsWith("naf_csrf="))?.slice(9)||"";

const TITLES:Record<string,string>={
"24-production":"تولید و عملیات تولید","25-costing":"بهای تمام‌شده","27-receivables":"وصول مطالبات","28-payables":"پرداختنی‌ها","30-projects-cost-centers":"پروژه‌ها و مراکز هزینه","31-fixed-assets":"دارایی‌های ثابت","32-tax-e-invoicing":"مالیات و صورتحساب الکترونیکی","33-budget-financial-control":"بودجه و کنترل مالی","34-financial-commitments":"تعهدات مالی","35-credit-financing":"اعتبارات و تأمین مالی","36-loans":"تسهیلات و وام‌ها","39-human-resources":"منابع انسانی","40-ai-finance":"هوش مصنوعی مالی","41-ai-documents-ocr":"هوش مصنوعی اسناد و OCR","42-audit-internal-control":"حسابرسی و کنترل داخلی","43-communication-hub":"مرکز ارتباطات و اعلان‌ها","44-marketing-content":"بازاریابی و محتوا","45-search-analytics":"جستجو و تحلیل","46-unified-applications":"برنامه‌های یکپارچه","47-contracts-legal":"قراردادها و امور حقوقی","48-shipping-delivery":"حمل و تحویل","49-reconciliation":"مغایرت‌گیری و تطبیق","50-release-health":"سلامت انتشار سامانه"
};

const PANEL_02_SECTIONS:Record<string,{tab:string;label:string}[]>={
 "39-human-resources":[{tab:"employees",label:"کارکنان"},{tab:"payroll",label:"حقوق و دستمزد"},{tab:"attendance",label:"حضور و غیاب"}],
 "30-projects-cost-centers":[{tab:"projects",label:"پروژه‌ها"}],
 "24-production":[{tab:"production",label:"تولید"},{tab:"maintenance",label:"نگهداری و تعمیرات"}]
};
const WORKSPACE_LABELS:Record<string,string>={employees:"پرونده کارکنان",payroll:"حقوق و دستمزد",attendance:"حضور و غیاب",projects:"مدیریت پروژه",production:"برنامه‌ریزی تولید",maintenance:"نگهداری و تعمیرات",record:"رکوردهای عملیاتی"};

export default function OperationalModuleWorkspace({code}:{code:string}){
 const searchParams=useSearchParams();
 const tab=searchParams.get("tab")||"";
 const activeRecordType=tab||"record";
 const schemaType=tab||"default";
 const sectionLinks=PANEL_02_SECTIONS[code]||[];
 const [fields,setFields]=useState<Field[]>([]);
 const [actions,setActions]=useState<Action[]>([]);
 const [items,setItems]=useState<RecordItem[]>([]);
 const [title,setTitle]=useState("");
 const [status,setStatus]=useState("active");
 const [form,setForm]=useState<Record<string,unknown>>({});
 const [editingId,setEditingId]=useState<number|null>(null);
 const [q,setQ]=useState("");
 const [filterStatus,setFilterStatus]=useState("");
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState("");

 const load=async()=>{
  setLoading(true);setError("");
  try{
   const [s,r,a]=await Promise.all([
    fetch(url("/api/platform/modules/"+encodeURIComponent(code)+"/schema?recordType="+encodeURIComponent(schemaType)),{credentials:"include"}),
    fetch(url("/api/platform/modules/"+encodeURIComponent(code)+"/records?page=1&pageSize=50&recordType="+encodeURIComponent(activeRecordType)+"&q="+encodeURIComponent(q)+(filterStatus?"&status="+encodeURIComponent(filterStatus):"")),{credentials:"include"}),
    fetch(url("/api/platform/modules/"+encodeURIComponent(code)+"/actions"),{credentials:"include"})
   ]);
   if(!s.ok||!r.ok)throw new Error("دسترسی یا ساختار عملیاتی این ماژول در دسترس نیست.");
   const schema=await s.json(),records=await r.json();
   setFields((schema.fields||[]).sort((x:Field,y:Field)=>x.sort_order-y.sort_order));
   setItems(records.items||[]);
   setActions(a.ok?await a.json():[]);
  }catch(e){setError(e instanceof Error?e.message:"خطا در دریافت اطلاعات");}
  finally{setLoading(false);}
 };
 useEffect(()=>{load()},[code,filterStatus,tab]);

 const setField=(key:string,value:unknown)=>setForm(x=>({...x,[key]:value}));
 const reset=()=>{setEditingId(null);setTitle("");setStatus("active");setForm({});setError("")};
 const edit=(r:RecordItem)=>{setEditingId(r.id);setTitle(r.title);setStatus(r.status);setForm(r.data||{});setError("")};
 const save=async()=>{
  if(!title.trim())return setError("عنوان رکورد الزامی است.");
  const missing=fields.filter(f=>f.required&&(form[f.field_key]===undefined||form[f.field_key]===null||String(form[f.field_key]).trim()===""));
  if(missing.length)return setError("فیلدهای الزامی را کامل کنید: "+missing.map(f=>f.title).join("، "));
  setSaving(true);setError("");
  try{
   const r=await fetch(url("/api/platform/modules/"+encodeURIComponent(code)+"/records"+(editingId?"/"+editingId:"")),{
    method:editingId?"PATCH":"POST",credentials:"include",headers:{"Content-Type":"application/json","X-CSRF-Token":csrf()},
    body:JSON.stringify({recordType:activeRecordType,title,status,data:form})
   });
   const body=await r.json().catch(()=>null);
   if(!r.ok)throw new Error(body?.error||"ثبت رکورد انجام نشد");
   reset();await load();
  }catch(e){setError(e instanceof Error?e.message:"خطا در ثبت")}
  finally{setSaving(false)}
 };
 const remove=async(id:number)=>{
  if(!confirm("این رکورد حذف شود؟"))return;
  try{
   const r=await fetch(url("/api/platform/modules/"+encodeURIComponent(code)+"/records/"+id),{method:"DELETE",credentials:"include",headers:{"X-CSRF-Token":csrf()}});
   const body=await r.json().catch(()=>null);
   if(!r.ok)throw new Error(body?.error||"حذف انجام نشد");
   await load();
  }catch(e){setError(e instanceof Error?e.message:"خطا در حذف")}
 };
 const input=(f:Field)=>{
  const v=form[f.field_key]??"";
  if(f.field_type==="textarea")return <textarea value={String(v)} onChange={e=>setField(f.field_key,e.target.value)}/>;
  if(f.field_type==="number")return <input type="number" value={String(v)} onChange={e=>setField(f.field_key,e.target.value===""?"":Number(e.target.value))}/>;
  if(f.field_type==="date"||f.field_type==="datetime")return <input type={f.field_type==="date"?"date":"datetime-local"} value={String(v)} onChange={e=>setField(f.field_key,e.target.value)}/>;
  if(f.field_type==="boolean")return <input type="checkbox" checked={Boolean(v)} onChange={e=>setField(f.field_key,e.target.checked)}/>;
  if(f.field_type==="select")return <select value={String(v)} onChange={e=>setField(f.field_key,e.target.value)}><option value="">انتخاب کنید</option>{(f.options?.options||[]).map(x=><option key={x} value={x}>{x}</option>)}</select>;
  return <input value={String(v)} onChange={e=>setField(f.field_key,e.target.value)}/>;
 };

 const visible=useMemo(()=>items,[items]);
 return <main className="module-runtime canonical-module" dir="rtl">
  <header className="page-head"><div><span className="eyebrow">منوی مرکزی سازمان · پنل ۰۲</span><h1>{TITLES[code]||code}{tab&&WORKSPACE_LABELS[tab]?" · "+WORKSPACE_LABELS[tab]:""}</h1><p className="muted">ثبت و مدیریت اطلاعات در پایگاه داده واقعی، با تفکیک فضای کاری</p></div><a className="back-link" href="/admin">مرکز مدیریت</a></header>
  {sectionLinks.length>1&&<nav className="module-subnav" aria-label="فضاهای کاری پنل سازمان">{sectionLinks.map(item=><a key={item.tab} className={tab===item.tab?"active":""} href={"/modules/?code="+encodeURIComponent(code)+"&tab="+encodeURIComponent(item.tab)}>{item.label}</a>)}</nav>}
  {error&&<div className="error runtime-error">{error}</div>}
  {loading?<div className="runtime-panel">در حال دریافت داده واقعی...</div>:<div className="runtime-layout">
   <section className="runtime-panel"><div className="panel-title"><div><h2>{editingId?"ویرایش رکورد":"ثبت رکورد"}</h2><span>{fields.length} فیلد · {actions.length} عملیات مجاز</span></div>{editingId&&<button onClick={reset}>انصراف</button>}</div>
    <div className="field-pair"><label>عنوان رکورد<input value={title} onChange={e=>setTitle(e.target.value)} required/></label><label>فضای کاری<input value={WORKSPACE_LABELS[activeRecordType]||activeRecordType} readOnly/></label></div>
    <label>وضعیت<select value={status} onChange={e=>setStatus(e.target.value)}><option value="active">فعال</option><option value="pending">در انتظار</option><option value="closed">بسته</option></select></label>
    <div className="runtime-fields">{fields.map(f=><label key={f.field_key}>{f.title}{f.required?" *":""}{input(f)}</label>)}</div>
    <button className="primary wide" onClick={save} disabled={saving}>{saving?"در حال ذخیره...":editingId?"ذخیره تغییرات":"ثبت در PostgreSQL"}</button>
   </section>
   <section className="runtime-panel"><div className="panel-title"><div><h2>رکوردهای ثبت‌شده</h2><span>{items.length}</span></div></div>
    <div className="runtime-search"><input placeholder="جستجو در عنوان و داده..." value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==="Enter"&&load()}/><select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}><option value="">همه وضعیت‌ها</option><option value="active">فعال</option><option value="pending">در انتظار</option><option value="closed">بسته</option></select><button onClick={load}>جستجو</button></div>
    <div className="record-list">{visible.map(r=><article className="record-row" key={r.id}><div><strong>{r.title}</strong><small>{r.record_type} · {r.status}</small><code>{JSON.stringify(r.data)}</code></div><div className="record-actions"><button onClick={()=>edit(r)}>ویرایش</button><button className="danger" onClick={()=>remove(r.id)}>حذف</button></div></article>)}{!visible.length&&<div className="empty">رکوردی ثبت نشده است.</div>}</div>
   </section>
  </div>}
 </main>;
}
