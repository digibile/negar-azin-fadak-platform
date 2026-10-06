"use client";

import {Suspense} from "react";

import {useEffect,useMemo,useState} from "react";
import AccountingWorkspace from "./AccountingWorkspace";
import AccountingFinanceWorkspace from "./AccountingFinanceWorkspace";
import TreasuryBankWorkspace from "./TreasuryBankWorkspace";
import TreasuryChecksWorkspace from "./TreasuryChecksWorkspace";
import SalesWorkspace from "./SalesWorkspace";
import PurchasingSupplyWorkspace from "./PurchasingSupplyWorkspace";
import WalletLedgerWorkspace from "./WalletLedgerWorkspace";
import DashboardWorkspace from "./DashboardWorkspace";
import OrganizationWorkspace from "./OrganizationWorkspace";
import SecurityWorkspace from "./SecurityWorkspace";
import IdentityWorkspace from "./IdentityWorkspace";
import MasterDataWorkspace from "./MasterDataWorkspace";
import Customer360Workspace from "./Customer360Workspace";
import SmartCalendarWorkspace from "./SmartCalendarWorkspace";
import BusinessRulesWorkspace from "./BusinessRulesWorkspace";
import SLAWorkspace from "./SLAWorkspace";
import CentralSettingsWorkspace from "./CentralSettingsWorkspace";
import CreditFacilitiesWorkspace from "./CreditFacilitiesWorkspace";
import CreditApplicationsWorkspace from "./CreditApplicationsWorkspace";
import LoanContractsWorkspace from "./LoanContractsWorkspace";
import InstallmentSchedulesWorkspace from "./InstallmentSchedulesWorkspace";
import InstallmentCollectionsWorkspace from "./InstallmentCollectionsWorkspace";
import CollateralGuaranteesWorkspace from "./CollateralGuaranteesWorkspace";
import DigitalBinderWorkspace from "./DigitalBinderWorkspace";
import IdentityVerificationWorkspace from "./IdentityVerificationWorkspace";
import CreditScoringWorkspace from "./CreditScoringWorkspace";
import CreditDecisionsWorkspace from "./CreditDecisionsWorkspace";
import CreditCommitteeWorkspace from "./CreditCommitteeWorkspace";
import CreditDisbursementWorkspace from "./CreditDisbursementWorkspace";
import LoanSettlementWorkspace from "./LoanSettlementWorkspace";
import LoanLedgerWorkspace from "./LoanLedgerWorkspace";
import LoanRefundsWorkspace from "./LoanRefundsWorkspace";
import LoanClosureWorkspace from "./LoanClosureWorkspace";
import LoanDelinquencyWorkspace from "./LoanDelinquencyWorkspace";
import CollectionWorkflowWorkspace from "./CollectionWorkflowWorkspace";
import LoanRestructuringWorkspace from "./LoanRestructuringWorkspace";
import LoanReliefWorkspace from "./LoanReliefWorkspace";
import LoanLegalCasesWorkspace from "./LoanLegalCasesWorkspace";
import FormBuilderWorkspace from "./FormBuilderWorkspace";
import MenuBuilderWorkspace from "./MenuBuilderWorkspace";
import PageBuilderWorkspace from "./PageBuilderWorkspace";
import PageBlockEditorWorkspace from "./PageBlockEditorWorkspace";
import PageTemplatesWorkspace from "./PageTemplatesWorkspace";
import FrontendSectionsWorkspace from "./FrontendSectionsWorkspace";
import NavigationRulesWorkspace from "./NavigationRulesWorkspace";
import FrontendNotificationsWorkspace from "./FrontendNotificationsWorkspace";
import NotificationTemplatesWorkspace from "./NotificationTemplatesWorkspace";
import DocumentationWorkspace from "./DocumentationWorkspace";
import DocumentApprovalsWorkspace from "./DocumentApprovalsWorkspace";
import DocumentVersionsWorkspace from "./DocumentVersionsWorkspace";
import DocumentSearchWorkspace from "./DocumentSearchWorkspace";
import DocumentRetentionWorkspace from "./DocumentRetentionWorkspace";
import DocumentDistributionWorkspace from "./DocumentDistributionWorkspace";
import DocumentAccessLogWorkspace from "./DocumentAccessLogWorkspace";
import DocumentAuditReportsWorkspace from "./DocumentAuditReportsWorkspace";
import DocumentComplianceWorkspace from "./DocumentComplianceWorkspace";
import DocumentGovernanceWorkspace from "./DocumentGovernanceWorkspace";

