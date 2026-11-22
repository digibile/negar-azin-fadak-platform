"use client";

import Link from "next/link";
import {useCallback,useEffect,useState} from "react";
import {api} from "../../../lib/api";

type RefundItem={
 id:string;refund_no:string;order_id:string;payment_id:string;amount:string|number;reason:string|null;
 status:string;provider_code:string;provider_transaction_id:string|null;provider_refund_transaction_id:string|null;
 provider_idempotency_key:string|null;provider_attempt_count:number;provider_last_attempt_at:string|null;
 provider_last_status:string|null;provider_last_error:string|null;provider_claimed_at:string|null;
 created_at:string;updated_at:string;order_no:string;order_status:string;payment_no:string;payment_status:string;
};

const money=(value:string|number)=>Number(value||0).toLocaleString("fa-IR");
const date=(value:string|null)=>value?new Date(value).toLocaleString("fa-IR",{dateStyle:"short",timeStyle:"short"}):"—";

export default function RefundReconciliationPage(){
 const [items,setItems]=useState<RefundItem[]>([]);
 const [loading,setLoading]=useState(true);
 const [refreshing,setRefreshing]=useState(false);
 const [active,setActive]=useState("");
 const [notice,setNotice]=useState("");
 const [error,setError]=useState("");

 const load=useCallback(async(showSpinner=true)=>{
  if(showSpinner)setLoading(true);else setRefreshing(true);
  setError("");
  try{const result=await api<{items:RefundItem[]}>("/api/marketplace/refunds/reconciliation?limit=100");setItems(result.items||[]);}
  catch(e){setError(e instanceof Error?e.message:"دریافت درخواست‌های بازپرداخت ناموفق بود");}
  finally{setLoading(false);setRefreshing(false);}
 },[]);

 useEffect(()=>{void load();},[load]);

 async function reconcile(item:RefundItem){
  setActive(item.id);setNotice("");setError("");
  try{
   const result=await api<any>("/api/marketplace/refunds/"+encodeURIComponent(item.id)+"/reconcile",{method:"POST",body:JSON.stringify({})});
   if(result.finalizationRequired){
    await api("/api/marketplace/orders/"+encodeURIComponent(item.order_id)+"/refund",{method:"POST",body:JSON.stringify({})});
    setNotice("وضعیت درگاه تأیید شد و ثبت مالی بازپرداخت نهایی گردید.");
   }else if(result.status==="pending"){
    setNotice("درگاه هنوز نتیجه قطعی نداده است. درخواست محفوظ مانده و بازپرداخت جدیدی ارسال نشد.");
   }else{
    setNotice("نتیجه استعلام ثبت شد. وضعیت: "+String(result.status||"نامشخص"));
   }
   await load(false);
  }catch(e){setError(e instanceof Error?e.message:"تطبیق بازپرداخت انجام نشد");await load(false);}
  finally{setActive("");}
 }

 return <main dir="rtl" className="refund-page">
  <div className="refund-heading">
   <div><span className="refund-kicker">پنل پرداخت و تسویه</span><h1>تطبیق بازپرداخت‌های نامعلوم</h1><p>درخواست‌هایی که به درگاه ارسال شده‌اند اما نتیجه قطعی یا ثبت نهایی آن‌ها کامل نشده است.</p></div>
   <div className="refund-actions"><Link href="/modules/?code=10-wallet-ledger&panel=payments">بازگشت به پرداخت و تسویه</Link><button type="button" onClick={()=>void load(false)} disabled={refreshing}>{refreshing?"در حال بروزرسانی…":"بروزرسانی فهرست"}</button></div>
  </div>
  <section className="refund-summary">
   <article><span>درخواست‌های نیازمند بررسی</span><b>{items.length.toLocaleString("fa-IR")}</b></article>
   <article><span>در انتظار استعلام</span><b>{items.filter(x=>["pending","unknown",null].includes(x.provider_last_status)).length.toLocaleString("fa-IR")}</b></article>
   <article><span>دارای نتیجه ناموفق</span><b>{items.filter(x=>x.provider_last_status==="failed").length.toLocaleString("fa-IR")}</b></article>
  </section>
  {notice&&<div className="refund-notice" role="status">{notice}</div>}
  {error&&<div className="refund-error" role="alert">{error}</div>}
  <section className="refund-table-wrap">
   <div className="refund-table-title"><div><h2>کارتابل تطبیق</h2><p>استعلام فقط زمانی خودکار است که آداپتور درگاه، قابلیت رسمی lookup را پیاده‌سازی کرده باشد.</p></div><span>{items.length.toLocaleString("fa-IR")} مورد</span></div>
   {loading?<div className="refund-empty">در حال دریافت اطلاعات…</div>:items.length===0?<div className="refund-empty">در حال حاضر درخواست بازپرداخت نامعلومی برای این سازمان ثبت نشده است.</div>:
   <div className="refund-table-scroll"><table><thead><tr><th>شناسه بازپرداخت</th><th>سفارش / پرداخت</th><th>درگاه</th><th>مبلغ</th><th>وضعیت درگاه</th><th>تعداد تلاش</th><th>آخرین بروزرسانی</th><th>اقدام</th></tr></thead><tbody>
    {items.map(item=><tr key={item.id}>
     <td><b>{item.refund_no}</b><small>{item.reason||"بدون توضیح"}</small></td>
     <td><b>{item.order_no}</b><small>{item.payment_no}</small></td>
     <td>{item.provider_code}<small>{item.provider_refund_transaction_id||"شناسه بازپرداخت درگاه ثبت نشده"}</small></td>
     <td className="refund-amount">{money(item.amount)} <small>ریال</small></td>
     <td><span className={"refund-status status-"+(item.provider_last_status||"unknown")}>{item.provider_last_status||"نامعلوم"}</span>{item.provider_last_error&&<small className="refund-row-error">{item.provider_last_error}</small>}</td>
     <td>{Number(item.provider_attempt_count||0).toLocaleString("fa-IR")}</td>
     <td>{date(item.updated_at)}</td>
     <td><button type="button" disabled={active===item.id||Boolean(item.provider_claimed_at&&Date.now()-new Date(item.provider_claimed_at).getTime()<5*60*1000)} onClick={()=>void reconcile(item)}>{active===item.id?"در حال تطبیق…":"استعلام و نهایی‌سازی"}</button></td>
    </tr>)}
   </tbody></table></div>}
  </section>
  <div className="refund-safety-note"><b>محدودیت ایمنی:</b> اگر درگاه استعلام رسمی ارائه نکند، سامانه وضعیت را حدس نمی‌زند و درخواست بازپرداخت دیگری نمی‌فرستد. در این حالت تطبیق باید با گزارش رسمی درگاه انجام شود.</div>
  <style jsx>{`
   .refund-page{max-width:1500px;margin:0 auto;padding:28px;color:#172033}
   .refund-heading{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;margin-bottom:22px}
   .refund-kicker{font-size:12px;font-weight:800;color:#64748b}
   h1{font-size:26px;margin:8px 0 6px;font-weight:900}
   .refund-heading p,.refund-table-title p{margin:0;color:#64748b;font-size:13px;line-height:1.9}
   .refund-actions{display:flex;gap:9px;align-items:center;flex-wrap:wrap}
   .refund-actions a,.refund-actions button,.refund-table td button{border:1px solid #dbe3ee;background:#fff;border-radius:10px;padding:10px 14px;color:#24334b;text-decoration:none;font-weight:800;font-size:12px;cursor:pointer}
   button:disabled{opacity:.55;cursor:not-allowed}
   .refund-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-bottom:18px}
   .refund-summary article{background:#fff;border:1px solid #e5eaf1;border-radius:14px;padding:17px;display:grid;gap:8px}
   .refund-summary span{font-size:12px;color:#64748b}.refund-summary b{font-size:25px}
   .refund-notice,.refund-error,.refund-safety-note{padding:13px 15px;border-radius:12px;margin:12px 0;font-size:13px;line-height:1.9}
   .refund-notice{background:#effaf5;color:#166534}.refund-error{background:#fff1f2;color:#9f1239}
   .refund-table-wrap{background:#fff;border:1px solid #e5eaf1;border-radius:16px;overflow:hidden}
   .refund-table-title{display:flex;justify-content:space-between;align-items:center;padding:18px 20px;border-bottom:1px solid #edf0f5}
   .refund-table-title h2{font-size:17px;margin:0 0 5px}.refund-table-title>span{font-size:12px;color:#64748b}
   .refund-table-scroll{overflow:auto}
   table{border-collapse:collapse;width:100%;min-width:1050px;text-align:right}
   th,td{padding:13px 15px;border-bottom:1px solid #edf0f5;font-size:12px;vertical-align:middle}
   th{background:#f8fafc;color:#64748b;font-weight:800;white-space:nowrap}
   td b,td small{display:block}td small{font-size:10px;color:#778399;margin-top:5px;max-width:220px;overflow-wrap:anywhere}
   .refund-amount{font-weight:900;white-space:nowrap}.refund-amount small{display:inline;color:#64748b}
   .refund-status{display:inline-block;border-radius:20px;padding:5px 9px;background:#f1f5f9;color:#334155;font-weight:800}
   .status-refunded{background:#dcfce7;color:#166534}.status-failed{background:#fee2e2;color:#991b1b}.status-pending{background:#fef3c7;color:#92400e}
   .refund-row-error{color:#9f1239!important}
   .refund-table td button{background:#172f54;color:#fff;border-color:#172f54;white-space:nowrap}
   .refund-empty{padding:35px;text-align:center;color:#64748b;font-size:13px}
   .refund-safety-note{background:#f8fafc;border:1px solid #e2e8f0;color:#475569}
   @media(max-width:800px){.refund-page{padding:16px}.refund-heading{display:block}.refund-actions{margin-top:14px}.refund-summary{grid-template-columns:1fr}.refund-table-title{align-items:flex-start;gap:10px}}
  `}</style>
 </main>;
}
