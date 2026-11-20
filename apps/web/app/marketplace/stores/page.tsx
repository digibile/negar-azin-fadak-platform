"use client";
import {useEffect,useState} from "react";
import {api} from "../../../lib/api";
import {ManagementDialog,ManagementToolbar} from "../../components/ManagementWorkspaceTools";
type Seller={id:string;display_name:string;status:string};
type Store={id:string;name:string;code:string;slug:string;seller_id:string;seller_name:string;status:string;[key:string]:unknown};
const statusLabel:Record<string,string>={draft:"پیش‌نویس",active:"منتشرشده",suspended:"تعلیق‌شده",closed:"بسته"};
export default function StoresPage(){
 const [items,setItems]=useState<Store[]>([]),[sellers,setSellers]=useState<Seller[]>([]),[sellerId,setSellerId]=useState(""),[code,setCode]=useState(""),[name,setName]=useState(""),[slug,setSlug]=useState(""),[error,setError]=useState(""),[savingId,setSavingId]=useState(""),[selected,setSelected]=useState<Store|null>(null),[createOpen,setCreateOpen]=useState(false);
 async function load(){try{const [a,b]=await Promise.all([api<{items:Store[]}>("/api/marketplace/stores"),api<{items:Seller[]}>("/api/marketplace/sellers")]);setItems(a.items||[]);setSellers(b.items||[]);if(!sellerId&&b.items?.length)setSellerId((b.items.find(x=>x.status==="active")||b.items[0]).id)}catch(e){setError(e instanceof Error?e.message:"خطا در دریافت فروشگاه‌ها")}}
 useEffect(()=>{void load()},[]);
 async function create(){setError("");try{await api("/api/marketplace/stores",{method:"POST",body:JSON.stringify({sellerId,code,name,slug})});setCode("");setName("");setSlug("");setCreateOpen(false);await load()}catch(e){setError(e instanceof Error?e.message:"ثبت فروشگاه ناموفق بود")}}
 async function changeStatus(item:Store,status:"active"|"suspended"){setError("");setSavingId(item.id);try{await api("/api/marketplace/stores/"+encodeURIComponent(item.id)+"/status",{method:"PATCH",body:JSON.stringify({status})});await load()}catch(e){setError(e instanceof Error?e.message:"تغییر وضعیت فروشگاه ناموفق بود")}finally{setSavingId("")}}
 const selectedSeller=sellers.find(x=>x.id===sellerId);
 return <main className="enterprise-main" dir="rtl">
  <header className="platform-header"><div><span className="section-kicker">مدیریت تجارت</span><h1>فروشگاه‌ها</h1><p>فروشگاه فقط وقتی در ویترین عمومی دیده می‌شود که فروشگاه و فروشنده هر دو فعال باشند.</p></div><a href="/platform">مرکز عملیات</a></header>
  <ManagementToolbar rows={items as unknown as Record<string,unknown>[]} filename="marketplace-stores" onCreate={()=>setCreateOpen(true)}/>
  {createOpen&&<ManagementDialog title="افزودن فروشگاه" onClose={()=>setCreateOpen(false)}><div className="platform-form"><select value={sellerId} onChange={e=>setSellerId(e.target.value)}><option value="">فروشنده را انتخاب کنید</option>{sellers.map(x=><option value={x.id} key={x.id}>{x.display_name} · {x.status==="active"?"فعال":"غیرفعال"}</option>)}</select><input value={code} onChange={e=>setCode(e.target.value)} placeholder="کد فروشگاه"/><input value={name} onChange={e=>setName(e.target.value)} placeholder="نام فروشگاه"/><input value={slug} onChange={e=>setSlug(e.target.value)} placeholder="شناسه نشانی (slug)"/><button onClick={create} disabled={!sellerId||!code.trim()||!name.trim()||!slug.trim()}>ثبت فروشگاه</button></div></ManagementDialog>}
  <section className="platform-panel">
   
   {selectedSeller&&selectedSeller.status!=="active"&&<p className="enterprise-loading">فروشنده انتخاب‌شده هنوز فعال نیست؛ فروشگاه پس از فعال‌سازی فروشنده قابل نمایش عمومی خواهد بود.</p>}
   {error&&<p className="enterprise-loading error" role="alert">{error}</p>}
   <div className="platform-list">{items.map(item=><article className="platform-row" key={item.id}>
    <div><b>{item.name}</b><small>{item.code} · {item.slug}</small></div><span>{item.seller_name}</span><strong>{statusLabel[item.status]||item.status}</strong>
    <div className="record-actions"><button type="button" onClick={()=>setSelected(item)}>مشاهده</button>{item.status==="active"?<button onClick={()=>changeStatus(item,"suspended")} disabled={savingId===item.id}>تعلیق</button>:<button onClick={()=>changeStatus(item,"active")} disabled={savingId===item.id}>{savingId===item.id?"در حال ذخیره…":"انتشار فروشگاه"}</button>}</div>
   </article>)}</div>
   {!items.length&&<div className="enterprise-loading">فروشگاهی ثبت نشده است.</div>}
  </section>
  {selected&&<ManagementDialog title={"جزئیات فروشگاه "+selected.name} onClose={()=>setSelected(null)}><dl className="management-detail-grid">{Object.entries(selected).filter(([key])=>key!=="id").map(([key,value])=><div key={key}><dt>{key}</dt><dd>{value===null||value===undefined?"—":String(value)}</dd></div>)}</dl></ManagementDialog>}
 </main>;
}