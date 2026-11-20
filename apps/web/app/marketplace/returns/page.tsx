"use client";

import {useEffect,useState} from "react";
import {api} from "../../../lib/api";
import {ManagementToolbar} from "../../components/ManagementWorkspaceTools";
import "./returns-workspace.css";

type ReturnItem={id:string;request_no:string;order_no:string;order_id:string;product_title:string;requested_quantity:number|string;received_quantity?:number|string;restock_quantity?:number|string;inspection_result?:string|null;inspection_notes?:string|null;inspection_warehouse_id?:string|null;inventory_receipt_document_id?:string|null;reason_code:string;description:string;status:string;decision_reason?:string|null;created_at:string;customer_ref:string;refund_status?:string|null;refund_amount?:number|string|null;refund_no?:string|null};\ntype Warehouse={id:string;name:string;status:string};
const labels:Record<string,string>={submitted:"در انتظار بررسی",approved:"تأییدشده",rejected:"ردشده",received:"دریافت‌شده",inspected:"بازرسی‌شده",cancelled:"لغوشده",closed:"بسته‌شده"};
const reasons:Record<string,string>={damaged:"آسیب‌دیده",defective:"ایراد فنی",wrong_item:"کالای اشتباه",not_as_described:"مغایرت توضیحات",missing_parts:"اقلام ناقص",changed_mind:"انصراف از خرید",other:"سایر"};
export default function MarketplaceReturnsPage(){
 const [items,setItems]=useState<ReturnItem[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(""),[busy,setBusy]=useState(""),[inspection,setInspection]=useState<ReturnItem|null>(null),[warehouses,setWarehouses]=useState<Warehouse[]>([]),[inspectionForm,setInspectionForm]=useState({warehouseId:"",receivedQuantity:"1",restockQuantity:"1",inspectionNotes:""});
 async function load(){setLoading(true);try{const d=await api<{items:ReturnItem[]}>("/api/marketplace/returns");setItems(d.items||[]);setError("");}catch(e){setError(e instanceof Error?e.message:"دریافت درخواست‌های مرجوعی ناموفق بود");}finally{setLoading(false);}}
 useEffect(()=>{void load()},[]);
 async function transition(item:ReturnItem,status:string){let decisionReason="";if(status==="rejected"){decisionReason=window.prompt("دلیل رد درخواست را ثبت کنید:","")||"";if(!decisionReason.trim())return;}setBusy(item.id);setError("");try{await api("/api/marketplace/returns/"+encodeURIComponent(item.id)+"/status",{method:"PATCH",body:JSON.stringify({status,decisionReason})});await load();}catch(e){setError(e instanceof Error?e.message:"تغییر وضعیت درخواست ناموفق بود");}finally{setBusy("");}}
 async function openInspection(item:ReturnItem){setBusy(item.id);setError("");try{const d=await api<Warehouse[]>("/api/inventory/warehouses");const active=(Array.isArray(d)?d:[]).filter(w=>w.status==="active");setWarehouses(active);if(!active.length)throw new Error("برای دریافت مرجوعی، انبار فعال ثبت نشده است");const qty=String(Number(item.requested_quantity));setInspectionForm({warehouseId:active[0].id,receivedQuantity:qty,restockQuantity:qty,inspectionNotes:""});setInspection(item);}catch(e){setError(e instanceof Error?e.message:"دریافت فهرست انبارها ناموفق بود");}finally{setBusy("");}}
 async function submitInspection(){if(!inspection)return;setBusy(inspection.id);setError("");try{await api("/api/marketplace/returns/"+encodeURIComponent(inspection.id)+"/inspect",{method:"POST",body:JSON.stringify({warehouseId:inspectionForm.warehouseId,receivedQuantity:Number(inspectionForm.receivedQuantity),restockQuantity:Number(inspectionForm.restockQuantity),inspectionNotes:inspectionForm.inspectionNotes})});setInspection(null);await load();}catch(e){setError(e instanceof Error?e.message:"ثبت بازرسی و رسید انبار ناموفق بود");}finally{setBusy("");}}
 async function refund(item:ReturnItem){if(!window.confirm("مبلغ مرجوعی بر اساس تعداد تأییدشده و قیمت ثبت‌شده قلم سفارش محاسبه و از مسیر درگاه بازپرداخت می‌شود. ادامه می‌دهید؟"))return;setBusy(item.id);setError("");try{await api("/api/marketplace/returns/"+encodeURIComponent(item.id)+"/refund",{method:"POST",body:JSON.stringify({})});await load();}catch(e){setError(e instanceof Error?e.message:"ثبت بازپرداخت ناموفق بود");await load();}finally{setBusy("");}}
 return <main className="enterprise-main mp-returns-admin" dir="rtl">
  <header className="platform-header"><div><span className="section-kicker">مدیریت سفارش و خدمات پس از فروش</span><h1>درخواست‌های مرجوعی</h1><p>بررسی درخواست مشتری، دریافت و بازرسی کالا و بازپرداخت مبلغ تأییدشده از همان پرداخت و دفترکل مرکزی.</p></div><a href="/marketplace/orders">مدیریت سفارش‌ها</a></header>
  <ManagementToolbar rows={items as unknown as Record<string,unknown>[]} filename="marketplace-return-requests"/>
  {error&&<p className="enterprise-loading error" role="alert">{error}</p>}
  <section className="platform-panel mp-returns-panel"><div className="mp-returns-summary"><b>{items.length.toLocaleString("fa-IR")} درخواست</b><span>{items.filter(x=>x.status==="submitted").length.toLocaleString("fa-IR")} مورد در انتظار بررسی</span></div>
   <div className="mp-returns-list">{items.map(item=><article className="mp-return-card" key={item.id}>
    <div className="mp-return-head"><div><b>{item.request_no}</b><small>سفارش {item.order_no} · {item.product_title}</small></div><span className={"status-"+item.status}>{labels[item.status]||item.status}</span></div>
    <div className="mp-return-details"><span>تعداد: <b>{Number(item.requested_quantity).toLocaleString("fa-IR")}</b></span><span>دلیل: <b>{reasons[item.reason_code]||item.reason_code}</b></span><span>ثبت: <b>{new Date(item.created_at).toLocaleString("fa-IR")}</b></span></div>
    {item.description&&<p>{item.description}</p>}{item.decision_reason&&<p className="mp-return-decision">یادداشت بررسی: {item.decision_reason}</p>}
    {item.refund_status&&<p className="mp-return-decision">وضعیت بازپرداخت: <b>{item.refund_status==="refunded"?"بازپرداخت تأییدشده":item.refund_status==="pending"?"در انتظار پاسخ درگاه":"ناموفق، نیازمند تطبیق مالی"}</b>{item.refund_amount&&<> · مبلغ: {Number(item.refund_amount).toLocaleString("fa-IR")}</>}</p>}
    <div className="mp-return-actions">{item.status==="submitted"&&<><button type="button" disabled={busy===item.id} onClick={()=>transition(item,"approved")}>تأیید درخواست</button><button type="button" className="danger" disabled={busy===item.id} onClick={()=>transition(item,"rejected")}>رد درخواست</button></>}{item.status==="approved"&&<button type="button" disabled={busy===item.id} onClick={()=>transition(item,"received")}>ثبت دریافت کالا</button>}{item.status==="received"&&<button type="button" disabled={busy===item.id} onClick={()=>openInspection(item)}>ثبت بازرسی و رسید انبار</button>}{item.status==="inspected"&&!item.refund_status&&<button type="button" disabled={busy===item.id} onClick={()=>refund(item)}>ثبت و اجرای بازپرداخت</button>}</div>
   </article>)}</div>
   {!items.length&&<div className="enterprise-loading">{loading?"در حال دریافت درخواست‌ها…":"درخواستی ثبت نشده است."}</div>}
  </section>

  {inspection&&<div className="mp-return-inspection-backdrop" role="presentation"><section className="mp-return-inspection-dialog" role="dialog" aria-modal="true" aria-labelledby="mp-return-inspection-title">
   <h2 id="mp-return-inspection-title">بازرسی و دریافت مرجوعی</h2><p>{inspection.request_no} · {inspection.product_title}</p>
   <label>انبار دریافت<select value={inspectionForm.warehouseId} onChange={e=>setInspectionForm(v=>({...v,warehouseId:e.target.value}))}>{warehouses.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select></label>
   <label>تعداد دریافت‌شده<input type="number" min="0.001" max={Number(inspection.requested_quantity)} step="0.001" value={inspectionForm.receivedQuantity} onChange={e=>setInspectionForm(v=>({...v,receivedQuantity:e.target.value,restockQuantity:String(Math.min(Number(v.restockQuantity),Number(e.target.value)||0))}))}/></label>
   <label>تعداد سالم و قابل بازگشت به موجودی<input type="number" min="0" max={Number(inspectionForm.receivedQuantity)} step="0.001" value={inspectionForm.restockQuantity} onChange={e=>setInspectionForm(v=>({...v,restockQuantity:e.target.value}))}/></label>
   <label>یادداشت بازرسی<textarea rows={3} value={inspectionForm.inspectionNotes} onChange={e=>setInspectionForm(v=>({...v,inspectionNotes:e.target.value}))} placeholder="شرح وضعیت کالا، آسیب یا نقص"/></label>
   <p className="mp-return-inspection-note">فقط تعداد سالم پس از ثبت رسید به موجودی قابل فروش افزوده می‌شود. مقدار آسیب‌دیده یا غیرقابل فروش وارد موجودی آزاد نخواهد شد.</p>
   <div className="mp-return-actions"><button type="button" disabled={busy===inspection.id||!inspectionForm.warehouseId||Number(inspectionForm.receivedQuantity)<=0||Number(inspectionForm.receivedQuantity)>Number(inspection.requested_quantity)||Number(inspectionForm.restockQuantity)<0||Number(inspectionForm.restockQuantity)>Number(inspectionForm.receivedQuantity)} onClick={()=>submitInspection()}>ثبت بازرسی و رسید</button><button type="button" className="danger" disabled={busy===inspection.id} onClick={()=>setInspection(null)}>انصراف</button></div>
  </section></div>}

 </main>;
}
