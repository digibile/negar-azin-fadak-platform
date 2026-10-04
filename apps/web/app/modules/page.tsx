"use client";

import {useEffect,useMemo,useState} from "react";

type Field={field_key:string;title:string;field_type:string;required:boolean;sort_order:number;options?:{options?:string[]}};
type ModuleInfo={id:number;code:string;title:string};
type Action={id:number;action_code:string;title:string;permission:string;is_active:boolean};
type RecordItem={id:number;record_type:string;title:string;status:string;data:Record<string,unknown>;created_at:string;updated_at:string};

const api=(process.env.NEXT_PUBLIC_API_BASE_URL||process.env.NEXT_PUBLIC_API_URL||"").replace(/\/$/,"");
const url=(path:string)=>api+path;
const csrf=()=>document.cookie.split(";").map(x=>x.trim()).find(x=>x.startsWith("naf_csrf="))?.slice(9)||"";

export default function ModulesPage(){
 const [code,setCode]=useState("");
 const [module,setModule]=useState<ModuleInfo|null>(null);
 const [actions,setActions]=useState<Action[]>([]);
 const [fields,setFields]=useState<Field[]>([]);
 const [items,setItems]=useState<RecordItem[]>([]);
 const [form,setForm]=useState<Record<string,unknown>>({});
 const [title,setTitle]=useState("");
 const [recordType,setRecordType]=useState("record");
 const [status,setStatus]=useState("active");
 const [filterStatus,setFilterStatus]=useState("");
 const [q,setQ]=useState("");
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const [editingId,setEditingId]=useState<number|null>(null);
 const [error,setError]=useState("");

 useEffect(()=>{const c=new URLSearchParams(window.location.search).get("code")||"governance";setCode(c)},[]);
 const load=async()=>{
   if(!code)return;
   setLoading(true);setError("");
   try{
    const [schema,records,actionResponse]=await Promise.all([
      fetch(url("/api/platform/modules/"+encodeURIComponent(code)+"/schema"),{credentials:"include"}),
      fetch(url("/api/platform/modules/"+encodeURIComponent(code)+"/records?page=1&pageSize=50&q="+encodeURIComponent(q)+(filterStatus?"&status="+encodeURIComponent(filterStatus):"")),{credentials:"include"}),
      fetch(url("/api/platform/modules/"+encodeURIComponent(code)+"/actions"),{credentials:"include"})
    ]);
    if(!schema.ok||!records.ok)throw new Error("برای مشاهده این ماژول باید نشست معتبر داشته باشید.");
    const s=await schema.json(),r=await records.json(),a=actionResponse.ok?await actionResponse.json():[];
    setModule(s.module);setFields(s.fields);setItems(r.items||[]);setActions(a);
   }catch(e){setError(e instanceof Error?e.message:"خطا در دریافت اطلاعات");}
   finally{setLoading(false)}
 };
 useEffect(()=>{load()},[code,filterStatus]);
 const fieldValue=(key:string)=>form[key]??"";
 const setField=(key:string,value:unknown)=>setForm(x=>({...x,[key]:value}));
 const save=async()=>{
   if(!title.trim())return setError("عنوان رکورد الزامی است.");
   const missing=fields.filter(f=>f.required&&(form[f.field_key]===undefined||form[f.field_key]===null||String(form[f.field_key]).trim()===""));
   if(missing.length)return setError("فیلدهای الزامی را کامل کنید: "+missing.map(f=>f.title).join("، "));
   setSaving(true);setError("");
   try{
    const r=await fetch(url("/api/platform/modules/"+encodeURIComponent(code)+"/records"+(editingId?"/"+editingId:"")),{
      method:editingId?"PATCH":"POST",credentials:"include",headers:{"Content-Type":"application/json","X-CSRF-Token":csrf()},
      body:JSON.stringify({recordType,title,status,data:form})
    });
    const body=await r.json().catch(()=>null);
    if(!r.ok)throw new Error(body?.error||"ثبت رکورد انجام نشد");
    setTitle("");setForm({});setEditingId(null);await load();
   }catch(e){setError(e instanceof Error?e.message:"خطا در ثبت")}
   finally{setSaving(false)}
 };
 const edit=(r:RecordItem)=>{setEditingId(r.id);setTitle(r.title);setRecordType(r.record_type);setStatus(r.status);setForm(r.data||{});setError("");window.scrollTo({top:0,behavior:"smooth"})};
 const resetForm=()=>{setEditingId(null);setTitle("");setRecordType("record");setStatus("active");setForm({});setError("");};
 const remove=async(id:number)=>{
   setError("");
   try{
    const r=await fetch(url("/api/platform/modules/"+encodeURIComponent(code)+"/records/"+id),{method:"DELETE",credentials:"include",headers:{"X-CSRF-Token":csrf()}});
    if(!r.ok){const b=await r.json().catch(()=>null);throw new Error(b?.error||"حذف انجام نشد")}
    await load();
   }catch(e){setError(e instanceof Error?e.message:"خطا در حذف")}
 };
 const fieldInput=(f:Field)=>{
   const v=fieldValue(f.field_key);
   if(f.field_type==="textarea")return <textarea value={String(v)} onChange={e=>setField(f.field_key,e.target.value)} />;
   if(f.field_type==="number")return <input type="number" value={String(v)} onChange={e=>setField(f.field_key,e.target.value===""?"":Number(e.target.value))}/>;
   if(f.field_type==="date"||f.field_type==="datetime")return <input type={f.field_type==="date"?"date":"datetime-local"} value={String(v)} onChange={e=>setField(f.field_key,e.target.value)}/>;
   if(f.field_type==="boolean")return <input type="checkbox" checked={Boolean(v)} onChange={e=>setField(f.field_key,e.target.checked)}/>;
   if(f.field_type==="select")return <select value={String(v)} onChange={e=>setField(f.field_key,e.target.value)}><option value="">انتخاب کنید</option>{(f.options?.options||[]).map(x=><option key={x} value={x}>{x}</option>)}</select>;
   return <input value={String(v)} onChange={e=>setField(f.field_key,e.target.value)} required={f.required}/>;
 };
 const visible=useMemo(()=>items,[items]);
 return <main className="module-runtime">
  <header className="page-head">
   <div><span className="eyebrow">هسته مرکزی کسب‌وکار</span><h1>{module?.title||"فضای عملیاتی ماژول"}</h1><p className="muted">کد ماژول: {code}</p></div>
   <a className="back-link" href="/">بازگشت به منوی مرکزی</a>
  </header>
  {error&&<div className="error runtime-error">{error}</div>}
  {loading?<div className="runtime-panel">در حال دریافت داده واقعی...</div>:<div className="runtime-layout">
   <section className="runtime-panel">
    <div className="panel-title"><div><h2>{editingId?"ویرایش رکورد":"ثبت رکورد"}</h2><span>{fields.length} فیلد · {actions.length} عملیات مجاز</span></div>{editingId&&<button onClick={resetForm}>انصراف از ویرایش</button>}</div>
    <div className="field-pair"><label>عنوان رکورد<input value={title} onChange={e=>setTitle(e.target.value)} /></label><label>نوع رکورد<input value={recordType} onChange={e=>setRecordType(e.target.value)} /></label></div>
    <label>وضعیت<select value={status} onChange={e=>setStatus(e.target.value)}><option value="active">فعال</option><option value="pending">در انتظار</option><option value="closed">بسته</option></select></label>
    <div className="runtime-fields">{fields.map(f=><label key={f.field_key}>{f.title}{f.required?" *":""}{fieldInput(f)}</label>)}</div>
    <button className="primary wide" onClick={save} disabled={saving}>{saving?"در حال ذخیره...":editingId?"ذخیره تغییرات":"ثبت در PostgreSQL"}</button>
   </section>
   <section className="runtime-panel">
    <div className="panel-title"><h2>رکوردهای ثبت‌شده</h2><span>{items.length}</span></div>
    <div className="runtime-search"><input placeholder="جستجو در عنوان و داده..." value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==="Enter"&&load()}/><select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}><option value="">همه وضعیت‌ها</option><option value="active">فعال</option><option value="pending">در انتظار</option><option value="closed">بسته</option></select><button onClick={load}>جستجو</button></div>
    <div className="record-list">{visible.map(r=><article className="record-row" key={r.id}><div><strong>{r.title}</strong><small>{r.record_type} · {r.status}</small><code>{JSON.stringify(r.data)}</code></div><div className="record-actions"><button onClick={()=>edit(r)}>ویرایش</button><button className="danger" onClick={()=>remove(r.id)}>حذف</button></div></article>)}{!visible.length&&<div className="empty">رکوردی ثبت نشده است.</div>}</div>
   </section>
  </div>}
 </main>;
}
