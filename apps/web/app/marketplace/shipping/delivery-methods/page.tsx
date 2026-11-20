"use client";

import {useCallback,useEffect,useState} from "react";
import Link from "next/link";
import {api} from "../../../../lib/api";
import "../shipping-workspace.css";
import "./delivery-methods.css";

type DeliveryProduct={id:string;sku:string;title:string;enabled:boolean};
type Method={id:string;code:string;title:string;carrier_type:"courier"|"post"|"pickup"|"freight"|"digital";business_days_min:number;business_days_max:number;cutoff_hour_local:number;cost:string|number;currency:string;enabled:boolean};
const carrierLabels:Record<string,string>={courier:"پیک",post:"پست",pickup:"دریافت حضوری",freight:"باربری",digital:"تحویل دیجیتال"};
const money=(value:number|string,currency:string)=>Number(value||0).toLocaleString("fa-IR")+" "+currency;

export default function DeliveryMethodsPage(){
 const [items,setItems]=useState<Method[]>([]);
 const [form,setForm]=useState({code:"",title:"",carrierType:"post",businessDaysMin:"1",businessDaysMax:"4",cutoffHourLocal:"12",cost:"0",currency:"IRR"});
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[busyId,setBusyId]=useState("");
 const [error,setError]=useState(""),[notice,setNotice]=useState("");
 const [selectedMethod,setSelectedMethod]=useState<Method|null>(null);
 const [products,setProducts]=useState<DeliveryProduct[]>([]);
 const [productsLoading,setProductsLoading]=useState(false),[productsSaving,setProductsSaving]=useState(false);

 const load=useCallback(async()=>{setLoading(true);setError("");try{setItems(await api<Method[]>("/api/logistics/delivery-methods")||[]);}catch(e){setError(e instanceof Error?e.message:"دریافت روش‌های ارسال ناموفق بود.");}finally{setLoading(false);}},[]);
 useEffect(()=>{void load();},[load]);
 async function add(e:React.FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);setError("");setNotice("");try{await api("/api/logistics/delivery-methods",{method:"POST",body:JSON.stringify({...form,businessDaysMin:Number(form.businessDaysMin),businessDaysMax:Number(form.businessDaysMax),cutoffHourLocal:Number(form.cutoffHourLocal),cost:Number(form.cost)})});setForm({code:"",title:"",carrierType:"post",businessDaysMin:"1",businessDaysMax:"4",cutoffHourLocal:"12",cost:"0",currency:"IRR"});setNotice("روش ارسال ثبت شد.");await load();}catch(e){setError(e instanceof Error?e.message:"ثبت روش ارسال ناموفق بود.");}finally{setBusy(false);}}

 async function openProducts(item:Method){setSelectedMethod(item);setProductsLoading(true);setError("");try{setProducts(await api<DeliveryProduct[]>("/api/logistics/delivery-methods/"+encodeURIComponent(item.id)+"/products")||[]);}catch(e){setError(e instanceof Error?e.message:"دریافت فهرست کالاها ناموفق بود.");setProducts([]);}finally{setProductsLoading(false);}}
 function toggleProduct(id:string){setProducts(current=>current.map(p=>p.id===id?{...p,enabled:!p.enabled}:p));}
 async function saveProducts(){if(!selectedMethod)return;setProductsSaving(true);setError("");setNotice("");try{const result=await api<{assignedProductCount:number}>("/api/logistics/delivery-methods/"+encodeURIComponent(selectedMethod.id)+"/products",{method:"PUT",body:JSON.stringify({productIds:products.filter(p=>p.enabled).map(p=>p.id)})});setNotice("تخصیص کالاها ذخیره شد. تعداد کالاهای متصل: "+Number(result.assignedProductCount||0).toLocaleString("fa-IR"));}catch(e){setError(e instanceof Error?e.message:"ذخیره تخصیص کالاها ناموفق بود.");}finally{setProductsSaving(false);}}
 async function toggle(item:Method){setBusyId(item.id);setError("");setNotice("");try{await api("/api/logistics/delivery-methods/"+encodeURIComponent(item.id)+"/enabled",{method:"PATCH",body:JSON.stringify({enabled:!item.enabled})});setNotice("وضعیت روش ارسال تغییر کرد.");await load();}catch(e){setError(e instanceof Error?e.message:"تغییر وضعیت ناموفق بود.");}finally{setBusyId("");}}
 return <main className="enterprise-main shipping-workspace delivery-methods-workspace" dir="rtl">
  <header className="platform-header shipping-header"><div><span className="section-kicker">تجارت · زنجیره تأمین و لجستیک</span><h1>روش‌ها و تعرفه‌های ارسال</h1><p>تعریف روش تحویل، بازه زمانی و هزینه پایه در محدوده سازمان</p></div><div className="delivery-header-actions"><Link href="/marketplace/shipping">بازگشت به ارسال‌ها</Link><Link href="/marketplace/shipping/resources">ناوگان و رانندگان</Link><button type="button" onClick={()=>void load()} disabled={loading}>بازخوانی</button></div></header>
  {error&&<p className="shipping-message error" role="alert">{error}</p>}{notice&&<p className="shipping-message success" role="status">{notice}</p>}
  <form className="platform-panel delivery-method-form" onSubmit={add}>
   <div className="delivery-form-heading"><h2>تعریف روش ارسال</h2><p>هزینه این فرم تعرفه پایه ثبت‌شده توسط سازمان است؛ به‌تنهایی به مشتری اعلام یا به سفارش اضافه نمی‌شود.</p></div>
   <label>شناسه یکتا<input required maxLength={60} pattern="[A-Za-z0-9_-]+" value={form.code} onChange={e=>setForm(p=>({...p,code:e.target.value}))} placeholder="مثلاً post-standard"/></label>
   <label>عنوان روش<input required maxLength={120} value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} placeholder="پست پیشتاز"/></label>
   <label>نوع تحویل<select value={form.carrierType} onChange={e=>setForm(p=>({...p,carrierType:e.target.value}))}><option value="post">پست</option><option value="courier">پیک</option><option value="pickup">دریافت حضوری</option><option value="freight">باربری</option><option value="digital">تحویل دیجیتال</option></select></label>
   <label>حداقل روز کاری<input required type="number" min="0" max="90" step="1" value={form.businessDaysMin} onChange={e=>setForm(p=>({...p,businessDaysMin:e.target.value}))}/></label>
   <label>حداکثر روز کاری<input required type="number" min="0" max="90" step="1" value={form.businessDaysMax} onChange={e=>setForm(p=>({...p,businessDaysMax:e.target.value}))}/></label>
   <label>ساعت پایان پذیرش<input required type="number" min="0" max="23" step="1" value={form.cutoffHourLocal} onChange={e=>setForm(p=>({...p,cutoffHourLocal:e.target.value}))}/></label>
   <label>هزینه پایه<input required type="number" min="0" step="0.01" value={form.cost} onChange={e=>setForm(p=>({...p,cost:e.target.value}))}/></label>
   <label>واحد پول<input required maxLength={3} minLength={3} pattern="[A-Za-z]{3}" value={form.currency} onChange={e=>setForm(p=>({...p,currency:e.target.value.toUpperCase()}))}/></label>
   <button type="submit" disabled={busy}>{busy?"در حال ثبت…":"ثبت روش ارسال"}</button>
  </form>
  <section className="platform-panel delivery-method-list"><header><div><h2>روش‌های ثبت‌شده</h2><p>روش غیرفعال در فهرست عملیاتی قابل استفاده نخواهد بود.</p></div><b>{items.length.toLocaleString("fa-IR")} روش</b></header>
   {loading?<p className="empty">در حال دریافت اطلاعات…</p>:items.map(item=><article key={item.id}><div className="delivery-method-main"><b>{item.title}</b><small>{item.code} · {carrierLabels[item.carrier_type]||item.carrier_type} · {item.business_days_min} تا {item.business_days_max} روز کاری</small><small>تعرفه پایه: {money(item.cost,item.currency)} · پایان پذیرش: ساعت {String(item.cutoff_hour_local).padStart(2,"0")}:۰۰</small></div><div className="delivery-method-actions"><span className={item.enabled?"is-enabled":"is-disabled"}>{item.enabled?"فعال":"غیرفعال"}</span><button type="button" onClick={()=>void openProducts(item)}>تخصیص کالاها</button><button type="button" disabled={Boolean(busy)||busyId===item.id} onClick={()=>void toggle(item)}>{busyId===item.id?"در حال ثبت…":item.enabled?"غیرفعال‌سازی":"فعال‌سازی"}</button></div></article>)}
   {!loading&&!items.length&&<p className="empty">هنوز روش ارسالی ثبت نشده است.</p>}
  </section>

  {selectedMethod&&<section className="platform-panel delivery-product-rules"><header><div><h2>کالاهای مجاز برای «{selectedMethod.title}»</h2><p>فقط کالاهای انتخاب‌شده اجازه استفاده از این روش ارسال را خواهند داشت.</p></div><button type="button" onClick={()=>setSelectedMethod(null)}>بستن</button></header>
   {productsLoading?<p className="empty">در حال دریافت کالاها…</p>:products.length===0?<p className="empty">در این سازمان کالایی برای تخصیص وجود ندارد.</p>:<div className="delivery-product-grid">{products.map(product=><label key={product.id} className={product.enabled?"is-selected":""}><input type="checkbox" checked={product.enabled} onChange={()=>toggleProduct(product.id)}/><span><b>{product.title}</b><small>{product.sku}</small></span></label>)}</div>}
   <footer><span>{products.filter(p=>p.enabled).length.toLocaleString("fa-IR")} کالا انتخاب شده</span><button type="button" disabled={productsLoading||productsSaving} onClick={()=>void saveProducts()}>{productsSaving?"در حال ذخیره…":"ذخیره تخصیص کالاها"}</button></footer>
  </section>}
  <p className="shipping-footnote">استعلام قیمت نهایی بر اساس استان، شهر، وزن، ابعاد، فروشنده و قرارداد شرکت حمل در گام بعدی متصل می‌شود. تا آن زمان هیچ هزینه‌ای به مبلغ سفارش اضافه نمی‌شود.</p>
 </main>;
}
