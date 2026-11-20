"use client";

import {useEffect,useState} from "react";
import {api} from "../../../lib/api";
import {ManagementDialog,ManagementToolbar} from "../../components/ManagementWorkspaceTools";
import "./delivery-methods.css";

type DeliveryMethod={id:string;code:string;title:string;carrier_type:string;business_days_min:number;business_days_max:number;cutoff_hour_local:number;cost:string|number;currency:string;enabled:boolean;rules:Record<string,unknown>};
type Draft={code:string;title:string;carrierType:string;businessDaysMin:string;businessDaysMax:string;cutoffHourLocal:string;cost:string;currency:string;enabled:boolean};
const empty:Draft={code:"",title:"",carrierType:"courier",businessDaysMin:"1",businessDaysMax:"3",cutoffHourLocal:"12",cost:"0",currency:"IRR",enabled:true};
const carrierLabel:Record<string,string>={courier:"پیک",post:"پست",pickup:"دریافت حضوری",freight:"باربری",digital:"تحویل دیجیتال"};
const money=(value:number|string,currency:string)=>Number(value).toLocaleString("fa-IR")+" "+(currency==="IRR"?"ریال":currency);
export default function DeliveryMethodsPage(){
 const [items,setItems]=useState<DeliveryMethod[]>([]),[draft,setDraft]=useState<Draft>(empty),[editingId,setEditingId]=useState(""),[open,setOpen]=useState(false),[saving,setSaving]=useState(false),[error,setError]=useState("");
 async function load(){try{const d=await api<{items:DeliveryMethod[]}>("/api/commerce/delivery-methods");setItems(d.items||[]);}catch(e){setError(e instanceof Error?e.message:"دریافت روش‌های تحویل ناموفق بود");}}
 useEffect(()=>{void load()},[]);
 function create(){setEditingId("");setDraft(empty);setError("");setOpen(true);}
 function edit(item:DeliveryMethod){setEditingId(item.id);setDraft({code:item.code,title:item.title,carrierType:item.carrier_type,businessDaysMin:String(item.business_days_min),businessDaysMax:String(item.business_days_max),cutoffHourLocal:String(item.cutoff_hour_local),cost:String(item.cost),currency:item.currency,enabled:item.enabled});setError("");setOpen(true);}
 async function save(){setSaving(true);setError("");try{const body={code:draft.code,title:draft.title,carrierType:draft.carrierType,businessDaysMin:Number(draft.businessDaysMin),businessDaysMax:Number(draft.businessDaysMax),cutoffHourLocal:Number(draft.cutoffHourLocal),cost:Number(draft.cost),currency:draft.currency,enabled:draft.enabled,rules:items.find(item=>item.id===editingId)?.rules||{}};if(editingId)await api("/api/commerce/delivery-methods/"+encodeURIComponent(editingId),{method:"PATCH",body:JSON.stringify(body)});else await api("/api/commerce/delivery-methods",{method:"POST",body:JSON.stringify(body)});setOpen(false);await load();}catch(e){setError(e instanceof Error?e.message:"ذخیره روش تحویل ناموفق بود");}finally{setSaving(false);}}
 async function toggle(item:DeliveryMethod){setError("");try{await api("/api/commerce/delivery-methods/"+encodeURIComponent(item.id),{method:"PATCH",body:JSON.stringify({enabled:!item.enabled})});await load();}catch(e){setError(e instanceof Error?e.message:"تغییر وضعیت روش تحویل ناموفق بود");}}
 const set=(key:keyof Draft,value:string|boolean)=>setDraft(old=>({...old,[key]:value}));
 return <main className="enterprise-main sk-delivery-admin" dir="rtl">
  <header className="platform-header"><div><span className="section-kicker">مدیریت تجارت و لجستیک</span><h1>روش‌های ارسال و تحویل</h1><p>تعرفه، نوع تحویل، بازه روز کاری و فعال بودن روش‌هایی که در تسویه مشتری نمایش داده می‌شوند.</p></div><a href="/marketplace">مرکز بازارگاه</a></header>
  <ManagementToolbar rows={items as unknown as Record<string,unknown>[]} filename="commerce-delivery-methods" onCreate={create}/>
  {error&&!open&&<p className="enterprise-loading error" role="alert">{error}</p>}
  <section className="platform-panel sk-delivery-panel">
   <div className="sk-delivery-summary"><b>{items.length.toLocaleString("fa-IR")} روش ثبت‌شده</b><span>{items.filter(x=>x.enabled).length.toLocaleString("fa-IR")} روش فعال برای انتخاب مشتری</span></div>
   <div className="sk-delivery-list">{items.map(item=><article className="sk-delivery-card" key={item.id}>
    <div className="sk-delivery-card-title"><div><b>{item.title}</b><small>{item.code} · {carrierLabel[item.carrier_type]||item.carrier_type}</small></div><span className={item.enabled?"is-enabled":"is-disabled"}>{item.enabled?"فعال":"غیرفعال"}</span></div>
    <div className="sk-delivery-card-data"><div><small>تعرفه</small><strong>{money(item.cost,item.currency)}</strong></div><div><small>زمان تحویل</small><strong>{Number(item.business_days_min).toLocaleString("fa-IR")} تا {Number(item.business_days_max).toLocaleString("fa-IR")} روز کاری</strong></div><div><small>ساعت برش</small><strong>{Number(item.cutoff_hour_local).toLocaleString("fa-IR")}:۰۰</strong></div></div>
    <div className="sk-delivery-card-actions"><button type="button" onClick={()=>edit(item)}>ویرایش تعرفه</button><button type="button" onClick={()=>toggle(item)}>{item.enabled?"غیرفعال‌سازی":"فعال‌سازی"}</button></div>
   </article>)}</div>
   {!items.length&&<div className="enterprise-loading">هنوز روش تحویلی ثبت نشده است. برای نمایش گزینه ارسال در تسویه مشتری، ابتدا یک تعرفه معتبر ایجاد کنید.</div>}
  </section>
  {open&&<ManagementDialog title={editingId?"ویرایش روش تحویل":"افزودن روش تحویل"} onClose={()=>setOpen(false)}>
   <div className="sk-delivery-form">
    <label>کد یکتا<input value={draft.code} onChange={e=>set("code",e.target.value)} maxLength={80} placeholder="مثلاً post-standard"/></label>
    <label>عنوان نمایشی<input value={draft.title} onChange={e=>set("title",e.target.value)} maxLength={200} placeholder="مثلاً پست پیشتاز"/></label>
    <label>نوع تحویل<select value={draft.carrierType} onChange={e=>set("carrierType",e.target.value)}>{Object.entries(carrierLabel).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
    <div className="sk-delivery-form-grid"><label>حداقل روز کاری<input type="number" min="0" max="365" value={draft.businessDaysMin} onChange={e=>set("businessDaysMin",e.target.value)}/></label><label>حداکثر روز کاری<input type="number" min="0" max="365" value={draft.businessDaysMax} onChange={e=>set("businessDaysMax",e.target.value)}/></label></div>
    <div className="sk-delivery-form-grid"><label>ساعت برش (۰ تا ۲۳)<input type="number" min="0" max="23" value={draft.cutoffHourLocal} onChange={e=>set("cutoffHourLocal",e.target.value)}/></label><label>هزینه ارسال<input type="number" min="0" value={draft.cost} onChange={e=>set("cost",e.target.value)}/></label></div>
    <label>واحد پول<input value={draft.currency} onChange={e=>set("currency",e.target.value.toUpperCase())} maxLength={10}/></label>
    <label className="sk-delivery-enabled"><input type="checkbox" checked={draft.enabled} onChange={e=>set("enabled",e.target.checked)}/> نمایش این روش در تسویه مشتری</label>
    {error&&<p className="enterprise-loading error" role="alert">{error}</p>}
    <button type="button" onClick={save} disabled={saving||!draft.code.trim()||!draft.title.trim()||!draft.currency.trim()}>{saving?"در حال ذخیره…":"ذخیره روش تحویل"}</button>
   </div>
  </ManagementDialog>}
 </main>;
}
