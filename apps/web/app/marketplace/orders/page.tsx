"use client";

import {useCallback,useEffect,useState} from "react";
import {api} from "../../../lib/api";
import "./orders-workspace.css";

type Order= {
 id:string;
 order_no:string;
 customer_ref?:string|null;
 seller_name?:string|null;
 total_amount:string|number;
 currency:string;
 status:string;
 created_at?:string|null;
 updated_at?:string|null;
 latest_return_id?:string|null;
 latest_return_status?:string|null;
};

const labels:Record<string,string>={
 pending:"در انتظار تأیید",
 confirmed:"تأییدشده",
 paid:"پرداخت‌شده",
 processing:"در حال آماده‌سازی",
 shipped:"ارسال‌شده",
 delivered:"تحویل‌شده",
 returned:"مرجوع‌شده",
 cancelled:"لغوشده",
 refunded:"بازپرداخت‌شده"
};

// Payment and refund statuses are intentionally excluded from manual actions.
// They must be written by the payment/refund provider workflow, not by an operator button.
const actions:Record<string,Array<{status:string;label:string;reason?:boolean;danger?:boolean}>>={
 pending:[{status:"confirmed",label:"تأیید سفارش"},{status:"cancelled",label:"لغو سفارش",reason:true,danger:true}],
 confirmed:[{status:"cancelled",label:"لغو سفارش",reason:true,danger:true}],
 paid:[{status:"processing",label:"شروع آماده‌سازی"}],
 processing:[{status:"shipped",label:"ثبت ارسال"},{status:"return_request",label:"درخواست مرجوعی",reason:true,danger:true}],
 shipped:[{status:"delivered",label:"ثبت تحویل"},{status:"return_request",label:"درخواست مرجوعی",reason:true,danger:true}],
 delivered:[{status:"return_request",label:"درخواست مرجوعی",reason:true,danger:true}]
};

const money=(value:string|number,currency:string)=>Number(value||0).toLocaleString("fa-IR")+" "+(currency==="IRR"?"ریال":currency);
const date=(value?:string|null)=>value?new Date(value).toLocaleString("fa-IR"):"-";

