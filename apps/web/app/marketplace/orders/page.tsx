"use client";
import {useEffect,useState} from "react";
import {api} from "../../../lib/api";
import {ManagementDialog,ManagementToolbar} from "../../components/ManagementWorkspaceTools";
type Order={id:string;order_no:string;customer_ref?:string|null;total_amount:string|number;currency?:string;status:string;[key:string]:unknown};
const nextStatus:Record<string,string>={pending:"confirmed",confirmed:"paid",paid:"processing",processing:"shipped",shipped:"delivered",delivered:"returned",returned:"refunded"};
const labels:Record<string,string>={order_no:"شماره سفارش",customer_ref:"شناسه مشتری",total_amount:"مبلغ کل",currency:"ارز",status:"وضعیت",created_at:"تاریخ ثبت",updated_at:"آخرین تغییر"};
export default function OrdersPage(){
 const [items,setItems]=useState<Order[]>([]),[error,setError]=useState(""),[selected,setSelected]=useState<Order|null>(null);
 async function load(){try{const r=await api<{items:Order[]}>("/api/marketplace/orders");setItems(r.items||[])}catch(e){setError(e instanceof Error?e.message:"خطا در دریافت سفارش‌ها")}}
 useEffect(()=>{void load()},[]);
 async function move(id:string,status:string){try{await api("/api/marketplace/orders/"+encodeURIComponent(id)+"/status",{method:"PATCH",body:JSON.stringify({status})});await load()}catch(e){setError(e instanceof Error?e.message:"تغییر وضعیت سفارش ناموفق بود")}}
 return <main className="enterprise-main" dir="rtl">
  <header className="platform-header"><div><span className="section-kicker">عملیات تجارت</span><h1>سفارش‌ها</h1><p>چرخه وضعیت کنترل‌شده و ثبت ممیزی</p></div><a href="/platform">مرکز عملیات</a></header>
  <ManagementToolbar rows={items as unknown as Record<string,unknown>[]} filename="marketplace-orders"/>
  <section className="platform-panel">{error&&<p className="enterprise-loading error" role="alert">{error}</p>}
   {items.map(x=><div className="platform-row" key={x.id}><div><b>{x.order_no}</b><small>{x.customer_ref||"مشتری ثبت نشده"} · {x.total_amount} {x.currency}</small></div><strong>{x.status}</strong><div className="record-actions"><button type="button" onClick={()=>setSelected(x)}>مشاهده</button>{nextStatus[x.status]&&<button type="button" onClick={()=>move(x.id,nextStatus[x.status])}>مرحله بعد</button>}</div></div>)}
   {!items.length&&<p className="empty">سفارشی ثبت نشده است.</p>}
  </section>
  {selected&&<ManagementDialog title={"جزئیات سفارش "+selected.order_no} onClose={()=>setSelected(null)}><dl className="management-detail-grid">{Object.entries(selected).filter(([key])=>key!=="id").map(([key,value])=><div key={key}><dt>{labels[key]||key}</dt><dd>{value===null||value===undefined?"—":typeof value==="object"?JSON.stringify(value):String(value)}</dd></div>)}</dl></ManagementDialog>}
 </main>;
}