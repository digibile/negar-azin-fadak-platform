"use client";

import {useEffect,useMemo,useState} from "react";
import type {ReactNode} from "react";
import styles from "./LogisticsWorkspace.module.css";

type R=Record<string,any>;
const labels:Record<string,string>={
  plan_no:"شماره برنامه",status:"وضعیت",planned_date:"تاریخ برنامه",order_no:"شماره سفارش",
  origin:"مبدأ",destination:"مقصد",cargo_description:"شرح بار",quantity:"مقدار",
  requested_date:"تاریخ درخواست",shipment_no:"شماره مرسوله",tracking_code:"کد رهگیری",
  route_name:"مسیر",plate_no:"پلاک",driver_name:"راننده",title:"عنوان",vehicle_type:"نوع خودرو",
  capacity:"ظرفیت",name:"نام",mobile:"موبایل",license_no:"گواهینامه",license_expiry:"اعتبار گواهینامه",
  code:"کد",distance_km:"مسافت",description:"شرح",location:"موقعیت",occurred_at:"زمان"
};
const statusLabels:Record<string,string>={
  draft:"پیش‌نویس",approved:"تأییدشده",released:"آزادشده",closed:"بسته",cancelled:"لغوشده",
  submitted:"ثبت‌شده",assigned:"اختصاص‌یافته",shipped:"ارسال‌شده",delivered:"تحویل‌شده",
  planned:"برنامه‌ریزی‌شده",picked_up:"دریافت‌شده",in_transit:"در حال حمل",failed:"ناموفق"
};
const api=async(path:string,init:RequestInit={})=>{
  const method=(init.method||"GET").toUpperCase();
  const csrf=typeof document==="undefined"?"":decodeURIComponent(document.cookie.split("; ").find(x=>x.startsWith("naf_csrf="))?.split("=")[1]||"");
  const headers:HeadersInit={"Content-Type":"application/json",...(init.headers||{})};
  if(method!=="GET"&&method!=="HEAD"&&method!=="OPTIONS"&&csrf)headers["X-CSRF-Token"]=csrf;
  const r=await fetch(path,{credentials:"include",...init,headers});
  const d=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(d.error||"خطا در سامانه");
  return d;
};
const fmt=(v:any)=>v===null||v===undefined||v===""?"":statusLabels[String(v)]||String(v);