export default function OrdersPage(){
 const [items,setItems]=useState<Order[]>([]);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const [loading,setLoading]=useState(true);
 const [busyId,setBusyId]=useState("");
 const [filter,setFilter]=useState("all");

 const load=useCallback(async()=>{
  setLoading(true);setError("");
  try{
   const result=await api<{items:Order[]}>("/api/marketplace/orders");
   setItems(result.items||[]);
  }catch(e){
   setError(e instanceof Error?e.message:"دریافت سفارش‌ها ناموفق بود.");
  }finally{setLoading(false);}
 },[]);

 useEffect(()=>{void load();},[load]);

 async function move(order:Order,next:string,needsReason:boolean){
  let reason="";
  if(needsReason){
   const answer=window.prompt(next==="cancelled"?"علت لغو سفارش را وارد کنید:":"علت مرجوعی سفارش را وارد کنید:");
   if(answer===null)return;
   reason=answer.trim();
   if(!reason){setError("ثبت علت برای این عملیات الزامی است.");return;}
  }else if(!window.confirm("وضعیت سفارش "+order.order_no+" تغییر کند؟")){
   return;
  }
  setBusyId(order.id);setError("");setNotice("");
  try{
   if(next==="cancelled"){
    await api("/api/marketplace/orders/"+encodeURIComponent(order.id)+"/cancel",{
     method:"POST",
     body:JSON.stringify({reason})
    });
   }else if(next==="return_request"){
    await api("/api/marketplace/orders/"+encodeURIComponent(order.id)+"/returns",{
     method:"POST",
     body:JSON.stringify({reason})
    });
   }else if(next.startsWith("return_")){
    if(!order.latest_return_id)throw new Error("پرونده مرجوعی سفارش پیدا نشد.");
    const statusMap:Record<string,string>={return_approve:"approved",return_receive:"received",return_accept:"accepted",return_reject:"rejected"};
    await api("/api/marketplace/returns/"+encodeURIComponent(order.latest_return_id)+"/status",{
     method:"PATCH",
     body:JSON.stringify({status:statusMap[next],...(reason?{reason}:{})})
    });
   }else{
    await api("/api/marketplace/orders/"+encodeURIComponent(order.id)+"/status",{
     method:"PATCH",
     body:JSON.stringify({status:next,...(reason?{reason}:{})})
    });
   }
   setNotice("وضعیت سفارش "+order.order_no+" به‌روزرسانی شد.");
   await load();
  }catch(e){
   setError(e instanceof Error?e.message:"تغییر وضعیت سفارش ناموفق بود.");
  }finally{setBusyId("");}
 }

 const filtered=filter==="all"?items:items.filter(x=>x.status===filter);
 const count=(status:string)=>items.filter(x=>x.status===status).length;
 return <main className="enterprise-main" dir="rtl">
  <header className="platform-header">
   <div><span className="section-kicker">عملیات تجارت</span><h1>مدیریت سفارش‌ها</h1><p>چرخه سفارش، ثبت ممیزی و تفکیک وضعیت پرداخت از عملیات ارسال</p></div>
   <button type="button" onClick={()=>void load()} disabled={loading}>بازخوانی سفارش‌ها</button>
  </header>
  {error&&<p className="enterprise-loading error" role="alert">{error}</p>}
  {notice&&<p className="enterprise-loading" role="status">{notice}</p>}
  <section className="platform-panel">
   <div className="platform-order-summary">
    <span>همه سفارش‌ها <b>{items.length.toLocaleString("fa-IR")}</b></span>
    <span>در انتظار <b>{count("pending").toLocaleString("fa-IR")}</b></span>
    <span>در حال آماده‌سازی <b>{count("processing").toLocaleString("fa-IR")}</b></span>
    <span>ارسال‌شده <b>{count("shipped").toLocaleString("fa-IR")}</b></span>
   </div>
   <div className="platform-order-filter">
    <label htmlFor="order-status-filter">نمایش وضعیت</label>
    <select id="order-status-filter" value={filter} onChange={e=>setFilter(e.target.value)}>
     <option value="all">همه سفارش‌ها</option>
     {Object.entries(labels).map(([key,label])=><option key={key} value={key}>{label}</option>)}
    </select>
   </div>
   {loading?<p className="empty">در حال دریافت سفارش‌ها…</p>:filtered.map(order=><article className="platform-row platform-order-row" key={order.id}>
    <div className="platform-order-main">
     <b>{order.order_no}</b>
     <small>{order.customer_ref||"مشتری ثبت نشده"} · {date(order.created_at)}</small>
     {order.seller_name&&<small>فروشنده: {order.seller_name}</small>}
     {order.latest_return_status&&<small>پرونده مرجوعی: {({requested:"درخواست‌شده",approved:"تأییدشده",received:"دریافت‌شده",accepted:"بازرسی و تأییدشده",rejected:"ردشده"} as Record<string,string>)[order.latest_return_status]||order.latest_return_status}</small>}
     <strong>{money(order.total_amount,order.currency)}</strong>
    </div>
    <div className="platform-order-state"><span className={"platform-order-badge status-"+order.status}>{labels[order.status]||order.status}</span><small>آخرین تغییر: {date(order.updated_at)}</small></div>
    <div className="platform-actions">
     {(order.latest_return_status?({requested:[{status:"return_approve",label:"تأیید مرجوعی"},{status:"return_reject",label:"رد درخواست",reason:true,danger:true}],approved:[{status:"return_receive",label:"ثبت دریافت کالا"}],received:[{status:"return_accept",label:"تأیید بازرسی و ورود موجودی"},{status:"return_reject",label:"رد پس از بازرسی",reason:true,danger:true}]} as Record<string,Array<{status:string;label:string;reason?:boolean;danger?:boolean}>>)[order.latest_return_status]||[]:(actions[order.status]||[])).map(action=><button
      type="button"
      key={action.status}
      disabled={busyId===order.id}
      className={action.danger?"platform-order-danger":""}
      onClick={()=>void move(order,action.status,Boolean(action.reason))}
     >{busyId===order.id?"در حال ثبت…":action.label}</button>)}
     {order.status==="refunded"&&<small>بازپرداخت باید از چرخه مالی تأیید شود.</small>}
     {order.status==="cancelled"&&<small>این سفارش لغو شده است.</small>}
    </div>
   </article>)}
   {!loading&&!filtered.length&&<p className="empty">سفارشی با این وضعیت وجود ندارد.</p>}
  </section>
  <p className="platform-order-footnote">تأیید پرداخت و بازپرداخت در این صفحه قابل ثبت دستی نیست. این وضعیت‌ها باید از رویداد معتبر درگاه و چرخه مالی به‌روزرسانی شوند. انتقال‌های نامعتبر نیز در سرویس سمت سرور رد می‌شوند.</p>
 </main>;
}
