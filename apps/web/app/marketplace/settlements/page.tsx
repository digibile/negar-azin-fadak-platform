"use client";
import {useEffect,useState} from "react";
import {api} from "../../../lib/api";
import {ManagementDialog,ManagementToolbar} from "../../components/ManagementWorkspaceTools";

type Settlement={id:string;settlement_no:string;seller_name:string;gross_amount:string|number;commission_amount:string|number;net_amount:string|number;status:string;period_start:string;period_end:string;order_count:number;[key:string]:unknown};
const statusLabel:Record<string,string>={pending:"در انتظار تأیید",approved:"تأییدشده و آماده پرداخت",paid:"پرداخت‌شده"};

export default function SettlementsPage(){
 const [items,setItems]=useState<Settlement[]>([]);
 const [error,setError]=useState("");
 const [busy,setBusy]=useState("");
 const [selected,setSelected]=useState<Settlement|null>(null);
 const [generateOpen,setGenerateOpen]=useState(false);
 const [orderCostReport,setOrderCostReport]=useState<any>(null);
 const [costingReadiness,setCostingReadiness]=useState<any>(null);
 const [readinessBusy,setReadinessBusy]=useState(false);
 const [reportBusy,setReportBusy]=useState(false);
 const [periodStart,setPeriodStart]=useState(()=>{const d=new Date();d.setDate(d.getDate()-30);return d.toISOString().slice(0,10)});
 const [periodEnd,setPeriodEnd]=useState(()=>new Date().toISOString().slice(0,10));

 async function load(){
  setError("");
  try{const result=await api<Settlement[]|{items:Settlement[]}>("/api/marketplace/settlements");setItems(Array.isArray(result)?result:result.items||[]);}
  catch(e){setError(e instanceof Error?e.message:"دریافت تسویه‌ها ناموفق بود.");}
 }
 useEffect(()=>{void load()},[]);

 async function generate(){
  setBusy("generate");setError("");
  try{await api("/api/marketplace/settlements/generate",{method:"POST",body:JSON.stringify({periodStart,periodEnd})});setGenerateOpen(false);await load();}
  catch(e){setError(e instanceof Error?e.message:"تولید تسویه ناموفق بود.");}
  finally{setBusy("");}
 }
 async function approve(item:Settlement){
  setBusy(item.id);setError("");
  try{await api("/api/marketplace/settlements/"+encodeURIComponent(item.id)+"/approve",{method:"PATCH",body:"{}"});await load();}
  catch(e){setError(e instanceof Error?e.message:"تأیید تسویه ناموفق بود.");}
  finally{setBusy("");}
 }
 async function pay(item:Settlement){
  const paymentRef=window.prompt("شناسه یا مرجع پرداخت ثبت‌شده را وارد کنید:")||"";
  if(!paymentRef.trim())return;
  setBusy(item.id);setError("");
  try{await api("/api/marketplace/settlements/"+encodeURIComponent(item.id)+"/pay",{method:"POST",body:JSON.stringify({paymentRef})});await load();}
  catch(e){setError(e instanceof Error?e.message:"ثبت پرداخت تسویه ناموفق بود.");}
  finally{setBusy("");}
 }
 const loadCostingReadiness=async()=>{setReadinessBusy(true);setError("");try{const result=await api<any>("/api/marketplace/settlements/costing-readiness?from="+encodeURIComponent(periodStart)+"&to="+encodeURIComponent(periodEnd));setCostingReadiness(result);}catch(e){setError(e instanceof Error?e.message:"گزارش آمادگی بهای تمام‌شده دریافت نشد.");}finally{setReadinessBusy(false)}};
 const loadOrderCostReport=async()=>{setReportBusy(true);setError("");try{const result=await api<any>("/api/marketplace/settlements/order-cost-analysis?from="+encodeURIComponent(periodStart)+"&to="+encodeURIComponent(periodEnd));setOrderCostReport(result);}catch(e){setError(e instanceof Error?e.message:"گزارش بهای سفارش دریافت نشد.");}finally{setReportBusy(false)}};
 const money=(v:unknown)=>Number(v||0).toLocaleString("fa-IR")+" ریال";
 const costingReadinessLabel=(status:string)=>({
  missing_inventory_product_mapping:"اتصال کالای انبار ناقص است",
  missing_finance_product_mapping:"اتصال کالای مالی ناقص است",
  inventory_not_fully_consumed:"مصرف انبار کامل نیست",
  missing_finance_warehouse_mapping:"اتصال انبار مالی ناقص است",
  missing_posted_finance_cost_layers:"لایه بهای مالی قطعی پیدا نشد",
  missing_posted_finance_cost_layers_at_consumed_warehouse:"در انبار مصرف‌شده لایه بهای قطعی وجود ندارد",
  mixed_cost_layer_valuation_methods:"روش ارزش‌گذاری لایه‌ها یکسان نیست",
  cost_layers_present_financial_issue_link_pending:"نیازمند اتصال سند خروج مالی به سفارش"
 } as Record<string,string>)[status]||status;
 return <main className="enterprise-main" dir="rtl">
  <header className="platform-header"><div><span className="section-kicker">تسویه</span><h1>تسویه فروشندگان</h1><p>تولید دوره‌ای، تأیید، ثبت پرداخت و اتصال به دفترکل مالی</p></div><a href="/platform">مرکز عملیات</a></header>
  {error&&<p className="enterprise-loading error" role="alert">{error}</p>}
  <ManagementToolbar rows={items as unknown as Record<string,unknown>[]} filename="marketplace-settlements" onCreate={()=>setGenerateOpen(true)}/>

  <section className="platform-panel">
   <div className="panel-title"><div><h2>آمادگی اتصال بهای تمام‌شده</h2><span>ردیابی اتصال کالا، مصرف انبار و لایه‌های مالی</span></div><button type="button" disabled={readinessBusy||!periodStart||!periodEnd||periodEnd<periodStart} onClick={()=>void loadCostingReadiness()}>{readinessBusy?"در حال بررسی…":"بررسی آمادگی"}</button></div>
   {costingReadiness&&<>
    <p className="empty">این بخش هزینه کالا را محاسبه نمی‌کند. وجود لایه مالی به‌تنهایی اثبات‌کننده ثبت خروج مالی برای همان سفارش نیست.</p>
    {costingReadiness.summary?.map((x:any)=><article className="platform-row" key={x.status}><strong>{x.status}</strong><span>{Number(x.lineCount).toLocaleString("fa-IR")} قلم</span><span>{Number(x.orderCount).toLocaleString("fa-IR")} سفارش</span></article>)}
    <div style={{overflowX:"auto"}}><table><thead><tr><th>سفارش</th><th>کالا</th><th>تعداد سفارش</th><th>کالای انبار</th><th>ضریب</th><th>مصرف‌شده از انبار</th><th>کالای مالی</th><th>انبارهای مالی متصل</th><th>لایه مالی قطعی</th><th>روش لایه‌ها</th><th>وضعیت اتصال</th><th>بهای تمام‌شده</th></tr></thead><tbody>
    {costingReadiness.items?.map((x:any)=><tr key={x.order_item_id}><td>{x.order_no}</td><td>{x.marketplace_sku||x.marketplace_product_title}</td><td>{Number(x.ordered_quantity).toLocaleString("fa-IR")}</td><td>{x.inventory_sku||"اتصال ندارد"}</td><td>{Number(x.inventory_quantity_factor||1).toLocaleString("fa-IR")}</td><td>{Number(x.consumed_inventory_quantity||0).toLocaleString("fa-IR")}</td><td>{x.finance_product_code||"اتصال ندارد"}</td><td>{Number(x.mapped_operational_warehouse_count||0).toLocaleString("fa-IR")} / {Number(x.consumed_warehouse_count||0).toLocaleString("fa-IR")}</td><td>{Number(x.posted_cost_layer_count||0).toLocaleString("fa-IR")}</td><td>{(x.posted_cost_layer_methods||[]).join("، ")||"ثبت نشده"}</td><td>{costingReadinessLabel(x.costing_readiness)}</td><td>محاسبه نشده</td></tr>)}
    </tbody></table></div>
    <p className="empty">سقف بررسی: ۵۰۰ سفارش و ۲٬۰۰۰ قلم. وضعیت هر قلم بر اساس اتصال‌ها و اسناد قطعی موجود تعیین می‌شود.</p>
   </>}
  </section>

  <section className="platform-panel">
   <div className="panel-title"><div><h2>تحلیل اجزای مالی سفارش‌ها</h2><span>فقط داده‌های ثبت‌شده و اسناد قطعی</span></div><button type="button" disabled={reportBusy||!periodStart||!periodEnd||periodEnd<periodStart} onClick={()=>void loadOrderCostReport()}>{reportBusy?"در حال دریافت…":"دریافت گزارش"}</button></div>
   <div className="platform-form"><label>از تاریخ<input type="date" value={periodStart} onChange={e=>setPeriodStart(e.target.value)}/></label><label>تا تاریخ<input type="date" value={periodEnd} onChange={e=>setPeriodEnd(e.target.value)}/></label></div>
   {orderCostReport&&<>
    <p className="empty">این گزارش سود خالص نیست. بهای تمام‌شده کالا هنوز به سند خروج مالیِ سفارش بازارگاه متصل نشده و عمداً نامشخص نمایش داده می‌شود.</p>
    <h3>خلاصه به تفکیک ارز</h3>
    {orderCostReport.summary?.map((x:any)=><article className="platform-row" key={x.currency}><strong>{x.currency}</strong><span>{Number(x.order_count).toLocaleString("fa-IR")} سفارش</span><span>فروش: {money(x.order_total)}</span><span>تخفیف: {money(x.discount_amount)}</span><span>کارمزد ثبت‌شده: {money(x.recorded_commission)}</span><span>سهم فروشنده: {money(x.seller_payable)}</span></article>)}
    <h3>جزئیات سفارش‌ها</h3>
    <div style={{overflowX:"auto"}}><table><thead><tr><th>سفارش</th><th>وضعیت</th><th>ارز</th><th>مبلغ سفارش</th><th>کارمزد ثبت‌شده</th><th>کارمزد تسویه‌شده</th><th>بازپرداخت قطعی</th><th>حمل قطعی</th><th>تعداد برگشت</th><th>بهای کالا</th><th>وضعیت سود</th></tr></thead><tbody>
    {orderCostReport.items?.map((x:any)=><tr key={x.order_id}><td>{x.order_no}</td><td>{x.order_status}</td><td>{x.currency}</td><td>{money(x.total_amount)}</td><td>{money(x.recorded_commission)}</td><td>{money(x.settled_commission)}</td><td>{money(x.refunded_amount)}</td><td>{money(x.posted_freight_cost)}</td><td>{Number(x.return_request_count||0).toLocaleString("fa-IR")}</td><td>نامشخص</td><td>ناقص</td></tr>)}
    </tbody></table></div>
    <p className="empty">تعداد ردیف: {Number(orderCostReport.items?.length||0).toLocaleString("fa-IR")} از سقف {orderCostReport.limit||500} · ارزها جداگانه گزارش شده‌اند.</p>
   </>}
  </section>
  {generateOpen&&<ManagementDialog title="تولید تسویه فروشندگان" onClose={()=>setGenerateOpen(false)}>  <section className="platform-panel">
   <h2>تولید تسویه از سفارش‌های پرداخت‌شده</h2>
   <p>سامانه فقط سفارش‌های پرداخت‌شده و تسویه‌نشده در بازه انتخابی را پردازش می‌کند. ثبت سند مالی هنگام پرداخت نهایی در سرویس دفترکل انجام می‌شود.</p>
   <div className="platform-form"><label>از تاریخ<input type="date" value={periodStart} onChange={e=>setPeriodStart(e.target.value)}/></label><label>تا تاریخ<input type="date" value={periodEnd} onChange={e=>setPeriodEnd(e.target.value)}/></label><button type="button" disabled={busy!==""||!periodStart||!periodEnd||periodEnd<=periodStart} onClick={()=>void generate()}>{busy==="generate"?"در حال تولید…":"تولید تسویه"}</button></div>
  </section></ManagementDialog>}

  <section className="platform-panel">
   <div className="panel-title"><div><h2>فهرست تسویه‌ها</h2><span>{items.length.toLocaleString("fa-IR")} رکورد</span></div><button type="button" onClick={()=>void load()}>بازخوانی</button></div>
   {items.map(x=><article className="platform-row" key={x.id}>
    <div><b>{x.settlement_no}</b><small>{x.seller_name||"فروشنده"} · {Number(x.order_count||0).toLocaleString("fa-IR")} سفارش</small></div>
    <span>ناخالص: {money(x.gross_amount)}</span><span>کارمزد: {money(x.commission_amount)}</span><strong>خالص: {money(x.net_amount)}</strong>
    <span>{statusLabel[x.status]||x.status}</span>
    <div className="record-actions"><button type="button" onClick={()=>setSelected(x)}>مشاهده</button>{x.status==="pending"&&<button type="button" disabled={busy===x.id} onClick={()=>void approve(x)}>تأیید</button>}{x.status==="approved"&&<button type="button" disabled={busy===x.id} onClick={()=>void pay(x)}>ثبت پرداخت</button>}</div>
   </article>)}
   {!items.length&&<p className="empty">تسویه‌ای ثبت نشده است.</p>}
  </section>
  {selected&&<ManagementDialog title={"جزئیات تسویه "+selected.settlement_no} onClose={()=>setSelected(null)}><dl className="management-detail-grid">{Object.entries(selected).filter(([key])=>key!=="id").map(([key,value])=><div key={key}><dt>{key}</dt><dd>{value===null||value===undefined?"—":String(value)}</dd></div>)}</dl></ManagementDialog>}
 </main>;
}
