"use client";

import {useCallback,useEffect,useState} from "react";
import Link from "next/link";
import {api} from "../../../../lib/api";
import "../shipping-workspace.css";
import "./resources-workspace.css";

type Vehicle={id:string;title:string;plate_no:string;vehicle_type?:string|null;capacity?:number;status:string};
type Driver={id:string;name:string;mobile?:string|null;license_no?:string|null;license_expiry?:string|null;status:string};

const vehicleStatus:Record<string,string>={available:"آماده",assigned:"در مأموریت",maintenance:"تعمیرگاه",inactive:"غیرفعال"};
const driverStatus:Record<string,string>={active:"فعال",inactive:"غیرفعال",suspended:"تعلیق‌شده"};

export default function ShippingResourcesPage(){
 const [vehicles,setVehicles]=useState<Vehicle[]>([]);
 const [drivers,setDrivers]=useState<Driver[]>([]);
 const [vehicle,setVehicle]=useState({plateNo:"",title:"",vehicleType:"",capacity:""});
 const [driver,setDriver]=useState({name:"",mobile:"",licenseNo:"",licenseExpiry:""});
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[busyId,setBusyId]=useState("");
 const [error,setError]=useState(""),[notice,setNotice]=useState("");

 const load=useCallback(async()=>{
  setLoading(true);setError("");
  try{
   const [v,d]=await Promise.all([api<Vehicle[]>("/api/logistics/vehicles"),api<Driver[]>("/api/logistics/drivers")]);
   setVehicles(v||[]);setDrivers(d||[]);
  }catch(e){setError(e instanceof Error?e.message:"دریافت اطلاعات ناوگان و رانندگان ناموفق بود.");}
  finally{setLoading(false);}
 },[]);
 useEffect(()=>{void load();},[load]);

 async function addVehicle(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();setBusy(true);setError("");setNotice("");
  try{
   await api("/api/logistics/vehicles",{method:"POST",body:JSON.stringify({...vehicle,capacity:Number(vehicle.capacity||0)})});
   setVehicle({plateNo:"",title:"",vehicleType:"",capacity:""});setNotice("خودرو به ناوگان اضافه شد.");await load();
  }catch(e){setError(e instanceof Error?e.message:"ثبت خودرو ناموفق بود.");}
  finally{setBusy(false);}
 }
 async function changeStatus(kind:"vehicles"|"drivers",id:string,status:string){
  setBusyId(id);setError("");setNotice("");
  try{
   await api("/api/logistics/"+kind+"/"+encodeURIComponent(id)+"/status",{method:"PATCH",body:JSON.stringify({status})});
   setNotice(kind==="vehicles"?"وضعیت خودرو به‌روزرسانی شد.":"وضعیت راننده به‌روزرسانی شد.");await load();
  }catch(e){setError(e instanceof Error?e.message:"تغییر وضعیت ناموفق بود.");}
  finally{setBusyId("");}
 }
 async function addDriver(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();setBusy(true);setError("");setNotice("");
  try{
   await api("/api/logistics/drivers",{method:"POST",body:JSON.stringify(driver)});
   setDriver({name:"",mobile:"",licenseNo:"",licenseExpiry:""});setNotice("راننده ثبت شد.");await load();
  }catch(e){setError(e instanceof Error?e.message:"ثبت راننده ناموفق بود.");}
  finally{setBusy(false);}
 }

 return <main className="enterprise-main shipping-workspace resource-workspace" dir="rtl">
  <header className="platform-header shipping-header">
   <div><span className="section-kicker">تجارت · زنجیره تأمین و لجستیک</span><h1>مدیریت ناوگان و رانندگان</h1><p>ثبت اطلاعات پایه برای تخصیص مرسوله‌ها و کنترل اعتبار راننده</p></div>
   <div className="resource-header-actions"><Link href="/marketplace/shipping">بازگشت به ارسال‌ها</Link><button type="button" onClick={()=>void load()} disabled={loading}>بازخوانی</button></div>
  </header>
  {error&&<p className="shipping-message error" role="alert">{error}</p>}
  {notice&&<p className="shipping-message success" role="status">{notice}</p>}
  <section className="resource-forms">
   <form className="platform-panel resource-form" onSubmit={addVehicle}>
    <h2>ثبت خودروی جدید</h2><p>پلاک باید در محدوده سازمان یکتا باشد.</p>
    <label>عنوان خودرو<input required value={vehicle.title} onChange={e=>setVehicle(p=>({...p,title:e.target.value}))} placeholder="مثلاً کامیونت ایسوزو"/></label>
    <label>شماره پلاک<input required value={vehicle.plateNo} onChange={e=>setVehicle(p=>({...p,plateNo:e.target.value}))} placeholder="۱۲ الف ۳۴۵ ایران ۶۷"/></label>
    <label>نوع خودرو<input value={vehicle.vehicleType} onChange={e=>setVehicle(p=>({...p,vehicleType:e.target.value}))} placeholder="وانت، کامیون، موتورسیکلت…"/></label>
    <label>ظرفیت<input type="number" min="0" step="0.001" value={vehicle.capacity} onChange={e=>setVehicle(p=>({...p,capacity:e.target.value}))} placeholder="ظرفیت عددی"/></label>
    <button type="submit" disabled={busy}>{busy?"در حال ثبت…":"ثبت خودرو"}</button>
   </form>
   <form className="platform-panel resource-form" onSubmit={addDriver}>
    <h2>ثبت راننده جدید</h2><p>راننده با وضعیت فعال برای تخصیص مرسوله قابل انتخاب است.</p>
    <label>نام و نام خانوادگی<input required value={driver.name} onChange={e=>setDriver(p=>({...p,name:e.target.value}))} placeholder="نام راننده"/></label>
    <label>شماره همراه<input inputMode="tel" value={driver.mobile} onChange={e=>setDriver(p=>({...p,mobile:e.target.value}))} placeholder="09…"/></label>
    <label>شماره گواهینامه<input value={driver.licenseNo} onChange={e=>setDriver(p=>({...p,licenseNo:e.target.value}))} placeholder="شماره گواهینامه"/></label>
    <label>تاریخ اعتبار گواهینامه<input type="date" value={driver.licenseExpiry} onChange={e=>setDriver(p=>({...p,licenseExpiry:e.target.value}))}/></label>
    <button type="submit" disabled={busy}>{busy?"در حال ثبت…":"ثبت راننده"}</button>
   </form>
  </section>
  <section className="resource-lists">
   <div className="platform-panel resource-list"><div className="resource-list-heading"><h2>ناوگان ثبت‌شده</h2><b>{vehicles.length.toLocaleString("fa-IR")}</b></div>
    {loading?<p className="empty">در حال دریافت…</p>:vehicles.map(v=><article key={v.id}><div><b>{v.title}</b><small>{v.plate_no} · {v.vehicle_type||"نوع ثبت نشده"}</small></div><div className="resource-row-actions"><span className={"resource-status "+v.status}>{vehicleStatus[v.status]||v.status}</span>{v.status==="available"&&<button type="button" disabled={busy||busyId===v.id} onClick={()=>void changeStatus("vehicles",v.id,"maintenance")}>ارسال به تعمیرگاه</button>}{v.status==="maintenance"&&<button type="button" disabled={Boolean(busy)} onClick={()=>void changeStatus("vehicles",v.id,"available")}>بازگشت به سرویس</button>}{v.status==="inactive"&&<button type="button" disabled={Boolean(busy)} onClick={()=>void changeStatus("vehicles",v.id,"available")}>فعال‌سازی</button>}{v.status==="available"&&<button type="button" disabled={Boolean(busy)} onClick={()=>void changeStatus("vehicles",v.id,"inactive")}>غیرفعال‌سازی</button>}</div></article>)}
    {!loading&&!vehicles.length&&<p className="empty">خودرویی ثبت نشده است.</p>}
   </div>
   <div className="platform-panel resource-list"><div className="resource-list-heading"><h2>رانندگان ثبت‌شده</h2><b>{drivers.length.toLocaleString("fa-IR")}</b></div>
    {loading?<p className="empty">در حال دریافت…</p>:drivers.map(d=><article key={d.id}><div><b>{d.name}</b><small>{d.mobile||"همراه ثبت نشده"} · گواهینامه: {d.license_no||"ثبت نشده"}</small></div><div className="resource-row-actions"><span className={"resource-status "+d.status}>{driverStatus[d.status]||d.status}</span>{d.status==="active"&&<button type="button" disabled={busy||busyId===d.id} onClick={()=>void changeStatus("drivers",d.id,"suspended")}>تعلیق</button>}{d.status==="active"&&<button type="button" disabled={Boolean(busy)} onClick={()=>void changeStatus("drivers",d.id,"inactive")}>غیرفعال‌سازی</button>}{d.status!=="active"&&<button type="button" disabled={Boolean(busy)} onClick={()=>void changeStatus("drivers",d.id,"active")}>فعال‌سازی</button>}</div></article>)}
    {!loading&&!drivers.length&&<p className="empty">راننده‌ای ثبت نشده است.</p>}
   </div>
  </section>
  <p className="shipping-footnote">در این مرحله ثبت و مشاهده اطلاعات ناوگان و راننده فعال است. تغییر وضعیت، حذف یا ویرایش رکوردهای موجود تا زمان تعریف گردش‌کار و مجوز مستقل، در این صفحه ارائه نشده است.</p>
 </main>;
}
