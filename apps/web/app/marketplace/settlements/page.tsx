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
 const [issueLinkAudit,setIssueLinkAudit]=useState<any>(null);
 const [issueLinkAuditBusy,setIssueLinkAuditBusy]=useState(false);
 const [cogsReadiness,setCogsReadiness]=useState<any>(null);
 const [cogsReadinessBusy,setCogsReadinessBusy]=useState(false);
 const [readinessBusy,setReadinessBusy]=useState(false);
 const [reportBusy,setReportBusy]=useState(false);
 const [issueDocuments,setIssueDocuments]=useState<any[]>([]);
 const [issueDocumentsBusy,setIssueDocumentsBusy]=useState(false);
 const [selectedIssueDocumentId,setSelectedIssueDocumentId]=useState("");
 const [allocationPreview,setAllocationPreview]=useState<any>(null);
 const [allocationPreviewBusy,setAllocationPreviewBusy]=useState(false);
 const [allocationWriteBusy,setAllocationWriteBusy]=useState(false);
 const [allocationResult,setAllocationResult]=useState<any>(null);
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
 const loadCogsReadiness=async()=>{if(!selectedIssueDocumentId)return;setCogsReadinessBusy(true);setError("");try{const result=await api<any>("/api/marketplace/settlements/cogs-accounting-readiness?issueDocumentId="+encodeURIComponent(selectedIssueDocumentId));setCogsReadiness(result);}catch(e){setCogsReadiness(null);setError(e instanceof Error?e.message:"کنترل آمادگی سند حسابداری بهای کالا دریافت نشد.");}finally{setCogsReadinessBusy(false)}};
 const loadIssueLinkAudit=async()=>{setIssueLinkAuditBusy(true);setError("");try{const result=await api<any>("/api/marketplace/settlements/financial-issue-link-audit?from="+encodeURIComponent(periodStart)+"&to="+encodeURIComponent(periodEnd));setIssueLinkAudit(result);}catch(e){setError(e instanceof Error?e.message:"ممیزی اتصال اسناد خروج مالی دریافت نشد.");}finally{setIssueLinkAuditBusy(false)}};
 const loadOrderCostReport=async()=>{setReportBusy(true);setError("");try{const result=await api<any>("/api/marketplace/settlements/order-cost-analysis?from="+encodeURIComponent(periodStart)+"&to="+encodeURIComponent(periodEnd));setOrderCostReport(result);}catch(e){setError(e instanceof Error?e.message:"گزارش بهای سفارش دریافت نشد.");}finally{setReportBusy(false)}};
 const loadPostedIssueDocuments=async()=>{setIssueDocumentsBusy(true);setError("");try{const result=await api<{items:any[]}>("/api/marketplace/settlements/posted-issue-documents");const rows=result.items||[];setIssueDocuments(rows);setSelectedIssueDocumentId(current=>rows.some(x=>x.id===current)?current:rows[0]?.id||"");setAllocationPreview(null);}catch(e){setError(e instanceof Error?e.message:"فهرست اسناد خروج قطعی دریافت نشد.");}finally{setIssueDocumentsBusy(false)}};
 const loadAllocationPreview=async()=>{if(!selectedIssueDocumentId)return;setAllocationPreviewBusy(true);setError("");try{const result=await api<any>("/api/marketplace/settlements/cost-layer-allocation-preview?issueDocumentId="+encodeURIComponent(selectedIssueDocumentId));setAllocationPreview(result);}catch(e){setAllocationPreview(null);setError(e instanceof Error?e.message:"پیش‌نمایش تخصیص لایه‌ها دریافت نشد.");}finally{setAllocationPreviewBusy(false)}};
 const allocateCostLayers=async()=>{if(!selectedIssueDocumentId)return;setAllocationWriteBusy(true);setError("");setAllocationResult(null);try{const result=await api<any>("/api/marketplace/settlements/"+encodeURIComponent(selectedIssueDocumentId)+"/allocate-cost",{method:"POST",body:"{}"});setAllocationResult(result);await loadAllocationPreview();}catch(e){setError(e instanceof Error?e.message:"ثبت تخصیص بهای تمام‌شده ناموفق بود.");}finally{setAllocationWriteBusy(false)}};
 const fifoAllocationReady=Boolean(allocationPreview?.items?.some((line:any)=>Number(line.unallocatedQuantity)>0)&&allocationPreview.items.filter((line:any)=>Number(line.unallocatedQuantity)>0).every((line:any)=>line.candidates?.some((layer:any)=>layer.activePolicyMethod==="fifo"&&layer.policyDecision==="eligible_under_active_policy")));
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
 const dispatchReadinessLabel=(status:string)=>({
  logistics_order_missing:"سفارش لجستیکی ایجاد نشده",
  supply_order_not_shipped:"سفارش تأمین هنوز اعزام نشده",
  shipment_missing:"مرسوله ثبت نشده",
  shipment_exception:"مرسوله دارای خطا یا لغو است",
  shipment_dispatch_timestamp_missing:"زمان اعزام مرسوله ثبت نشده",
  shipment_dispatched_financial_issue_pending:"اعزام تأیید شده؛ سند خروج مالی متصل نیست"
 } as Record<string,string>)[status]||status;
 return <main className="enterprise-main" dir="rtl">
  <header className="platform-header"><div><span className="section-kicker">تسویه</span><h1>تسویه فروشندگان</h1><p>تولید دوره‌ای، تأیید، ثبت پرداخت و اتصال به دفترکل مالی</p></div><a href="/platform">مرکز عملیات</a></header>
  {error&&<p className="enterprise-loading error" role="alert">{error}</p>}
  <ManagementToolbar rows={items as unknown as Record<string,unknown>[]} filename="marketplace-settlements" onCreate={()=>setGenerateOpen(true)}/>

  <section className="platform-panel">
   <div className="panel-title"><div><h2>آمادگی اتصال بهای تمام‌شده</h2><span>ردیابی اتصال کالا، مصرف انبار و لایه‌های مالی</span></div><button type="button" disabled={readinessBusy||!periodStart||!periodEnd||periodEnd<periodStart} onClick={()=>void loadCostingReadiness()}>{readinessBusy?"در حال بررسی…":"بررسی آمادگی"}</button></div>
   {costingReadiness&&<>
    <p className="empty">این بخش هزینه کالا را محاسبه نمی‌کند. وجود لایه مالی به‌تنهایی اثبات‌کننده ثبت خروج مالی برای همان سفارش نیست.</p>
    <h3>وضعیت آمادگی بهای تمام‌شده</h3>
    {costingReadiness.summary?.map((x:any)=><article className="platform-row" key={x.status}><strong>{costingReadinessLabel(x.status)}</strong><span>{Number(x.lineCount).toLocaleString("fa-IR")} قلم</span><span>{Number(x.orderCount).toLocaleString("fa-IR")} سفارش</span></article>)}
    <h3>تطبیق با اعزام واقعی</h3>
    {costingReadiness.dispatchSummary?.map((x:any)=><article className="platform-row" key={x.status}><strong>{dispatchReadinessLabel(x.status)}</strong><span>{Number(x.lineCount).toLocaleString("fa-IR")} قلم</span><span>{Number(x.orderCount).toLocaleString("fa-IR")} سفارش</span></article>)}
    <div style={{overflowX:"auto"}}><table><thead><tr><th>سفارش</th><th>وضعیت اعزام</th><th>زمان اعزام</th><th>کالا</th><th>تعداد سفارش</th><th>کالای انبار</th><th>ضریب</th><th>مصرف‌شده از انبار</th><th>کالای مالی</th><th>انبارهای مالی متصل</th><th>ردیف موجودی مالی</th><th>موجودی مالی</th><th>ارزش ثبت‌شده مالی</th><th>لایه مالی قطعی</th><th>روش لایه‌ها</th><th>وضعیت اتصال</th><th>بهای تمام‌شده</th></tr></thead><tbody>
    {costingReadiness.items?.map((x:any)=><tr key={x.order_item_id}><td>{x.order_no}</td><td>{dispatchReadinessLabel(x.dispatch_readiness)}</td><td>{x.dispatch_at?new Date(x.dispatch_at).toLocaleString("fa-IR"):"ثبت نشده"}</td><td>{x.marketplace_sku||x.marketplace_product_title}</td><td>{Number(x.ordered_quantity).toLocaleString("fa-IR")}</td><td>{x.inventory_sku||"اتصال ندارد"}</td><td>{Number(x.inventory_quantity_factor||1).toLocaleString("fa-IR")}</td><td>{Number(x.consumed_inventory_quantity||0).toLocaleString("fa-IR")}</td><td>{x.finance_product_code||"اتصال ندارد"}</td><td>{Number(x.mapped_operational_warehouse_count||0).toLocaleString("fa-IR")} / {Number(x.consumed_warehouse_count||0).toLocaleString("fa-IR")}</td><td>{Number(x.financial_inventory_balance_row_count||0).toLocaleString("fa-IR")}</td><td>{Number(x.financial_inventory_quantity||0).toLocaleString("fa-IR")}</td><td>{money(x.financial_inventory_value_amount)}</td><td>{Number(x.posted_cost_layer_count||0).toLocaleString("fa-IR")}</td><td>{(x.posted_cost_layer_methods||[]).join("، ")||"ثبت نشده"}</td><td>{costingReadinessLabel(x.costing_readiness)}</td><td>محاسبه نشده</td></tr>)}
    </tbody></table></div>
    <p className="empty">موجودی و ارزش مالی از مانده ثبت‌شده در انبار مالی و فقط برای کالاها و انبارهای متصل خوانده می‌شود. این ارقام به‌تنهایی اثبات‌کننده تخصیص لایه بهای تمام‌شده به سفارش نیستند.</p>
    <p className="empty">سقف بررسی: ۵۰۰ سفارش و ۲٬۰۰۰ قلم. وضعیت هر قلم بر اساس اتصال‌ها و اسناد قطعی موجود تعیین می‌شود.</p>
   </>}
  </section>


  <section className="platform-panel">
   <div className="panel-title"><div><h2>ممیزی ارتباط سفارش و سند خروج مالی</h2><span>مقایسه شناسه منبع اسناد خروج با سفارش‌ها و رزروهای مصرف‌شده</span></div><button type="button" disabled={issueLinkAuditBusy||!periodStart||!periodEnd||periodEnd<periodStart} onClick={()=>void loadIssueLinkAudit()}>{issueLinkAuditBusy?"در حال ممیزی…":"اجرای ممیزی اتصال"}</button></div>
   <p className="empty">این گزارش فقط داده‌های موجود را کنار هم قرار می‌دهد. برابری source_id با شناسه سفارش، بدون تأیید نوع منبع و ارتباط قلم‌ها، اتصال قطعی محسوب نمی‌شود.</p>
   {issueLinkAudit&&<>
    <h3>نوع منبع اسناد خروج قطعی</h3>
    {issueLinkAudit.sourceTypes?.map((x:any)=><article className="platform-row" key={x.source_type}><strong>{x.source_type}</strong><span>{Number(x.document_count).toLocaleString("fa-IR")} سند</span><span>بدون شناسه منبع: {Number(x.missing_source_id_count).toLocaleString("fa-IR")}</span></article>)}
    <h3>اسناد خروج مالی قطعی</h3>
    <div style={{overflowX:"auto"}}><table><thead><tr><th>شماره سند</th><th>تاریخ</th><th>انبار مالی</th><th>نوع منبع</th><th>شناسه منبع</th><th>تطبیق شناسه با سفارش</th><th>ردیف</th><th>تخصیص</th><th>مبلغ تخصیص</th><th>روش‌ها</th></tr></thead><tbody>
    {issueLinkAudit.documents?.map((x:any)=><tr key={x.document_id}><td>{x.document_no}</td><td>{x.document_date}</td><td>{x.warehouse_code} · {x.warehouse_title}</td><td>{x.source_type||"بدون نوع"}</td><td>{x.source_id||"بدون شناسه"}</td><td>{x.source_id_order_match?("شناسه برابر سفارش "+x.matched_order_no):"تطبیق شناسه پیدا نشد"}</td><td>{Number(x.line_count).toLocaleString("fa-IR")}</td><td>{Number(x.allocation_count).toLocaleString("fa-IR")}</td><td>{String(x.allocated_cost)} ریال</td><td>{(x.valuation_methods||[]).join("، ")||"—"}</td></tr>)}
    </tbody></table></div>
    <h3>رزروهای مصرف‌شده مرتبط با سفارش‌ها</h3>
    <div style={{overflowX:"auto"}}><table><thead><tr><th>شماره سفارش</th><th>شناسه سفارش</th><th>سفارش تأمین</th><th>کالا</th><th>کالای انبار</th><th>شناسه انبار عملیاتی</th><th>مقدار مصرف‌شده</th></tr></thead><tbody>
    {issueLinkAudit.reservations?.map((x:any,index:number)=><tr key={x.order_id+":"+x.supply_order_id+":"+x.marketplace_product_id+":"+x.operational_warehouse_id+":"+index}><td>{x.order_no}</td><td>{x.order_id}</td><td>{x.supply_order_id}</td><td>{x.marketplace_sku||x.marketplace_product_title}</td><td>{x.inventory_sku}</td><td>{x.operational_warehouse_id}</td><td>{String(x.consumed_quantity)}</td></tr>)}
    </tbody></table></div>
    <p className="empty">{issueLinkAudit.interpretation}</p>
    <p className="empty">سقف نمایش: {Number(issueLinkAudit.limits?.issueDocuments||0).toLocaleString("fa-IR")} سند خروج و {Number(issueLinkAudit.limits?.reservationRows||0).toLocaleString("fa-IR")} رزرو.</p>
   </>}
  </section>
  <section className="platform-panel">
   <div className="panel-title"><div><h2>پیش‌نمایش تخصیص لایه‌های بهای تمام‌شده</h2><span>انتخاب سند خروج مالی قطعی و مشاهده مانده قلم‌ها و لایه‌های ورودی</span></div><button type="button" disabled={issueDocumentsBusy} onClick={()=>void loadPostedIssueDocuments()}>{issueDocumentsBusy?"در حال دریافت…":"دریافت اسناد خروج"}</button></div>
   <p className="empty">فقط اسناد خروج مالی قطعی‌شده سازمان جاری نمایش داده می‌شوند. این ابزار پیش‌نمایش خواندنی است؛ ثبت تخصیص فقط برای روش FIFO و با کنترل کامل موجودی، سیاست فعال و دفتر غیرقابل‌تغییر انجام می‌شود. این عملیات سند خروج یا سند حسابداری ایجاد نمی‌کند.</p>
   <div className="platform-form">
    <label>سند خروج مالی
     <select value={selectedIssueDocumentId} onChange={e=>{setSelectedIssueDocumentId(e.target.value);setAllocationPreview(null);setAllocationResult(null);}}>
      <option value="">انتخاب سند خروج</option>
      {issueDocuments.map((d:any)=><option key={d.id} value={d.id}>{d.document_no} · {d.document_date} · {d.warehouse_code} - {d.warehouse_title} · {Number(d.line_count||0).toLocaleString("fa-IR")} قلم</option>)}
     </select>
    </label>
    <button type="button" disabled={!selectedIssueDocumentId||allocationPreviewBusy} onClick={()=>void loadAllocationPreview()}>{allocationPreviewBusy?"در حال بررسی…":"نمایش پیش‌نمایش"}</button>
   </div>
   {issueDocuments.length===0&&!issueDocumentsBusy&&<p className="empty">در فهرست ۱۰۰ سند اخیر، سند خروج قطعی‌شده‌ای پیدا نشد.</p>}
   {allocationPreview&&<>
    <article className="platform-row">
     <strong>{allocationPreview.document?.document_no}</strong>
     <span>تاریخ: {allocationPreview.document?.document_date}</span>
     <span>انبار: {allocationPreview.document?.warehouse_code} · {allocationPreview.document?.warehouse_title}</span>
     <span>اقلام: {Number(allocationPreview.lineCount||0).toLocaleString("fa-IR")}</span>
    </article>
    <p className="empty">{allocationPreview.policy?.reason}</p>
    <div style={{overflowX:"auto"}}><table><thead><tr><th>کد کالا</th><th>عنوان کالا</th><th>مقدار خروج</th><th>تخصیص ثبت‌شده</th><th>تخصیص‌نیافته</th><th>لایه ورودی</th><th>روش</th><th>روش مصوب</th><th>مقدار اولیه لایه</th><th>مصرف لایه</th><th>مانده لایه</th><th>بهای واحد</th><th>حداکثر قابل تخصیص</th><th>سند ورودی</th><th>وضعیت سیاست</th></tr></thead><tbody>
     {allocationPreview.items?.map((line:any)=>(line.candidates?.length?line.candidates:[null]).map((layer:any,index:number)=><tr key={line.issueLineId+":"+(layer?.costLayerId||"none")}>
      {index===0&&<><td rowSpan={Math.max(1,line.candidates?.length||1)}>{line.productCode}</td><td rowSpan={Math.max(1,line.candidates?.length||1)}>{line.productTitle}</td><td rowSpan={Math.max(1,line.candidates?.length||1)}>{String(line.issueQuantity)}</td><td rowSpan={Math.max(1,line.candidates?.length||1)}>{String(line.allocatedQuantity)}</td><td rowSpan={Math.max(1,line.candidates?.length||1)}>{String(line.unallocatedQuantity)}</td></>}
      {layer?<><td>{layer.costLayerId}</td><td>{layer.method}</td><td>{layer.activePolicyMethod||"—"}</td><td>{String(layer.initialQuantity)}</td><td>{String(layer.allocatedQuantity)}</td><td>{String(layer.remainingQuantity)}</td><td>{String(layer.unitCost)}</td><td>{String(layer.maxAllocatableQuantity)}</td><td>{layer.sourceDocument?.documentNo||"—"}</td><td>{layer.policyDecision}</td></>:<td colSpan={10}>لایه واجد شرایط در همین کالا و انبار پیدا نشد</td>}
     </tr>))}
    </tbody></table></div>
    {fifoAllocationReady&&<div className="platform-form"><button type="button" disabled={allocationWriteBusy||allocationPreviewBusy} onClick={()=>void allocateCostLayers()}>{allocationWriteBusy?"در حال ثبت تخصیص FIFO…":"ثبت تخصیص بهای تمام‌شده بر مبنای FIFO"}</button></div>}
    {allocationResult&&<article className="platform-row"><strong>تخصیص ثبت شد</strong><span>ردیف‌های جدید: {Number(allocationResult.createdCount||0).toLocaleString("fa-IR")}</span><span>کل ردیف‌ها: {Number(allocationResult.allocationCount||0).toLocaleString("fa-IR")}</span><span>جمع بهای تخصیص‌یافته: {String(allocationResult.totalCost)} ریال</span></article>}
    <p className="empty">{allocationPreview.limitation}</p>
   </>}
   <p className="empty">فهرست اسناد به ۱۰۰ سند خروج قطعی اخیر محدود است. تخصیص خودکار در این مرحله فقط برای سیاست FIFO فعال و در صورت کفایت کامل لایه‌های ورودی قابل اجراست؛ روش‌های دیگر فقط پیش‌نمایش می‌شوند.</p>
  </section>
  <section className="platform-panel">
   <div className="panel-title"><div><h2>کنترل آمادگی سند حسابداری بهای کالا</h2><span>بررسی تخصیص کامل، دوره مالی، دفتر و حساب‌های قابل ثبت</span></div><button type="button" disabled={!selectedIssueDocumentId||cogsReadinessBusy} onClick={()=>void loadCogsReadiness()}>{cogsReadinessBusy?"در حال کنترل…":"کنترل آمادگی سند"}</button></div>
   <p className="empty">این بخش فقط کنترل می‌کند آیا زیرساخت لازم برای ثبت سند وجود دارد یا خیر. هیچ سند حسابداری ایجاد یا قطعی نمی‌شود و حساب موجودی یا بهای کالا به‌صورت حدسی انتخاب نمی‌شود.</p>
   {cogsReadiness&&<>
    <article className="platform-row"><strong>{cogsReadiness.document?.document_no}</strong><span>{cogsReadiness.document?.document_date}</span><span>{cogsReadiness.document?.warehouse_code} · {cogsReadiness.document?.warehouse_title}</span><span>منبع: {cogsReadiness.document?.source_type||"نامشخص"}</span><span>سفارش: {cogsReadiness.document?.matched_order_no||"تطبیق نشد"}</span></article>
    <h3>وضعیت تخصیص بهای تمام‌شده</h3>
    <article className="platform-row"><span>اقلام سند: {Number(cogsReadiness.allocation?.line_count||0).toLocaleString("fa-IR")}</span><span>اقلام کامل: {Number(cogsReadiness.allocation?.fully_allocated_line_count||0).toLocaleString("fa-IR")}</span><span>اقلام ناقص: {Number(cogsReadiness.allocation?.incomplete_line_count||0).toLocaleString("fa-IR")}</span><span>مقدار خروج: {String(cogsReadiness.allocation?.issue_quantity||"0")}</span><span>مقدار تخصیص: {String(cogsReadiness.allocation?.allocated_quantity||"0")}</span><span>بهای تخصیص‌یافته: {String(cogsReadiness.allocation?.allocated_cost||"0")} ریال</span></article>
    <h3>دفاتر و دوره‌های مالی منطبق با تاریخ سند</h3>
    <div style={{overflowX:"auto"}}><table><thead><tr><th>دفتر</th><th>ارز</th><th>وضعیت دفتر</th><th>دوره منطبق</th><th>وضعیت دوره</th><th>پیش‌فرض</th></tr></thead><tbody>
    {cogsReadiness.books?.map((x:any)=><tr key={x.id}><td>{x.code} · {x.title}</td><td>{x.currency}</td><td>فعال</td><td>{x.period_title||"دوره منطبق ندارد"}</td><td>{x.period_status||"—"}</td><td>{x.is_default?"بله":"خیر"}</td></tr>)}
    </tbody></table></div>
    <h3>حساب‌های کاندیدا، بدون انتخاب خودکار</h3>
    <div style={{overflowX:"auto"}}><table><thead><tr><th>کد</th><th>عنوان</th><th>ماهیت</th><th>مانده عادی</th><th>دفتر</th><th>روش حساب</th></tr></thead><tbody>
    {cogsReadiness.accountCandidates?.map((x:any)=><tr key={x.id}><td>{x.code}</td><td>{x.name}</td><td>{x.account_nature}</td><td>{x.normal_balance}</td><td>{x.book_id||"عمومی"}</td><td>{x.account_mode}</td></tr>)}
    </tbody></table></div>
    <h3>سندهای خودکار قبلی برای همین سند خروج</h3>
    {cogsReadiness.existingCogsDocuments?.length?cogsReadiness.existingCogsDocuments.map((x:any)=><article className="platform-row" key={x.id}><strong>{x.document_no}</strong><span>{x.document_date}</span><span>{x.status}</span><span>{x.posted_at||"قطعی نشده"}</span></article>):<p className="empty">سند خودکار ثبت‌شده‌ای با شناسه منبع مورد انتظار پیدا نشد.</p>}
    <h3>موارد مسدودکننده</h3>
    {cogsReadiness.readiness?.blockedReasons?.map((x:string,i:number)=><article className="platform-row" key={i}><strong>{x}</strong></article>)}
    <p className="empty">{cogsReadiness.limitations}</p>
    <p className="empty">وضعیت فعلی: {cogsReadiness.readiness?.draftCreationAllowed?"پیش‌نویس مجاز":"ایجاد پیش‌نویس مجاز نیست"} · {cogsReadiness.readiness?.postingAllowed?"قطعی‌سازی مجاز":"قطعی‌سازی مجاز نیست"}</p>
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
