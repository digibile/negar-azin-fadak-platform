"use client";

import {useEffect,useState} from "react";
import {api} from "../../../lib/api";
import {ManagementToolbar} from "../../components/ManagementWorkspaceTools";
import "./returns-workspace.css";

type ReturnItem={id:string;request_no:string;order_no:string;order_id:string;product_title:string;requested_quantity:number|string;reason_code:string;description:string;status:string;decision_reason?:string|null;created_at:string;customer_ref:string};
const labels:Record<string,string>={submitted:"در انتظار بررسی",approved:"تأییدشده",rejected:"ردشده",received:"دریافت‌شده",inspected:"بازرسی‌شده",cancelled:"لغوشده",closed:"بسته‌شده"};
const reasons:Record<string,string>={damaged:"آسیب‌دیده",defective:"ایراد فنی",wrong_item:"کالای اشتباه",not_as_described:"مغایرت توضیحات",missing_parts:"اقلام ناقص",changed_mind:"انصراف از خرید",other:"سایر"};
export default function MarketplaceReturnsPage(){
 const [items,setItems]=useState<ReturnItem[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(""),[busy,setBusy]=useState("");
 async function load(){setLoading(true);try{const d=await api<{items:ReturnItem[]}>("/api/marketplace/returns");setItems(d.items||[]);setError("");}catch(e){setError(e instanceof Error?e.message:"دریافت درخواست‌های مرجوعی ناموفق بود");}finally{setLoading(false);}}
 useEffect(()=>{void load()},[]);
 async function transition(item:ReturnItem,status:string){let decisionReason="";if(status==="rejected"){decisionReason=window.prompt("دلیل رد درخواست را ثبت کنید:","")||"";if(!decisionReason.trim())return;}setBusy(item.id);setError("");try{await api("/api/marketplace/returns/"+encodeURIComponent(item.id)+"/status",{method:"PATCH",body:JSON.stringify({status,decisionReason})});await load();}catch(e){setError(e instanceof Error?e.message:"تغییر وضعیت درخواست ناموفق بود");}finally{setBusy("");}}
 return <main className="enterprise-main mp-returns-admin" dir="rtl">
  <header className="platform-header"><div><span className="section-kicker">مدیریت سفارش و خدمات پس از فروش</span><h1>درخواست‌های مرجوعی</h1><p>بررسی درخواست مشتری، تأیید دریافت کالا، بازرسی و بستن پرونده. بازپرداخت وجه از گردش مالی مستقل انجام می‌شود.</p></div><a href="/marketplace/orders">مدیریت سفارش‌ها</a></header>
  <ManagementToolbar rows={items as unknown as Record<string,unknown>[]} filename="marketplace-return-requests"/>
  {error&&<p className="enterprise-loading error" role="alert">{error}</p>}
  <section className="platform-panel mp-returns-panel"><div className="mp-returns-summary"><b>{items.length.toLocaleString("fa-IR")} درخواست</b><span>{items.filter(x=>x.status==="submitted").length.toLocaleString("fa-IR")} مورد در انتظار بررسی</span></div>
   <div className="mp-returns-list">{items.map(item=><article className="mp-return-card" key={item.id}>
    <div className="mp-return-head"><div><b>{item.request_no}</b><small>سفارش {item.order_no} · {item.product_title}</small></div><span className={"status-"+item.status}>{labels[item.status]||item.status}</span></div>
    <div className="mp-return-details"><span>تعداد: <b>{Number(item.requested_quantity).toLocaleString("fa-IR")}</b></span><span>دلیل: <b>{reasons[item.reason_code]||item.reason_code}</b></span><span>ثبت: <b>{new Date(item.created_at).toLocaleString("fa-IR")}</b></span></div>
    {item.description&&<p>{item.description}</p>}{item.decision_reason&&<p className="mp-return-decision">یادداشت بررسی: {item.decision_reason}</p>}
    <div className="mp-return-actions">{item.status==="submitted"&&<><button type="button" disabled={busy===item.id} onClick={()=>transition(item,"approved")}>تأیید درخواست</button><button type="button" className="danger" disabled={busy===item.id} onClick={()=>transition(item,"rejected")}>رد درخواست</button></>}{item.status==="approved"&&<button type="button" disabled={busy===item.id} onClick={()=>transition(item,"received")}>ثبت دریافت کالا</button>}{item.status==="received"&&<button type="button" disabled={busy===item.id} onClick={()=>transition(item,"inspected")}>تأیید بازرسی</button>}{item.status==="inspected"&&<button type="button" disabled={busy===item.id} onClick={()=>transition(item,"closed")}>بستن پرونده</button>}</div>
   </article>)}</div>
   {!items.length&&<div className="enterprise-loading">{loading?"در حال دریافت درخواست‌ها…":"درخواستی ثبت نشده است."}</div>}
  </section>
 </main>;
}
