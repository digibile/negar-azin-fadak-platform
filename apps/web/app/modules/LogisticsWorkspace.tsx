"use client";

import {useEffect,useMemo,useState} from "react";
import type {ReactNode} from "react";
import styles from "./LogisticsWorkspace.module.css";
import {ManagementDialog,ManagementToolbar} from "../components/ManagementWorkspaceTools";

type R=Record<string,any>;
const labels:Record<string,string>={
  plan_no:"شماره برنامه",status:"وضعیت",planned_date:"تاریخ برنامه",order_no:"شماره سفارش",
  origin:"مبدأ",destination:"مقصد",cargo_description:"شرح بار",quantity:"مقدار",
  requested_date:"تاریخ درخواست",shipment_no:"شماره مرسوله",tracking_code:"کد رهگیری",
  route_name:"مسیر",plate_no:"پلاک",driver_name:"راننده",title:"عنوان",vehicle_type:"نوع خودرو",
  capacity:"ظرفیت",name:"نام",mobile:"موبایل",license_no:"گواهینامه",license_expiry:"اعتبار گواهینامه",
  code:"کد",distance_km:"مسافت",description:"شرح",location:"موقعیت",occurred_at:"زمان",recipient_name:"تحویل‌گیرنده",province:"استان",city:"شهر",address_line:"نشانی",total_amount:"مبلغ سفارش",currency:"ارز",supply_status:"وضعیت تأمین",invoice_no:"شماره صورتحساب",invoice_date:"تاریخ صورتحساب",carrier_title:"شرکت حمل",subtotal:"مبلغ پایه",tax_amount:"مالیات",total_amount:"مبلغ کل",settled_amount:"پرداخت‌شده",original_amount:"مبلغ بدهی",payment_no:"شماره پرداخت",payment_date:"تاریخ پرداخت",payee_name:"دریافت‌کننده",document_no:"شماره سند"
};
const statusLabels:Record<string,string>={
  draft:"پیش‌نویس",approved:"تأییدشده",released:"آزادشده",closed:"بسته",cancelled:"لغوشده",
  submitted:"ثبت‌شده",assigned:"اختصاص‌یافته",shipped:"ارسال‌شده",delivered:"تحویل‌شده",
  planned:"برنامه‌ریزی‌شده",picked_up:"دریافت‌شده",in_transit:"در حال حمل",failed:"ناموفق",reserved:"رزروشده",consumed:"کسرشده از انبار",released:"آزادشده",verified:"تأییدشده",posted:"قطعی‌شده",partially_settled:"تسویه جزئی",settled:"تسویه کامل",pending:"در انتظار تأیید",paid:"پرداخت‌شده",void:"باطل‌شده"
};
const api=async(path:string,init:RequestInit={})=>{
  const method=(init.method||"GET").toUpperCase();
  const csrf=typeof document==="undefined"?"":decodeURIComponent(document.cookie.split("; ").find(x=>x.startsWith("naf_csrf="))?.split("=")[1]||"");
  const headers:Record<string,string>={"Content-Type":"application/json"};
  if(init.headers instanceof Headers)init.headers.forEach((value,key)=>{headers[key]=value});
  else if(Array.isArray(init.headers))init.headers.forEach(([key,value])=>{headers[key]=value});
  else Object.assign(headers,init.headers||{});
  if(method!=="GET"&&method!=="HEAD"&&method!=="OPTIONS"&&csrf)headers["X-CSRF-Token"]=csrf;
  const r=await fetch(path,{credentials:"include",...init,headers});
  const d=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(d.error||"خطا در سامانه");
  return d;
};
const fmt=(v:any)=>v===null||v===undefined||v===""?"":statusLabels[String(v)]||String(v);