type Field={field_key:string;title:string;field_type:string;required:boolean;sort_order:number;options?:{options?:string[]}};
type ModuleInfo={id:number;code:string;title:string};
type Action={id:number;action_code:string;title:string;permission:string;is_active:boolean};
type MenuItem={id:string|number;parent_id:string|number|null;title:string;path:string;sort_order:number;permission?:string|null;is_active?:boolean};
type RecordItem={id:number;record_type:string;title:string;status:string;data:Record<string,unknown>;created_at:string;updated_at:string};

const api=(process.env.NEXT_PUBLIC_API_BASE_URL||process.env.NEXT_PUBLIC_API_URL||"").replace(/\/$/,"");
const url=(path:string)=>api+path;
const csrf=()=>document.cookie.split(";").map(x=>x.trim()).find(x=>x.startsWith("naf_csrf="))?.slice(9)||"";

function ModulesContent(){
 const [code,setCode]=useState("");
 const [activeMenu,setActiveMenu]=useState("");
 const [activeSection,setActiveSection]=useState("");
 const [module,setModule]=useState<ModuleInfo|null>(null);
 const [actions,setActions]=useState<Action[]>([]);
 const [menuChildren,setMenuChildren]=useState<MenuItem[]>([]);
 const [fields,setFields]=useState<Field[]>([]);
 const [items,setItems]=useState<RecordItem[]>([]);
 const [form,setForm]=useState<Record<string,unknown>>({});
 const [title,setTitle]=useState("");
 const [recordType,setRecordType]=useState("record");
 const [status,setStatus]=useState("active");
 const [filterStatus,setFilterStatus]=useState("");
 const [q,setQ]=useState("");
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const [editingId,setEditingId]=useState<number|null>(null);
 const [error,setError]=useState("");

 useEffect(()=>{
   const p=new URLSearchParams(window.location.search);
   const c=p.get("code")||"governance";
   const menu=p.get("menu")||"";
   const tab=p.get("tab")||"";
   setCode(c);setActiveMenu(menu);setActiveSection(tab);
   if(tab)setRecordType(tab);
 },[]);
 const load=async()=>{
   if(!code)return;
   setLoading(true);setError("");
   try{
    const [schema,records,actionResponse,menuResponse]=await Promise.all([
      fetch(url("/api/platform/modules/"+encodeURIComponent(code)+"/schema"),{credentials:"include"}),
      fetch(url("/api/platform/modules/"+encodeURIComponent(code)+"/records?page=1&pageSize=50&q="+encodeURIComponent(q)+(filterStatus?"&status="+encodeURIComponent(filterStatus):"")),{credentials:"include"}),
      fetch(url("/api/platform/modules/"+encodeURIComponent(code)+"/actions"),{credentials:"include"}),
      fetch(url("/api/dashboard/menu-tree"),{credentials:"include"})
    ]);
    const menuBody=menuResponse.ok?await menuResponse.json():{items:[]};
    const tree:MenuItem[]=Array.isArray(menuBody)?menuBody:(menuBody.items||[]);
    const parent=tree.find(x=>x.path==="/modules/?code="+code||x.path?.includes("code="+code));
    setMenuChildren(parent?((parent as any).child_items||[]).sort((x:any,y:any)=>x.sort_order-y.sort_order):[]);
    if(!schema.ok||!records.ok)throw new Error("برای مشاهده این ماژول باید نشست معتبر داشته باشید.");
    const s=await schema.json(),r=await records.json(),a=actionResponse.ok?await actionResponse.json():[];
    setModule(s.module);setFields(s.fields);setItems(r.items||[]);setActions(a);
   }catch(e){setError(e instanceof Error?e.message:"خطا در دریافت اطلاعات");}
   finally{setLoading(false)}
 };
 useEffect(()=>{load()},[code,filterStatus]);
 const fieldValue=(key:string)=>form[key]??"";
 const setField=(key:string,value:unknown)=>setForm(x=>({...x,[key]:value}));
 const save=async()=>{
   if(!title.trim())return setError("عنوان رکورد الزامی است.");
   const missing=fields.filter(f=>f.required&&(form[f.field_key]===undefined||form[f.field_key]===null||String(form[f.field_key]).trim()===""));
   if(missing.length)return setError("فیلدهای الزامی را کامل کنید: "+missing.map(f=>f.title).join("، "));
   setSaving(true);setError("");
   try{
    const r=await fetch(url("/api/platform/modules/"+encodeURIComponent(code)+"/records"+(editingId?"/"+editingId:"")),{
      method:editingId?"PATCH":"POST",credentials:"include",headers:{"Content-Type":"application/json","X-CSRF-Token":csrf()},
      body:JSON.stringify({recordType,title,status,data:form})
    });
    const body=await r.json().catch(()=>null);
    if(!r.ok)throw new Error(body?.error||"ثبت رکورد انجام نشد");
    setTitle("");setForm({});setEditingId(null);await load();
   }catch(e){setError(e instanceof Error?e.message:"خطا در ثبت")}
   finally{setSaving(false)}
 };
 const edit=(r:RecordItem)=>{setEditingId(r.id);setTitle(r.title);setRecordType(r.record_type);setStatus(r.status);setForm(r.data||{});setError("");window.scrollTo({top:0,behavior:"smooth"})};
 const resetForm=()=>{setEditingId(null);setTitle("");setRecordType("record");setStatus("active");setForm({});setError("");};
 const remove=async(id:number)=>{
   setError("");
   try{
    const r=await fetch(url("/api/platform/modules/"+encodeURIComponent(code)+"/records/"+id),{method:"DELETE",credentials:"include",headers:{"X-CSRF-Token":csrf()}});
    if(!r.ok){const b=await r.json().catch(()=>null);throw new Error(b?.error||"حذف انجام نشد")}
    await load();
   }catch(e){setError(e instanceof Error?e.message:"خطا در حذف")}
 };
 const fieldInput=(f:Field)=>{
   const v=fieldValue(f.field_key);
   if(f.field_type==="textarea")return <textarea value={String(v)} onChange={e=>setField(f.field_key,e.target.value)} />;
   if(f.field_type==="number")return <input type="number" value={String(v)} onChange={e=>setField(f.field_key,e.target.value===""?"":Number(e.target.value))}/>;
   if(f.field_type==="date"||f.field_type==="datetime")return <input type={f.field_type==="date"?"date":"datetime-local"} value={String(v)} onChange={e=>setField(f.field_key,e.target.value)}/>;
   if(f.field_type==="boolean")return <input type="checkbox" checked={Boolean(v)} onChange={e=>setField(f.field_key,e.target.checked)}/>;
   if(f.field_type==="select")return <select value={String(v)} onChange={e=>setField(f.field_key,e.target.value)}><option value="">انتخاب کنید</option>{(f.options?.options||[]).map(x=><option key={x} value={x}>{x}</option>)}</select>;
   return <input value={String(v)} onChange={e=>setField(f.field_key,e.target.value)} required={f.required}/>;
 };
 const visible=useMemo(()=>items,[items]);
const CANONICAL_WORKSPACES: Record<string, React.ReactNode> = {
  "01-dashboard": <DashboardWorkspace />,
  "02-organizations": <OrganizationWorkspace />,
  "03-users-access": <SecurityWorkspace />,
  "04-customers-360": <Customer360Workspace />,
  "05-smart-calendar": <SmartCalendarWorkspace />,
  "06-business-rules": <BusinessRulesWorkspace />,
  "07-sla": <SLAWorkspace />,
  "08-accounting-finance": <AccountingFinanceWorkspace />,
  "14-form-builder": <FormBuilderWorkspace />,
  "15-menu-builder": <MenuBuilderWorkspace />,
  "16-page-builder": <PageBuilderWorkspace />,
  "17-frontend-management": <FrontendSectionsWorkspace />,
  "18-notifications": <FrontendNotificationsWorkspace />,
  "19-documents-governance": <DocumentGovernanceWorkspace />,
  "20-system-settings": <CentralSettingsWorkspace />,
  "08-check-documents": <TreasuryChecksWorkspace />,\n  "22-sales-revenue": <SalesWorkspace />,
  "26-treasury-bank": <TreasuryBankWorkspace />,
  "29-wallet-ledger": <WalletLedgerWorkspace />,
  "37-collateral-guarantees": <CollateralGuaranteesWorkspace />,
  "38-collections": <CollectionWorkflowWorkspace />
};

function CanonicalModuleLanding({ code, module, menuChildren, error, activeMenu, items, actions }: {
  code: string;
  module: ModuleInfo | null;
  menuChildren: MenuItem[];
  error: string;
  activeMenu: string;
  items: RecordItem[];
  actions: Action[];
}) {
  const publicLinks: Record<string, Array<[string, string]>> = {
    "09-commerce-stores": [["فروشگاه اینترنتی", "/store"], ["بازارگاه", "/marketplace"], ["محصولات", "/marketplace/products"], ["سفارش‌ها", "/marketplace/orders"]],
    "11-merchants": [["پذیرندگان", "/pay/merchants"], ["پرداخت و تسویه", "/pay/payments"]],
    "12-sellers": [["فروشندگان", "/marketplace/sellers"], ["فروشگاه‌ها", "/marketplace/stores"]],
    "13-payments-settlement": [["پرداخت‌ها", "/pay/payments"], ["تسویه‌ها", "/marketplace/settlements"]],
    "35-credit-financing": [["طرح‌های اعتباری", "/pay/plans"], ["بررسی شرایط", "/pay/eligibility"], ["ثبت درخواست", "/pay/apply"]],
    "36-loans": [["درخواست تسهیلات", "/pay/loans"], ["اقساط", "/pay/installments"], ["بازپرداخت", "/pay/repayment"]],
    "48-shipping-delivery": [["سفارش‌ها", "/marketplace/orders"], ["پیگیری سفارش", "/store/orders"]]
  };
  const links = publicLinks[code] || [];
  const selected = activeMenu || "";
  const selectedChild = menuChildren.find(item => item.title === selected);
  const childHref = selectedChild?.path || "";
  return <main className="module-runtime canonical-module" dir="rtl">
    <header className="page-head">
      <div><span className="eyebrow">منوی مرکزی سازمان · بخش عملیاتی</span><h1>{selected || module?.title || code}</h1><p className="muted">{selected ? `بخش «${selected}» از ${module?.title || code}` : "مسیر عملیاتی واقعی سامانه برای این بخش. ورودی‌ها از ساختار منوی پایگاه داده خوانده می‌شوند."}</p></div>
      <a className="back-link" href="/admin">مرکز مدیریت</a>
    </header>
    {error&&<div className="error runtime-error">{error}</div>}
    {!!menuChildren.length&&<nav className="module-subnav" aria-label="زیرمنوی عملیاتی">{menuChildren.map(item=><a className={item.title===selected?"active":""} key={item.id} href={item.path}>{item.title}</a>)}</nav>}
    {!!selected&&<section className="runtime-panel"><div className="panel-title"><div><h2>عملیات انتخاب‌شده</h2><span>مسیر ثبت‌شده در منوی مرکزی</span></div><strong>{items.length} رکورد · {actions.length} عملیات</strong></div><div className="record-row"><div><strong>{selected}</strong><small>{childHref||"مسیر عملیاتی اختصاصی هنوز در رجیستری ثبت نشده است."}</small></div>{childHref&&<a className="command-link" href={childHref}>باز کردن مسیر ›</a>}</div>{items.length>0&&<div className="record-list">{items.slice(0,8).map(item=><article className="record-row" key={item.id}><div><strong>{item.title}</strong><small>{item.record_type} · {item.status}</small></div><span>{new Date(item.updated_at).toLocaleDateString("fa-IR")}</span></article>)}</div>}</section>}
    {!!links.length&&<section className="runtime-panel">
      <div className="panel-title"><div><h2>ورودی‌های متصل</h2><span>صفحات واقعی سامانه</span></div></div>
      <div className="control-grid">{links.map(([label,href])=><a className="control-card" href={href} key={href}><div><span>LINKED ROUTE</span><h2>{label}</h2><small>{href}</small></div><strong>›</strong></a>)}</div>
    </section>}
    {!!menuChildren.length&&<section className="runtime-panel">
      <div className="panel-title"><div><h2>عملیات و زیرمنوها</h2><span>{menuChildren.length} ورودی از پایگاه داده</span></div></div>
      <div className="record-list">{menuChildren.map(item=><a className="record-row" href={item.path} key={item.id}><div><strong>{item.title}</strong><small>{item.path}</small></div><span>باز کردن ›</span></a>)}</div>
    </section>}
    {!links.length&&!menuChildren.length&&<section className="runtime-panel"><div className="panel-title"><div><h2>فضای عملیاتی</h2><span>اتصال مستقیم به رجیستری ماژول</span></div></div><p className="muted">این بخش در رجیستری مرکزی ثبت شده است. برای عملیات اختصاصی، مسیر API و فرم‌های مربوط به همان ماژول استفاده می‌شود و داده نمایشی ساختگی تولید نمی‌شود.</p><a className="command-link" href={"/modules/?code="+encodeURIComponent(code)}>بازخوانی ماژول</a></section>}
  </main>;
}

 if(CANONICAL_WORKSPACES[code])return CANONICAL_WORKSPACES[code];
 const canonicalCodes=new Set([
  "01-dashboard","02-organizations","03-users-access","04-customers-360","05-smart-calendar","06-business-rules","07-sla",
  "08-accounting-finance","08-check-documents","09-commerce-stores","10-domains","11-merchants","12-sellers","13-payments-settlement","14-form-builder",
  "15-menu-builder","16-page-builder","17-frontend-management","18-notifications","19-documents-governance","20-system-settings",
  "21-purchasing-supply","22-sales-revenue","23-inventory-warehouse","24-production","25-costing","26-treasury-bank","27-receivables",
  "28-payables","29-wallet-ledger","30-projects-cost-centers","31-fixed-assets","32-tax-e-invoicing","33-budget-financial-control",
  "34-financial-commitments","35-credit-financing","36-loans","37-collateral-guarantees","38-collections","39-human-resources",
  "40-ai-finance","41-ai-documents-ocr","42-audit-internal-control","43-communication-hub","44-marketing-content","45-search-analytics",
  "46-unified-applications","47-contracts-legal","48-shipping-delivery","49-reconciliation","50-release-health"
 ]);
 if(canonicalCodes.has(code))return <CanonicalModuleLanding code={code} module={module} menuChildren={menuChildren} error={error} activeMenu={activeMenu} items={items} actions={actions}/>;
 if(code==="command-center")return <DashboardWorkspace/>;
 if(code==="accounting-finance")return <AccountingWorkspace/>;
 if(code==="08-accounting-finance")return <AccountingFinanceWorkspace/>;
 if(code==="09-treasury-bank")return <TreasuryBankWorkspace/>
if(code==="10-wallet-ledger")return <WalletLedgerWorkspace/>;
 if(code==="01-governance"||code==="dashboard"||code==="governance")return <DashboardWorkspace/>;
 if(code==="security")return <SecurityWorkspace/>;
 if(code==="02-identity")return <IdentityWorkspace/>;
 if(code==="03-master-data")return <MasterDataWorkspace/>;
 if(code==="04-customer-360")return <Customer360Workspace/>;
 if(code==="05-smart-calendar")return <SmartCalendarWorkspace/>;
 if(code==="06-business-rules")return <BusinessRulesWorkspace/>;
 if(code==="07-sla")return <SLAWorkspace/>;
 if(code==="central-settings")return <CentralSettingsWorkspace/>;
 if(code==="11-credit-facilities")return <CreditFacilitiesWorkspace/>;
 if(code==="12-credit-applications")return <CreditApplicationsWorkspace/>;
 if(code==="13-loan-contracts")return <LoanContractsWorkspace/>;
 if(code==="14-installment-schedules")return <InstallmentSchedulesWorkspace/>;
 if(code==="15-installment-collections")return <InstallmentCollectionsWorkspace/>;
 if(code==="16-collateral-guarantees")return <CollateralGuaranteesWorkspace/>;
 if(code==="17-digital-binder")return <DigitalBinderWorkspace/>;
 if(code==="18-identity-verification")return <IdentityVerificationWorkspace/>;
 if(code==="19-credit-scoring")return <CreditScoringWorkspace/>;
 if(code==="20-credit-decisions")return <CreditDecisionsWorkspace/>;
 if(code==="21-credit-committee")return <CreditCommitteeWorkspace/>;
 if(code==="22-credit-disbursement")return <CreditDisbursementWorkspace/>;
 if(code==="23-loan-settlement")return <LoanSettlementWorkspace/>;
 if(code==="24-loan-ledger")return <LoanLedgerWorkspace/>;
 if(code==="25-loan-refunds")return <LoanRefundsWorkspace/>;
 if(code==="26-loan-closure")return <LoanClosureWorkspace/>;
 if(code==="27-loan-delinquency")return <LoanDelinquencyWorkspace/>;
 if(code==="28-collection-workflow")return <CollectionWorkflowWorkspace/>;
 if(code==="29-loan-restructuring")return <LoanRestructuringWorkspace/>;
 if(code==="30-loan-relief")return <LoanReliefWorkspace/>;
 if(code==="31-loan-legal-cases")return <LoanLegalCasesWorkspace/>;
 if(code==="32-form-builder")return <FormBuilderWorkspace/>;
 if(code==="33-menu-builder")return <MenuBuilderWorkspace/>;
 if(code==="34-page-builder")return <PageBuilderWorkspace/>;
 if(code==="35-page-block-editor")return <PageBlockEditorWorkspace/>;
 if(code==="36-page-templates")return <PageTemplatesWorkspace/>;
 if(code==="37-frontend-sections")return <FrontendSectionsWorkspace/>;
 if(code==="38-navigation-rules")return <NavigationRulesWorkspace/>;
 if(code==="39-frontend-notifications")return <FrontendNotificationsWorkspace/>;
 if(code==="40-notification-templates")return <NotificationTemplatesWorkspace/>;
 if(code==="41-documentation")return <DocumentationWorkspace/>;
 if(code==="42-document-approvals")return <DocumentApprovalsWorkspace/>;
 if(code==="43-document-versions")return <DocumentVersionsWorkspace/>;
 if(code==="44-document-search")return <DocumentSearchWorkspace/>;
 if(code==="45-document-retention")return <DocumentRetentionWorkspace/>;
 if(code==="46-document-distribution")return <DocumentDistributionWorkspace/>;
 if(code==="47-document-access-log")return <DocumentAccessLogWorkspace/>;
 if(code==="48-document-audit-reports")return <DocumentAuditReportsWorkspace/>;
 if(code==="49-document-compliance")return <DocumentComplianceWorkspace/>;
 if(code==="50-document-governance")return <DocumentGovernanceWorkspace/>;
 return <main className="module-runtime">
  <header className="page-head">
   <div><span className="eyebrow">هسته مرکزی کسب‌وکار{activeMenu?" · "+activeMenu:""}</span><h1>{menuChildren.find(x=>x.path.includes("tab="+activeSection))?.title||module?.title||"فضای عملیاتی ماژول"}</h1><p className="muted">کد ماژول: {code}{activeSection?" · فضای عملیاتی: "+activeSection:""}</p></div>
   <a className="back-link" href="/">بازگشت به منوی مرکزی</a>
  </header>
  {!!menuChildren.length&&<nav className="module-subnav" aria-label="زیرمنوی عملیاتی">
   {menuChildren.map(item=>{
    const tab=new URL(item.path,"http://module.local").searchParams.get("tab")||"";
    const active=activeSection===tab;
    return <a key={item.id} className={active?"active":""} href={item.path}>{item.title}</a>;
   })}
  </nav>}
  {error&&<div className="error runtime-error">{error}</div>}
  {loading?<div className="runtime-panel">در حال دریافت داده واقعی...</div>:<div className="runtime-layout">
   <section className="runtime-panel">
    <div className="panel-title"><div><h2>{editingId?"ویرایش رکورد":"ثبت رکورد"}</h2><span>{fields.length} فیلد · {actions.length} عملیات مجاز</span></div>{editingId&&<button onClick={resetForm}>انصراف از ویرایش</button>}</div>
    <div className="field-pair"><label>عنوان رکورد<input value={title} onChange={e=>setTitle(e.target.value)} /></label><label>نوع رکورد<input value={recordType} onChange={e=>setRecordType(e.target.value)} /></label></div>
    <label>وضعیت<select value={status} onChange={e=>setStatus(e.target.value)}><option value="active">فعال</option><option value="pending">در انتظار</option><option value="closed">بسته</option></select></label>
    <div className="runtime-fields">{fields.map(f=><label key={f.field_key}>{f.title}{f.required?" *":""}{fieldInput(f)}</label>)}</div>
    <button className="primary wide" onClick={save} disabled={saving}>{saving?"در حال ذخیره...":editingId?"ذخیره تغییرات":"ثبت در PostgreSQL"}</button>
   </section>
   <section className="runtime-panel">
    <div className="panel-title"><h2>رکوردهای ثبت‌شده</h2><span>{items.length}</span></div>
    <div className="runtime-search"><input placeholder="جستجو در عنوان و داده..." value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==="Enter"&&load()}/><select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}><option value="">همه وضعیت‌ها</option><option value="active">فعال</option><option value="pending">در انتظار</option><option value="closed">بسته</option></select><button onClick={load}>جستجو</button></div>
    <div className="record-list">{visible.map(r=><article className="record-row" key={r.id}><div><strong>{r.title}</strong><small>{r.record_type} · {r.status}</small><code>{JSON.stringify(r.data)}</code></div><div className="record-actions"><button onClick={()=>edit(r)}>ویرایش</button><button className="danger" onClick={()=>remove(r.id)}>حذف</button></div></article>)}{!visible.length&&<div className="empty">رکوردی ثبت نشده است.</div>}</div>
   </section>
  </div>}
 </main>;
}


export default function ModulesPage(){return <Suspense fallback={<main className="module-runtime"><div className="runtime-panel">در حال آماده‌سازی فضای عملیاتی...</div></main>}><ModulesContent/></Suspense>}