export default function LogisticsWorkspace(){
  const [tab,setTab]=useState("dashboard"),[o,setO]=useState<R>({}),[plans,setPlans]=useState<R[]>([]),[orders,setOrders]=useState<R[]>([]),
    [vehicles,setVehicles]=useState<R[]>([]),[drivers,setDrivers]=useState<R[]>([]),[routes,setRoutes]=useState<R[]>([]),
    [ships,setShips]=useState<R[]>([]),[reports,setReports]=useState<R>({}),[track,setTrack]=useState<R|null>(null),[error,setError]=useState("");
  const [plan,setPlan]=useState({planNo:"",plannedDate:"",notes:""});
  const [order,setOrder]=useState({orderNo:"",planId:"",origin:"",destination:"",cargoDescription:"",quantity:"",requestedDate:"",notes:""});
  const [vehicle,setVehicle]=useState({plateNo:"",title:"",vehicleType:"",capacity:""});
  const [driver,setDriver]=useState({name:"",mobile:"",licenseNo:"",licenseExpiry:""});
  const [route,setRoute]=useState({code:"",name:"",origin:"",destination:"",distanceKm:""});
  const [ship,setShip]=useState({shipmentNo:"",supplyOrderId:"",origin:"",destination:"",trackingCode:"",routeId:"",vehicleId:"",driverId:""});
  const [delivery,setDelivery]=useState({location:"",description:""});
  const [loading,setLoading]=useState(false);

  const load=async()=>{
    setError("");setLoading(true);
    try{
      const [a,b,c,d,e,f,g,h]=await Promise.all([
        api("/api/logistics/overview"),api("/api/logistics/plans"),api("/api/logistics/orders"),
        api("/api/logistics/vehicles"),api("/api/logistics/drivers"),api("/api/logistics/routes"),
        api("/api/logistics/shipments"),api("/api/logistics/reports")
      ]);
      setO(a);setPlans(b);setOrders(c);setVehicles(d);setDrivers(e);setRoutes(f);setShips(g);setReports(h);
    }catch(e:any){setError(e.message)}finally{setLoading(false)}
  };
  useEffect(()=>{load()},[]);

  const post=async(path:string,body:any)=>{
    try{await api(path,{method:"POST",body:JSON.stringify(body)});await load()}
    catch(e:any){setError(e.message)}
  };
  const patch=async(path:string,body:any)=>{
    try{await api(path,{method:"PATCH",body:JSON.stringify(body)});await load()}
    catch(e:any){setError(e.message)}
  };
  const approvedOrders=useMemo(()=>orders.filter(x=>["approved","assigned"].includes(x.status)),[orders]);
  const availableVehicles=useMemo(()=>vehicles.filter(x=>x.status==="available"),[vehicles]);
  const activeDrivers=useMemo(()=>drivers.filter(x=>x.status==="active"&&(!x.license_expiry||new Date(x.license_expiry)>=new Date())),[drivers]);
  const tabs=[
    ["dashboard","داشبورد"],["plans","برنامه تأمین"],["orders","سفارش تأمین"],["shipments","حمل"],
    ["dispatch","ارسال و تحویل"],["vehicles","ناوگان"],["drivers","رانندگان"],["routes","مسیرها"],["tracking","رهگیری"],["reports","گزارش لجستیک"]
  ];

  const planAction=(x:R)=>{
    const next:xstatus[]=[];
    if(x.status==="draft")next.push(["approved","تأیید"]);
    if(x.status==="approved")next.push(["released","آزادسازی"]);
    if(x.status==="released")next.push(["closed","بستن"]);
    if(["draft","approved"].includes(x.status))next.push(["cancelled","لغو"]);
    return <>{next.map(([s,t])=><button key={s} onClick={()=>patch("/api/logistics/plans/"+x.id+"/status",{status:s})}>{t}</button>)}</>;
  };
  const orderAction=(x:R)=>{
    const next:xstatus[]=[];
    if(x.status==="draft")next.push(["submitted","ارسال برای بررسی"]);
    if(x.status==="submitted")next.push(["approved","تأیید"]);
    if(x.status==="approved")next.push(["cancelled","لغو"]);
    if(x.status==="assigned")next.push(["cancelled","لغو"]);
    if(x.status==="shipped")next.push(["cancelled","لغو"]);
    return <>{next.map(([s,t])=><button key={s} onClick={()=>patch("/api/logistics/orders/"+x.id+"/status",{status:s})}>{t}</button>)}</>;
  };

  return <main className={styles.page} dir="rtl">
    <header>
      <div><small>هسته مرکزی کسب‌وکار · منوی ۱۲</small><h1>زنجیره تأمین و لجستیک</h1><p>برنامه تأمین، سفارش، حمل، ناوگان، تحویل و رهگیری در یک گردش واقعی</p></div>
      <button onClick={load} disabled={loading}>{loading?"در حال دریافت...":"بازخوانی داده‌ها"}</button>
    </header>
    {error&&<div className={styles.error}>{error}</div>}
    <nav>{tabs.map(([k,t])=><button className={tab===k?styles.active:""} key={k} onClick={()=>setTab(k)}>{t}</button>)}</nav>

    {tab==="dashboard"&&<section className={styles.cards}>
      {[
        ["برنامه آزادشده",o.plans?.released],["سفارش فعال",o.orders?.active],["حمل فعال",o.shipments?.active],
        ["تحویل‌شده",o.shipments?.delivered],["ناوگان آماده",o.vehicles?.available],["حمل ناموفق",o.shipments?.failed]
      ].map(([a,b])=><article key={String(a)}><small>{a}</small><strong>{b??0}</strong></article>)}
    </section>}

    {tab==="plans"&&<section className={styles.panel}>
      <h2>برنامه تأمین</h2>
      <div className={styles.form}>
        <input placeholder="شماره برنامه" value={plan.planNo} onChange={e=>setPlan({...plan,planNo:e.target.value})}/>
        <input type="date" value={plan.plannedDate} onChange={e=>setPlan({...plan,plannedDate:e.target.value})}/>
        <input placeholder="یادداشت" value={plan.notes} onChange={e=>setPlan({...plan,notes:e.target.value})}/>
        <button onClick={()=>post("/api/logistics/plans",plan)}>ثبت برنامه</button>
      </div>
      <Table rows={plans} cols={["plan_no","status","planned_date","notes"]} action={planAction}/>
    </section>}

    {tab==="orders"&&<section className={styles.panel}>
      <h2>سفارش تأمین</h2>
      <div className={styles.form}>
        <input placeholder="شماره سفارش" value={order.orderNo} onChange={e=>setOrder({...order,orderNo:e.target.value})}/>
        <select value={order.planId} onChange={e=>setOrder({...order,planId:e.target.value})}><option value="">برنامه تأمین</option>{plans.filter(x=>["approved","released"].includes(x.status)).map(x=><option key={x.id} value={x.id}>{x.plan_no}</option>)}</select>
        <input placeholder="مبدأ" value={order.origin} onChange={e=>setOrder({...order,origin:e.target.value})}/>
        <input placeholder="مقصد" value={order.destination} onChange={e=>setOrder({...order,destination:e.target.value})}/>
        <input placeholder="شرح بار" value={order.cargoDescription} onChange={e=>setOrder({...order,cargoDescription:e.target.value})}/>
        <input type="number" min="0" placeholder="مقدار" value={order.quantity} onChange={e=>setOrder({...order,quantity:e.target.value})}/>
        <input type="date" value={order.requestedDate} onChange={e=>setOrder({...order,requestedDate:e.target.value})}/>
        <input placeholder="یادداشت" value={order.notes} onChange={e=>setOrder({...order,notes:e.target.value})}/>
        <button onClick={()=>post("/api/logistics/orders",order)}>ثبت سفارش</button>
      </div>
      <Table rows={orders} cols={["order_no","plan_no","status","origin","destination","quantity","requested_date"]} action={orderAction}/>
    </section>}

    {tab==="shipments"&&<section className={styles.panel}>
      <h2>حمل</h2>
      <div className={styles.form}>
        <input placeholder="شماره مرسوله" value={ship.shipmentNo} onChange={e=>setShip({...ship,shipmentNo:e.target.value})}/>
        <select value={ship.supplyOrderId} onChange={e=>{
          const id=e.target.value,x=orders.find(v=>v.id===id);
          setShip({...ship,supplyOrderId:id,origin:x?.origin||ship.origin,destination:x?.destination||ship.destination});
        }}><option value="">سفارش تأمین</option>{approvedOrders.map(x=><option key={x.id} value={x.id}>{x.order_no} · {x.origin} ← {x.destination}</option>)}</select>
        <input placeholder="مبدأ" value={ship.origin} onChange={e=>setShip({...ship,origin:e.target.value})}/>
        <input placeholder="مقصد" value={ship.destination} onChange={e=>setShip({...ship,destination:e.target.value})}/>
        <input placeholder="کد رهگیری" value={ship.trackingCode} onChange={e=>setShip({...ship,trackingCode:e.target.value})}/>
        <select value={ship.routeId} onChange={e=>setShip({...ship,routeId:e.target.value})}><option value="">مسیر</option>{routes.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select>
        <select value={ship.vehicleId} onChange={e=>setShip({...ship,vehicleId:e.target.value})}><option value="">ناوگان</option>{availableVehicles.map(x=><option key={x.id} value={x.id}>{x.title} · {x.plate_no}</option>)}</select>
        <select value={ship.driverId} onChange={e=>setShip({...ship,driverId:e.target.value})}><option value="">راننده</option>{activeDrivers.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select>
        <button onClick={()=>post("/api/logistics/shipments",ship)}>ثبت حمل</button>
      </div>
      <Table rows={ships} cols={["shipment_no","order_no","status","tracking_code","origin","destination","route_name","plate_no","driver_name"]}/>
    </section>}

    {tab==="dispatch"&&<section className={styles.panel}>
      <h2>ارسال و تحویل</h2>
      <Table rows={ships} cols={["shipment_no","order_no","status","tracking_code","route_name","plate_no","driver_name"]}
        action={(x:R)=>{
          if(x.status==="planned")return <button onClick={()=>patch("/api/logistics/shipments/"+x.id+"/status",{status:"assigned"})}>اختصاص</button>;
          if(x.status==="assigned")return <button onClick={()=>patch("/api/logistics/shipments/"+x.id+"/status",{status:"picked_up"})}>دریافت بار</button>;
          if(x.status==="picked_up")return <button onClick={()=>patch("/api/logistics/shipments/"+x.id+"/status",{status:"in_transit"})}>شروع حمل</button>;
          if(x.status==="in_transit")return <span className={styles.inlineAction}><input placeholder="محل تحویل" value={delivery.location} onChange={e=>setDelivery({...delivery,location:e.target.value})}/><button onClick={()=>patch("/api/logistics/shipments/"+x.id+"/status",{status:"delivered",location:delivery.location,description:delivery.description})}>ثبت تحویل</button></span>;
          return null;
        }}/>
    </section>}

    {tab==="vehicles"&&<section className={styles.panel}>
      <h2>ناوگان</h2>
      <div className={styles.form}><input placeholder="پلاک" value={vehicle.plateNo} onChange={e=>setVehicle({...vehicle,plateNo:e.target.value})}/><input placeholder="عنوان" value={vehicle.title} onChange={e=>setVehicle({...vehicle,title:e.target.value})}/><input placeholder="نوع خودرو" value={vehicle.vehicleType} onChange={e=>setVehicle({...vehicle,vehicleType:e.target.value})}/><input type="number" min="0" placeholder="ظرفیت" value={vehicle.capacity} onChange={e=>setVehicle({...vehicle,capacity:e.target.value})}/><button onClick={()=>post("/api/logistics/vehicles",vehicle)}>ثبت خودرو</button></div>
      <Table rows={vehicles} cols={["plate_no","title","vehicle_type","capacity","status"]}/>
    </section>}

    {tab==="drivers"&&<section className={styles.panel}>
      <h2>رانندگان</h2>
      <div className={styles.form}><input placeholder="نام راننده" value={driver.name} onChange={e=>setDriver({...driver,name:e.target.value})}/><input placeholder="موبایل" value={driver.mobile} onChange={e=>setDriver({...driver,mobile:e.target.value})}/><input placeholder="شماره گواهینامه" value={driver.licenseNo} onChange={e=>setDriver({...driver,licenseNo:e.target.value})}/><input type="date" value={driver.licenseExpiry} onChange={e=>setDriver({...driver,licenseExpiry:e.target.value})}/><button onClick={()=>post("/api/logistics/drivers",driver)}>ثبت راننده</button></div>
      <Table rows={drivers} cols={["name","mobile","license_no","license_expiry","status"]}/>
    </section>}

    {tab==="routes"&&<section className={styles.panel}>
      <h2>مسیرها</h2>
      <div className={styles.form}><input placeholder="کد مسیر" value={route.code} onChange={e=>setRoute({...route,code:e.target.value})}/><input placeholder="نام مسیر" value={route.name} onChange={e=>setRoute({...route,name:e.target.value})}/><input placeholder="مبدأ" value={route.origin} onChange={e=>setRoute({...route,origin:e.target.value})}/><input placeholder="مقصد" value={route.destination} onChange={e=>setRoute({...route,destination:e.target.value})}/><input type="number" min="0" placeholder="مسافت کیلومتر" value={route.distanceKm} onChange={e=>setRoute({...route,distanceKm:e.target.value})}/><button onClick={()=>post("/api/logistics/routes",route)}>ثبت مسیر</button></div>
      <Table rows={routes} cols={["code","name","origin","destination","distance_km","status"]}/>
    </section>}

    {tab==="tracking"&&<section className={styles.panel}>
      <h2>رهگیری</h2>
      <select onChange={async e=>{if(!e.target.value){setTrack(null);return}try{setTrack(await api("/api/logistics/shipments/"+e.target.value+"/tracking"))}catch(x:any){setError(x.message)}}}>
        <option value="">انتخاب مرسوله</option>{ships.map(x=><option key={x.id} value={x.id}>{x.shipment_no} · {x.tracking_code||"بدون کد"}</option>)}
      </select>
      {track&&<><div className={styles.cards}><article><small>مرسوله</small><strong>{track.shipment?.shipment_no}</strong></article><article><small>وضعیت</small><strong>{fmt(track.shipment?.status)}</strong></article><article><small>رهگیری</small><strong>{track.shipment?.tracking_code||"—"}</strong></article></div><Table rows={track.events||[]} cols={["status","location","description","occurred_at"]}/></>}
    </section>}

    {tab==="reports"&&<section className={styles.panel}>
      <h2>گزارش لجستیک</h2>
      <h3>وضعیت حمل</h3><Table rows={reports.byShipment||[]} cols={["status","total"]}/>
      <h3>عملکرد ناوگان</h3><Table rows={reports.byVehicle||[]} cols={["plate_no","title","shipments","delivered"]}/>
      <h3>عملکرد مسیرها</h3><Table rows={reports.byRoute||[]} cols={["code","name","shipments","delivered"]}/>
    </section>}
  </main>;
}

type xstatus=[string,string];
function Table({rows,cols,action}:{rows:R[];cols:string[];action?:(x:R)=>ReactNode}){
  return <div className={styles.table}>{rows.map(x=><div className={styles.row} key={String(x.id||JSON.stringify(x))}>
    {cols.map(c=><span key={c}><b>{labels[c]||c}</b>{fmt(x[c])}</span>)}{action&&<span>{action(x)}</span>}
  </div>)}{!rows.length&&<div className={styles.empty}>داده‌ای ثبت نشده است.</div>}</div>;
}