export default function LogisticsWorkspace(){
  const [createOpen,setCreateOpen]=useState(false),[editing,setEditing]=useState<{kind:string;id:string}|null>(null),[tab,setTab]=useState("dashboard"),[o,setO]=useState<R>({}),[plans,setPlans]=useState<R[]>([]),[orders,setOrders]=useState<R[]>([]),
    [vehicles,setVehicles]=useState<R[]>([]),[drivers,setDrivers]=useState<R[]>([]),[routes,setRoutes]=useState<R[]>([]),
    [ships,setShips]=useState<R[]>([]),[marketOrders,setMarketOrders]=useState<R[]>([]),[warehouses,setWarehouses]=useState<R[]>([]),[fulfillment,setFulfillment]=useState<{id:string;orderNo:string;sourceWarehouseId:string}|null>(null),[reports,setReports]=useState<R>({}),[track,setTrack]=useState<R|null>(null),[error,setError]=useState(""),[carrierInvoices,setCarrierInvoices]=useState<R[]>([]),[carrierParties,setCarrierParties]=useState<R[]>([]),[carrierPayables,setCarrierPayables]=useState<R[]>([]),[carrierBooks,setCarrierBooks]=useState<R[]>([]),[carrierPeriods,setCarrierPeriods]=useState<R[]>([]),[carrierAccounts,setCarrierAccounts]=useState<R[]>([]),[carrierBanks,setCarrierBanks]=useState<R[]>([]),[carrierCashboxes,setCarrierCashboxes]=useState<R[]>([]),[carrierPayments,setCarrierPayments]=useState<R[]>([]),[activeCarrierInvoice,setActiveCarrierInvoice]=useState<R|null>(null);
  const [plan,setPlan]=useState({planNo:"",plannedDate:"",notes:""});
  const [order,setOrder]=useState({orderNo:"",planId:"",origin:"",destination:"",cargoDescription:"",quantity:"",requestedDate:"",notes:""});
  const [vehicle,setVehicle]=useState({plateNo:"",title:"",vehicleType:"",capacity:""});
  const [driver,setDriver]=useState({name:"",mobile:"",licenseNo:"",licenseExpiry:""});
  const [route,setRoute]=useState({code:"",name:"",origin:"",destination:"",distanceKm:""});
  const [ship,setShip]=useState({shipmentNo:"",supplyOrderId:"",origin:"",destination:"",trackingCode:"",routeId:"",vehicleId:"",driverId:""});
  const [delivery,setDelivery]=useState({location:"",description:""});
  const [carrierInvoiceForm,setCarrierInvoiceForm]=useState({carrierPartyId:"",invoiceNo:"",invoiceDate:new Date().toISOString().slice(0,10),currency:"IRR",subtotal:"",taxAmount:"0"});
  const [carrierAllocations,setCarrierAllocations]=useState([{shipmentId:"",amount:""}]);
  const [carrierAccountingForm,setCarrierAccountingForm]=useState({bookId:"",periodId:"",documentNo:"",expenseAccountId:"",payableAccountId:"",inputTaxAccountId:""});
  const [carrierPaymentForm,setCarrierPaymentForm]=useState({amount:"",paymentDate:new Date().toISOString().slice(0,10),bookId:"",periodId:"",documentNo:"",paymentNo:"",bankAccountId:"",cashboxId:"",referenceNo:""});
  const [loading,setLoading]=useState(false);

  const load=async()=>{
    setError("");setLoading(true);
    try{
      const [a,b,c,d,e,f,g,h,i,j,k,finance,treasury,accounting]=await Promise.all([
        api("/api/logistics/overview"),api("/api/logistics/plans"),api("/api/logistics/orders"),
        api("/api/logistics/vehicles"),api("/api/logistics/drivers"),api("/api/logistics/routes"),
        api("/api/logistics/shipments"),api("/api/logistics/reports"),api("/api/logistics/marketplace-orders/eligible"),api("/api/inventory/warehouses"),
        api("/api/logistics/carrier-invoices"),api("/api/accounting-finance/operations-overview"),api("/api/treasury-bank/overview"),api("/api/accounting-finance/overview")
      ]);
      setO(a);setPlans(b);setOrders(c);setVehicles(d);setDrivers(e);setRoutes(f);setShips(g);setReports(h);setMarketOrders(i);setWarehouses(j.filter((x:R)=>x.status==="active"));
      setCarrierInvoices(k.items||[]);setCarrierParties((finance.parties||[]).filter((x:R)=>x.party_type==="supplier"&&x.status==="active"));setCarrierPayables(finance.receivablesPayables||[]);
      setCarrierBooks((accounting.books||[]).filter((x:R)=>x.status==="active"));setCarrierPeriods(accounting.periods||[]);setCarrierAccounts(accounting.accounts||[]);
      setCarrierBanks((treasury.banks||[]).filter((x:R)=>x.status==="active"));setCarrierCashboxes((treasury.cashboxes||[]).filter((x:R)=>x.status==="active"));
      setCarrierInvoiceForm(v=>({...v,carrierPartyId:v.carrierPartyId||finance.parties?.find((x:R)=>x.party_type==="supplier"&&x.status==="active")?.id||""}));
      setCarrierAccountingForm(v=>({...v,bookId:v.bookId||accounting.books?.find((x:R)=>x.status==="active")?.id||"",periodId:v.periodId||accounting.periods?.find((x:R)=>x.status==="open")?.id||"",expenseAccountId:v.expenseAccountId||accounting.accounts?.find((x:R)=>["expense","cost"].includes(x.account_type))?.id||"",payableAccountId:v.payableAccountId||accounting.accounts?.find((x:R)=>["liability","payable","debt"].includes(x.account_type))?.id||"",inputTaxAccountId:v.inputTaxAccountId||accounting.accounts?.find((x:R)=>["asset","receivable"].includes(x.account_type))?.id||""}));
      setCarrierPaymentForm(v=>({...v,bookId:v.bookId||accounting.books?.find((x:R)=>x.status==="active")?.id||"",periodId:v.periodId||accounting.periods?.find((x:R)=>x.status==="open")?.id||"",bankAccountId:v.bankAccountId||treasury.banks?.find((x:R)=>x.status==="active")?.id||"",cashboxId:v.cashboxId||""}));
    }catch(e:any){setError(e.message)}finally{setLoading(false)}
  };
  useEffect(()=>{load()},[]);

  const post=async(path:string,body:any,method="POST")=>{
    try{await api(path,{method,body:JSON.stringify(body)});setCreateOpen(false);setEditing(null);await load()}
    catch(e:any){setError(e.message)}
  };
  const linkMarketplaceOrder=async()=>{
    if(!fulfillment)return;
    try{await api("/api/logistics/orders/from-marketplace/"+encodeURIComponent(fulfillment.id),{method:"POST",body:JSON.stringify({sourceWarehouseId:fulfillment.sourceWarehouseId})});setFulfillment(null);await load()}
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
    ["dashboard","داشبورد"],["plans","برنامه تأمین"],["orders","سفارش تأمین"],["storefront","سفارش‌های فروشگاه"],["shipments","حمل"],
    ["dispatch","ارسال و تحویل"],["carrierInvoices","صورتحساب شرکت حمل"],["vehicles","ناوگان"],["drivers","رانندگان"],["routes","مسیرها"],["tracking","رهگیری"],["reports","گزارش لجستیک"]
  ];
  const exportRows:R[]=tab==="storefront"?marketOrders:tab==="plans"?plans:tab==="orders"?orders:tab==="vehicles"?vehicles:tab==="drivers"?drivers:tab==="routes"?routes:tab==="shipments"||tab==="dispatch"||tab==="tracking"?ships:tab==="carrierInvoices"?carrierInvoices:tab==="reports"?[...(reports.byShipment||[]),...(reports.byVehicle||[]),...(reports.byRoute||[])]:[...plans,...orders,...ships];

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
    <ManagementToolbar rows={exportRows} filename={"logistics-"+tab} onCreate={["plans","orders","shipments","vehicles","drivers","routes"].includes(tab)?()=>{setEditing(null);if(tab==="plans")setPlan({planNo:"",plannedDate:"",notes:""});if(tab==="orders")setOrder({orderNo:"",planId:"",origin:"",destination:"",cargoDescription:"",quantity:"",requestedDate:"",notes:""});if(tab==="vehicles")setVehicle({plateNo:"",title:"",vehicleType:"",capacity:""});if(tab==="drivers")setDriver({name:"",mobile:"",licenseNo:"",licenseExpiry:""});if(tab==="routes")setRoute({code:"",name:"",origin:"",destination:"",distanceKm:""});if(tab==="shipments")setShip({shipmentNo:"",supplyOrderId:"",origin:"",destination:"",trackingCode:"",routeId:"",vehicleId:"",driverId:""});setCreateOpen(true)}:undefined} createLabel={tab==="plans"?"ایجاد برنامه تأمین":tab==="orders"?"ایجاد سفارش تأمین":tab==="shipments"?"ثبت حمل":tab==="carrierInvoices"?"ثبت صورتحساب حمل":tab==="vehicles"?"افزودن خودرو":tab==="drivers"?"افزودن راننده":"افزودن مسیر"}/>
    <nav>{tabs.map(([k,t])=><button className={tab===k?styles.active:""} key={k} onClick={()=>setTab(k)}>{t}</button>)}</nav>

    {tab==="dashboard"&&<section className={styles.cards}>
      {[
        ["برنامه آزادشده",o.plans?.released],["سفارش فعال",o.orders?.active],["حمل فعال",o.shipments?.active],
        ["تحویل‌شده",o.shipments?.delivered],["ناوگان آماده",o.vehicles?.available],["حمل ناموفق",o.shipments?.failed]
      ].map(([a,b])=><article key={String(a)}><small>{a}</small><strong>{b??0}</strong></article>)}
    </section>}

    {tab==="plans"&&<section className={styles.panel}>
      <h2>برنامه تأمین</h2>
      {createOpen&&tab==="plans"&&<ManagementDialog title={editing?.kind==="plans"?"ویرایش برنامه تأمین":"ایجاد برنامه تأمین"} dirty={Boolean(plan.planNo||plan.plannedDate||plan.notes)} onClose={()=>setCreateOpen(false)}><div className={styles.form}>
        <input placeholder="شماره برنامه" value={plan.planNo} onChange={e=>setPlan({...plan,planNo:e.target.value})}/>
        <input type="date" value={plan.plannedDate} onChange={e=>setPlan({...plan,plannedDate:e.target.value})}/>
        <input placeholder="یادداشت" value={plan.notes} onChange={e=>setPlan({...plan,notes:e.target.value})}/>
        <button onClick={()=>post(editing?.kind==="plans"?"/api/logistics/plans/"+editing.id:"/api/logistics/plans",plan,editing?.kind==="plans"?"PATCH":"POST")}>{editing?.kind==="plans"?"ذخیره تغییرات":"ثبت برنامه"}</button>
      </div></ManagementDialog>}
      <Table rows={plans} cols={["plan_no","status","planned_date","notes"]} action={(x:R)=><>{planAction(x)}<button onClick={()=>{setEditing({kind:"plans",id:x.id});setPlan({planNo:x.plan_no,plannedDate:String(x.planned_date||"").slice(0,10),notes:x.notes||""});setCreateOpen(true)}}>ویرایش</button></>}/>
    </section>}

    {tab==="orders"&&<section className={styles.panel}>
      <h2>سفارش تأمین</h2>
      {createOpen&&tab==="orders"&&<ManagementDialog title={editing?.kind==="orders"?"ویرایش سفارش تأمین":"ایجاد سفارش تأمین"} dirty={Boolean(order.orderNo||order.planId||order.origin||order.destination||order.cargoDescription||order.quantity||order.requestedDate||order.notes)} onClose={()=>setCreateOpen(false)}><div className={styles.form}>
        <input placeholder="شماره سفارش" value={order.orderNo} onChange={e=>setOrder({...order,orderNo:e.target.value})}/>
        <select value={order.planId} onChange={e=>setOrder({...order,planId:e.target.value})}><option value="">برنامه تأمین</option>{plans.filter(x=>["approved","released"].includes(x.status)).map(x=><option key={x.id} value={x.id}>{x.plan_no}</option>)}</select>
        <input placeholder="مبدأ" value={order.origin} onChange={e=>setOrder({...order,origin:e.target.value})}/>
        <input placeholder="مقصد" value={order.destination} onChange={e=>setOrder({...order,destination:e.target.value})}/>
        <input placeholder="شرح بار" value={order.cargoDescription} onChange={e=>setOrder({...order,cargoDescription:e.target.value})}/>
        <input type="number" min="0" placeholder="مقدار" value={order.quantity} onChange={e=>setOrder({...order,quantity:e.target.value})}/>
        <input type="date" value={order.requestedDate} onChange={e=>setOrder({...order,requestedDate:e.target.value})}/>
        <input placeholder="یادداشت" value={order.notes} onChange={e=>setOrder({...order,notes:e.target.value})}/>
        <button onClick={()=>post(editing?.kind==="orders"?"/api/logistics/orders/"+editing.id:"/api/logistics/orders",order,editing?.kind==="orders"?"PATCH":"POST")}>{editing?.kind==="orders"?"ذخیره تغییرات":"ثبت سفارش"}</button>
      </div></ManagementDialog>}
      <Table rows={orders} cols={["order_no","plan_no","status","origin","destination","quantity","requested_date"]} action={(x:R)=><>{orderAction(x)}{x.status==="draft"&&<button onClick={()=>{setEditing({kind:"orders",id:x.id});setOrder({orderNo:x.order_no,planId:x.plan_id||"",origin:x.origin,destination:x.destination,cargoDescription:x.cargo_description||"",quantity:String(x.quantity??""),requestedDate:String(x.requested_date||"").slice(0,10),notes:x.notes||""});setCreateOpen(true)}}>ویرایش</button>}</>}/>
    </section>}

    {tab==="storefront"&&<section className={styles.panel}>
      <h2>سفارش‌های پرداخت‌شده فروشگاه</h2>
      <p>فقط سفارش‌های پرداخت‌شده همین سازمان نمایش داده می‌شوند. ایجاد درخواست تأمین تکراری برای یک سفارش امکان‌پذیر نیست.</p>
      {fulfillment&&<ManagementDialog title={"ارجاع سفارش "+fulfillment.orderNo+" به لجستیک"} dirty={Boolean(fulfillment.sourceWarehouseId)} onClose={()=>setFulfillment(null)}>
        <div className={styles.form}>
          <select value={fulfillment.sourceWarehouseId} onChange={e=>setFulfillment({...fulfillment,sourceWarehouseId:e.target.value})}><option value="">انتخاب انبار مبدأ</option>{warehouses.map(x=><option key={x.id} value={x.id}>{x.name}{x.address?" · "+x.address:""}</option>)}</select>
          <button disabled={!fulfillment.sourceWarehouseId} onClick={linkMarketplaceOrder}>ایجاد درخواست تأمین</button>
        </div>
      </ManagementDialog>}
      <div className={styles.table}>{marketOrders.map(x=><div className={styles.row} key={x.id}>
        <span><b>شماره سفارش</b>{x.order_no}</span>
        <span><b>تحویل‌گیرنده</b>{x.recipient_name||"—"}</span>
        <span><b>مقصد</b>{[x.province,x.city,x.address_line].filter(Boolean).join("، ")||"نشانی ثبت نشده"}</span>
        <span><b>مبلغ</b>{x.total_amount??"—"} {x.currency||""}</span>
        <span><b>اقلام</b>{(x.items||[]).map((it:R)=>String(it.title)+" × "+String(it.quantity)).join("، ")||"—"}</span>
        <span><b>وضعیت تأمین</b>{x.supply_order_id?fmt(x.supply_status):"ارجاع نشده"}</span>
        <span><b>رزرو انبار</b>{(x.inventory_reservations||[]).length?(x.inventory_reservations||[]).map((r:R)=>fmt(r.status)).join("، "):"رزرو نشده"}</span>
        <span>{x.supply_order_id?<span>درخواست تأمین ثبت شده</span>:<button onClick={()=>setFulfillment({id:x.id,orderNo:x.order_no,sourceWarehouseId:""})}>ارجاع به لجستیک</button>}</span>
      </div>)}{!marketOrders.length&&<div className={styles.empty}>سفارش پرداخت‌شده‌ای برای ارجاع وجود ندارد.</div>}</div>
    </section>}

    {tab==="shipments"&&<section className={styles.panel}>
      <h2>حمل</h2>
      {createOpen&&tab==="shipments"&&<ManagementDialog title="ثبت حمل" dirty={Boolean(ship.shipmentNo||ship.supplyOrderId||ship.origin||ship.destination||ship.trackingCode||ship.routeId||ship.vehicleId||ship.driverId)} onClose={()=>setCreateOpen(false)}><div className={styles.form}>
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
      </div></ManagementDialog>}
      <Table rows={ships} cols={["shipment_no","order_no","status","tracking_code","origin","destination","route_name","plate_no","driver_name"]}/>
    </section>}

    {tab==="carrierInvoices"&&<section className={styles.panel}>
      <h2>صورتحساب شرکت‌های حمل</h2>
      <p>ثبت صورتحساب، تخصیص مبلغ به مرسوله‌ها، تأیید و اتصال به سند حسابداری و پرداخت خزانه</p>
      <ManagementDialog title="ثبت صورتحساب شرکت حمل" onClose={()=>setCreateOpen(false)} dirty={Boolean(carrierInvoiceForm.invoiceNo||carrierInvoiceForm.subtotal)}>
        {createOpen&&<div className={styles.form}>
          <select value={carrierInvoiceForm.carrierPartyId} onChange={e=>setCarrierInvoiceForm({...carrierInvoiceForm,carrierPartyId:e.target.value})}><option value="">شرکت حمل / طرف حساب تأمین‌کننده</option>{carrierParties.map(x=><option key={x.id} value={x.id}>{x.party_code} · {x.title}</option>)}</select>
          <input placeholder="شماره صورتحساب" value={carrierInvoiceForm.invoiceNo} onChange={e=>setCarrierInvoiceForm({...carrierInvoiceForm,invoiceNo:e.target.value})}/>
          <input type="date" value={carrierInvoiceForm.invoiceDate} onChange={e=>setCarrierInvoiceForm({...carrierInvoiceForm,invoiceDate:e.target.value})}/>
          <select value={carrierInvoiceForm.currency} onChange={e=>setCarrierInvoiceForm({...carrierInvoiceForm,currency:e.target.value})}><option value="IRR">ریال (IRR)</option><option value="USD">دلار (USD)</option><option value="EUR">یورو (EUR)</option></select>
          <input type="number" min="0" step="0.01" placeholder="مبلغ پایه" value={carrierInvoiceForm.subtotal} onChange={e=>setCarrierInvoiceForm({...carrierInvoiceForm,subtotal:e.target.value})}/>
          <input type="number" min="0" step="0.01" placeholder="مالیات" value={carrierInvoiceForm.taxAmount} onChange={e=>setCarrierInvoiceForm({...carrierInvoiceForm,taxAmount:e.target.value})}/>
          <div className={styles.full}><strong>تخصیص هزینه به مرسوله‌ها</strong>{carrierAllocations.map((x,i)=><div className={styles.form} key={i}>
            <select value={x.shipmentId} onChange={e=>setCarrierAllocations(rows=>rows.map((r,n)=>n===i?{...r,shipmentId:e.target.value}:r))}><option value="">انتخاب مرسوله</option>{ships.filter(s=>!["failed","cancelled"].includes(s.status)).map(s=><option key={s.id} value={s.id}>{s.shipment_no} · {s.order_no||"سفارش"} · {s.status}</option>)}</select>
            <input type="number" min="0.01" step="0.01" placeholder="مبلغ تخصیص" value={x.amount} onChange={e=>setCarrierAllocations(rows=>rows.map((r,n)=>n===i?{...r,amount:e.target.value}:r))}/>
            {carrierAllocations.length>1&&<button type="button" onClick={()=>setCarrierAllocations(rows=>rows.filter((_,n)=>n!==i))}>حذف ردیف</button>}
          </div>)}<button type="button" onClick={()=>setCarrierAllocations(rows=>[...rows,{shipmentId:"",amount:""}])}>افزودن مرسوله</button></div>
          <button disabled={!carrierInvoiceForm.carrierPartyId||!carrierInvoiceForm.invoiceNo||!carrierInvoiceForm.subtotal||carrierAllocations.some(x=>!x.shipmentId||!x.amount)} onClick={()=>post("/api/logistics/carrier-invoices",{...carrierInvoiceForm,subtotal:Number(carrierInvoiceForm.subtotal),taxAmount:Number(carrierInvoiceForm.taxAmount||0),allocations:carrierAllocations.map(x=>({shipmentId:x.shipmentId,amount:Number(x.amount)}))})}>ثبت صورتحساب</button>
        </div>}
      </ManagementDialog>
      <div className={styles.cards}>
        <article><small>کل صورتحساب‌ها</small><strong>{carrierInvoices.length}</strong></article>
        <article><small>در انتظار تأیید</small><strong>{carrierInvoices.filter(x=>x.status==="draft").length}</strong></article>
        <article><small>تأییدشده</small><strong>{carrierInvoices.filter(x=>x.status==="verified").length}</strong></article>
        <article><small>قطعی‌شده</small><strong>{carrierInvoices.filter(x=>x.status==="posted").length}</strong></article>
      </div>
      <div className={styles.form}><button onClick={()=>{setCarrierInvoiceForm(v=>({...v,invoiceNo:"",subtotal:"",taxAmount:"0"}));setCarrierAllocations([{shipmentId:"",amount:""}]);setCreateOpen(true)}}>ثبت صورتحساب جدید</button></div>
      <Table rows={carrierInvoices} cols={["invoice_no","invoice_date","carrier_title","total_amount","currency","status"]} action={(x:R)=><div className={styles.inlineAction}>
        {x.status==="draft"&&<button onClick={()=>post("/api/logistics/carrier-invoices/"+x.id+"/verify",{})}>تأیید صورتحساب</button>}
        {x.status==="verified"&&!x.accounting_document_id&&<button onClick={()=>{setActiveCarrierInvoice(x);setCarrierAccountingForm(v=>({...v,documentNo:""}))}}>ساخت سند حسابداری</button>}
        {x.status==="posted"&&<button onClick={async()=>{setActiveCarrierInvoice(x);try{const r=await api("/api/accounting-finance/carrier-invoices/"+x.id+"/payments");setCarrierPayments(r.items||[])}catch(e:any){setError(e.message)}}}>پرداخت و گردش</button>}
        <button onClick={()=>setActiveCarrierInvoice(x)}>جزئیات</button>
      </div>}/>
      {activeCarrierInvoice&&<ManagementDialog title={"صورتحساب "+activeCarrierInvoice.invoice_no} onClose={()=>setActiveCarrierInvoice(null)}>
        <div className={styles.cards}><article><small>شرکت حمل</small><strong>{activeCarrierInvoice.carrier_title}</strong></article><article><small>مبلغ کل</small><strong>{Number(activeCarrierInvoice.total_amount).toLocaleString("fa-IR")} {activeCarrierInvoice.currency}</strong></article><article><small>وضعیت</small><strong>{fmt(activeCarrierInvoice.status)}</strong></article></div>
        <h3>مرسوله‌های تخصیص‌یافته</h3><Table rows={activeCarrierInvoice.allocations||[]} cols={["shipmentNo","orderNo","allocatedAmount"]}/>
        {activeCarrierInvoice.status==="verified"&&!activeCarrierInvoice.accounting_document_id&&<div className={styles.form}>
          <h3>ساخت پیش‌نویس سند حسابداری</h3>
          <select value={carrierAccountingForm.bookId} onChange={e=>setCarrierAccountingForm({...carrierAccountingForm,bookId:e.target.value})}><option value="">دفتر حسابداری</option>{carrierBooks.map(x=><option key={x.id} value={x.id}>{x.code} · {x.title} · {x.currency}</option>)}</select>
          <select value={carrierAccountingForm.periodId} onChange={e=>setCarrierAccountingForm({...carrierAccountingForm,periodId:e.target.value})}><option value="">دوره مالی باز</option>{carrierPeriods.filter(x=>x.status==="open"&&x.book_id===carrierAccountingForm.bookId).map(x=><option key={x.id} value={x.id}>{x.code} · {x.title}</option>)}</select>
          <input placeholder="شماره سند" value={carrierAccountingForm.documentNo} onChange={e=>setCarrierAccountingForm({...carrierAccountingForm,documentNo:e.target.value})}/>
          <select value={carrierAccountingForm.expenseAccountId} onChange={e=>setCarrierAccountingForm({...carrierAccountingForm,expenseAccountId:e.target.value})}><option value="">حساب هزینه حمل</option>{carrierAccounts.filter(x=>["expense","cost"].includes(x.account_type)).map(x=><option key={x.id} value={x.id}>{x.code} · {x.name}</option>)}</select>
          <select value={carrierAccountingForm.payableAccountId} onChange={e=>setCarrierAccountingForm({...carrierAccountingForm,payableAccountId:e.target.value})}><option value="">حساب پرداختنی</option>{carrierAccounts.filter(x=>["liability","payable","debt"].includes(x.account_type)).map(x=><option key={x.id} value={x.id}>{x.code} · {x.name}</option>)}</select>
          {Number(activeCarrierInvoice.tax_amount)>0&&<select value={carrierAccountingForm.inputTaxAccountId} onChange={e=>setCarrierAccountingForm({...carrierAccountingForm,inputTaxAccountId:e.target.value})}><option value="">حساب مالیات خرید</option>{carrierAccounts.filter(x=>["asset","receivable"].includes(x.account_type)).map(x=><option key={x.id} value={x.id}>{x.code} · {x.name}</option>)}</select>}
          <button disabled={!carrierAccountingForm.bookId||!carrierAccountingForm.periodId||!carrierAccountingForm.documentNo||!carrierAccountingForm.payableAccountId||(Number(activeCarrierInvoice.subtotal)>0&&!carrierAccountingForm.expenseAccountId)||(Number(activeCarrierInvoice.tax_amount)>0&&!carrierAccountingForm.inputTaxAccountId)} onClick={()=>post("/api/logistics/carrier-invoices/"+activeCarrierInvoice.id+"/accounting-draft",carrierAccountingForm)}>ایجاد پیش‌نویس سند</button>
        </div>}
        {activeCarrierInvoice.status==="posted"&&<div className={styles.panel}>
          <h3>پرداخت‌های صورتحساب</h3>
          {(()=>{const payable=carrierPayables.find(p=>p.metadata?.carrierInvoiceId===activeCarrierInvoice.id);const remaining=payable?Number(payable.original_amount)-Number(payable.settled_amount):0;return <><p>مانده بدهی: {remaining.toLocaleString("fa-IR")} {activeCarrierInvoice.currency}</p>{remaining>0&&<div className={styles.form}>
            <input type="number" min="0.01" max={remaining} step="0.01" placeholder="مبلغ پرداخت" value={carrierPaymentForm.amount} onChange={e=>setCarrierPaymentForm({...carrierPaymentForm,amount:e.target.value})}/>
            <input type="date" value={carrierPaymentForm.paymentDate} onChange={e=>setCarrierPaymentForm({...carrierPaymentForm,paymentDate:e.target.value})}/>
            <select value={carrierPaymentForm.bookId} onChange={e=>setCarrierPaymentForm({...carrierPaymentForm,bookId:e.target.value})}><option value="">دفتر</option>{carrierBooks.map(x=><option key={x.id} value={x.id}>{x.title} · {x.currency}</option>)}</select>
            <select value={carrierPaymentForm.periodId} onChange={e=>setCarrierPaymentForm({...carrierPaymentForm,periodId:e.target.value})}><option value="">دوره باز</option>{carrierPeriods.filter(x=>x.status==="open"&&x.book_id===carrierPaymentForm.bookId).map(x=><option key={x.id} value={x.id}>{x.title}</option>)}</select>
            <input placeholder="شماره سند پرداخت" value={carrierPaymentForm.documentNo} onChange={e=>setCarrierPaymentForm({...carrierPaymentForm,documentNo:e.target.value})}/>
            <input placeholder="شماره پرداخت" value={carrierPaymentForm.paymentNo} onChange={e=>setCarrierPaymentForm({...carrierPaymentForm,paymentNo:e.target.value})}/>
            <select value={carrierPaymentForm.bankAccountId} onChange={e=>setCarrierPaymentForm({...carrierPaymentForm,bankAccountId:e.target.value,cashboxId:""})}><option value="">حساب بانکی</option>{carrierBanks.filter(x=>x.currency===activeCarrierInvoice.currency).map(x=><option key={x.id} value={x.id}>{x.bank_name} · {x.account_title} · مانده {Number(x.current_balance).toLocaleString("fa-IR")}</option>)}</select>
            <select value={carrierPaymentForm.cashboxId} onChange={e=>setCarrierPaymentForm({...carrierPaymentForm,cashboxId:e.target.value,bankAccountId:""})}><option value="">یا صندوق ریالی</option>{activeCarrierInvoice.currency==="IRR"&&carrierCashboxes.map(x=><option key={x.id} value={x.id}>{x.code} · {x.title} · مانده {Number(x.current_balance).toLocaleString("fa-IR")}</option>)}</select>
            <input placeholder="شماره مرجع" value={carrierPaymentForm.referenceNo} onChange={e=>setCarrierPaymentForm({...carrierPaymentForm,referenceNo:e.target.value})}/>
            <button disabled={!payable||!carrierPaymentForm.amount||Number(carrierPaymentForm.amount)<=0||Number(carrierPaymentForm.amount)>remaining||!carrierPaymentForm.documentNo||!carrierPaymentForm.paymentNo||!carrierPaymentForm.periodId||(!carrierPaymentForm.bankAccountId&&!carrierPaymentForm.cashboxId)} onClick={()=>post("/api/accounting-finance/carrier-invoices/"+activeCarrierInvoice.id+"/payments",{...carrierPaymentForm,payableId:payable.id,amount:Number(carrierPaymentForm.amount)})}>ثبت درخواست پرداخت</button>
          </div>}</>})()}
          <div className={styles.recordList}>{carrierPayments.map(x=><article className={styles.card} key={x.id}><strong>{x.payment_no} · {fmt(x.status)}</strong><small>{x.payment_date} · {x.document_no||"بدون سند"}</small><b>{Number(x.amount).toLocaleString("fa-IR")}</b></article>)}</div>
        </div>}
      </ManagementDialog>}
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
      {createOpen&&tab==="vehicles"&&<ManagementDialog title={editing?.kind==="vehicles"?"ویرایش خودرو":"افزودن خودرو"} dirty={Boolean(vehicle.plateNo||vehicle.title||vehicle.vehicleType||vehicle.capacity)} onClose={()=>setCreateOpen(false)}><div className={styles.form}><input placeholder="پلاک" value={vehicle.plateNo} onChange={e=>setVehicle({...vehicle,plateNo:e.target.value})}/><input placeholder="عنوان" value={vehicle.title} onChange={e=>setVehicle({...vehicle,title:e.target.value})}/><input placeholder="نوع خودرو" value={vehicle.vehicleType} onChange={e=>setVehicle({...vehicle,vehicleType:e.target.value})}/><input type="number" min="0" placeholder="ظرفیت" value={vehicle.capacity} onChange={e=>setVehicle({...vehicle,capacity:e.target.value})}/><button onClick={()=>post(editing?.kind==="vehicles"?"/api/logistics/vehicles/"+editing.id:"/api/logistics/vehicles",vehicle,editing?.kind==="vehicles"?"PATCH":"POST")}>{editing?.kind==="vehicles"?"ذخیره تغییرات":"ثبت خودرو"}</button></div></ManagementDialog>}
      <Table rows={vehicles} cols={["plate_no","title","vehicle_type","capacity","status"]} action={(x:R)=><button disabled={x.status==="assigned"} onClick={()=>{setEditing({kind:"vehicles",id:x.id});setVehicle({plateNo:x.plate_no,title:x.title,vehicleType:x.vehicle_type||"",capacity:String(x.capacity??"")});setCreateOpen(true)}}>ویرایش</button>}/>
    </section>}

    {tab==="drivers"&&<section className={styles.panel}>
      <h2>رانندگان</h2>
      {createOpen&&tab==="drivers"&&<ManagementDialog title={editing?.kind==="drivers"?"ویرایش راننده":"افزودن راننده"} dirty={Boolean(driver.name||driver.mobile||driver.licenseNo||driver.licenseExpiry)} onClose={()=>setCreateOpen(false)}><div className={styles.form}><input placeholder="نام راننده" value={driver.name} onChange={e=>setDriver({...driver,name:e.target.value})}/><input placeholder="موبایل" value={driver.mobile} onChange={e=>setDriver({...driver,mobile:e.target.value})}/><input placeholder="شماره گواهینامه" value={driver.licenseNo} onChange={e=>setDriver({...driver,licenseNo:e.target.value})}/><input type="date" value={driver.licenseExpiry} onChange={e=>setDriver({...driver,licenseExpiry:e.target.value})}/><button onClick={()=>post(editing?.kind==="drivers"?"/api/logistics/drivers/"+editing.id:"/api/logistics/drivers",driver,editing?.kind==="drivers"?"PATCH":"POST")}>{editing?.kind==="drivers"?"ذخیره تغییرات":"ثبت راننده"}</button></div></ManagementDialog>}
      <Table rows={drivers} cols={["name","mobile","license_no","license_expiry","status"]} action={(x:R)=><button onClick={()=>{setEditing({kind:"drivers",id:x.id});setDriver({name:x.name,mobile:x.mobile||"",licenseNo:x.license_no||"",licenseExpiry:String(x.license_expiry||"").slice(0,10)});setCreateOpen(true)}}>ویرایش</button>}/>
    </section>}

    {tab==="routes"&&<section className={styles.panel}>
      <h2>مسیرها</h2>
      {createOpen&&tab==="routes"&&<ManagementDialog title={editing?.kind==="routes"?"ویرایش مسیر":"افزودن مسیر"} dirty={Boolean(route.code||route.name||route.origin||route.destination||route.distanceKm)} onClose={()=>setCreateOpen(false)}><div className={styles.form}><input placeholder="کد مسیر" value={route.code} onChange={e=>setRoute({...route,code:e.target.value})}/><input placeholder="نام مسیر" value={route.name} onChange={e=>setRoute({...route,name:e.target.value})}/><input placeholder="مبدأ" value={route.origin} onChange={e=>setRoute({...route,origin:e.target.value})}/><input placeholder="مقصد" value={route.destination} onChange={e=>setRoute({...route,destination:e.target.value})}/><input type="number" min="0" placeholder="مسافت کیلومتر" value={route.distanceKm} onChange={e=>setRoute({...route,distanceKm:e.target.value})}/><button onClick={()=>post(editing?.kind==="routes"?"/api/logistics/routes/"+editing.id:"/api/logistics/routes",route,editing?.kind==="routes"?"PATCH":"POST")}>{editing?.kind==="routes"?"ذخیره تغییرات":"ثبت مسیر"}</button></div></ManagementDialog>}
      <Table rows={routes} cols={["code","name","origin","destination","distance_km","status"]} action={(x:R)=><button onClick={()=>{setEditing({kind:"routes",id:x.id});setRoute({code:x.code,name:x.name,origin:x.origin||"",destination:x.destination||"",distanceKm:String(x.distance_km??"")});setCreateOpen(true)}}>ویرایش</button>}/>
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
  const [selected,setSelected]=useState<R|null>(null);
  return <><div className={styles.table}>{rows.map(x=><div className={styles.row} key={String(x.id||JSON.stringify(x))}>
    {cols.map(c=><span key={c}><b>{labels[c]||c}</b>{fmt(x[c])}</span>)}<span><button type="button" onClick={()=>setSelected(x)}>مشاهده</button>{action&&action(x)}</span>
  </div>)}{!rows.length&&<div className={styles.empty}>داده‌ای ثبت نشده است.</div>}</div>{selected&&<ManagementDialog title="جزئیات عملیات لجستیک" onClose={()=>setSelected(null)}><dl className="management-detail-grid">{Object.entries(selected).map(([key,value])=><div key={key}><dt>{labels[key]||key}</dt><dd>{value===null||value===undefined?"—":typeof value==="object"?JSON.stringify(value):fmt(value)}</dd></div>)}</dl></ManagementDialog>}</>;
}