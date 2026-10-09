"use client";

import {Suspense} from "react";

import {useEffect,useMemo,useState} from "react";
import {useSearchParams} from "next/navigation";
import AccountingWorkspace from "./AccountingWorkspace";
import AccountingFinanceWorkspace from "./AccountingFinanceWorkspace";
import TreasuryBankWorkspace from "./TreasuryBankWorkspace";
import TreasuryChecksWorkspace from "./TreasuryChecksWorkspace";
import SalesWorkspace from "./SalesWorkspace";
import PurchasingSupplyWorkspace from "./PurchasingSupplyWorkspace";
import InventoryWarehouseWorkspace from "./InventoryWarehouseWorkspace";
import LogisticsWorkspace from "./LogisticsWorkspace";
import WalletLedgerWorkspace from "./WalletLedgerWorkspace";
import DashboardWorkspace from "./DashboardWorkspace";
import OrganizationWorkspace from "./OrganizationWorkspace";
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
import SiteLaunchWorkspace from "./SiteLaunchWorkspace";
import FrontendSectionsWorkspace from "./FrontendSectionsWorkspace";
import FrontendManagementWorkspace from "./FrontendManagementWorkspace";
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
import DocumentGovernancePanelWorkspace from "./DocumentGovernancePanelWorkspace";
import OperationalModuleWorkspace from "./OperationalModuleWorkspace";
import CommercePanelWorkspace from "./CommercePanelWorkspace";
import MerchantManagementWorkspace from "./MerchantManagementWorkspace";

type Field={field_key:string;title:string;field_type:string;required:boolean;sort_order:number;options?:{options?:string[]}};
type ModuleInfo={id:number;code:string;title:string};
type Action={id:number;action_code:string;title:string;permission:string;is_active:boolean};
type MenuItem={id:string|number;parent_id:string|number|null;title:string;path:string;sort_order:number;permission?:string|null;is_active?:boolean};
type RecordItem={id:number;record_type:string;title:string;status:string;data:Record<string,unknown>;created_at:string;updated_at:string};

const api=(process.env.NEXT_PUBLIC_API_BASE_URL||process.env.NEXT_PUBLIC_API_URL||"").replace(/\/$/,"");
const url=(path:string)=>api+path;
const csrf=()=>document.cookie.split(";").map(x=>x.trim()).find(x=>x.startsWith("naf_csrf="))?.slice(9)||"";

function ModulesContent(){
 const searchParams=useSearchParams();
 const [code,setCode]=useState("");
 const [activeMenu,setActiveMenu]=useState("");
 const [activeSection,setActiveSection]=useState("");
 const [activeItem,setActiveItem]=useState("");
 const [panel,setPanel]=useState("");
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
   const c=searchParams.get("code")||"governance";
   const menu=searchParams.get("menu")||"";
   const tab=searchParams.get("tab")||"";
   const item=searchParams.get("item")||"";
   const panelParam=searchParams.get("panel")||"";
   setCode(c);setActiveMenu(menu);setActiveSection(tab);setActiveItem(item);setPanel(panelParam);
   setRecordType(tab||"record");
 },[searchParams]);
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
    const findMenu=(nodes:MenuItem[]):MenuItem|undefined=>{
      for(const node of nodes){
        if(node.path===`/modules/?code=${code}` || node.path?.includes(`code=${code}&`) || node.path?.includes(`code=${code}`)) return node;
        const nested=(node as any).child_items;
        if(Array.isArray(nested)){const found=findMenu(nested);if(found)return found;}
      }
      return undefined;
    };
    const parent=findMenu(tree);
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
type ModuleRouteContext = {
  code: string; module: ModuleInfo | null; menuChildren: MenuItem[]; error: string;
  activeMenu: string; items: RecordItem[]; actions: Action[]; panel: string; activeItem: string;
};
const operationalModuleCodes = [
"24-production","25-costing","27-receivables","28-payables","30-projects-cost-centers","31-fixed-assets",
    "32-tax-e-invoicing","33-budget-financial-control","34-financial-commitments","35-credit-financing","36-loans",
    "39-human-resources","40-ai-finance","41-ai-documents-ocr","42-audit-internal-control","43-communication-hub",
    "44-marketing-content","45-search-analytics","46-unified-applications","47-contracts-legal","48-shipping-delivery",
    "49-reconciliation","50-release-health"
];
const canonicalLandingCodes = ["10-domains","11-merchants","12-sellers","13-payments-settlement"];
const MODULE_ROUTE_REGISTRY: Record<string, (context: ModuleRouteContext) => React.ReactNode> = {
  "panel:form": () => <FormBuilderWorkspace />,
  "panel:menu": () => <MenuBuilderWorkspace />,
  "panel:frontend": () => <FrontendManagementWorkspace />,
  "panel:site-launch": () => <SiteLaunchWorkspace />,
  "panel:domains": () => <CommercePanelWorkspace mode="domains" />,
  "panel:acceptors": () => <MerchantManagementWorkspace />,
  "panel:sellers": () => <CommercePanelWorkspace mode="sellers" />,
  "panel:payments": () => <CommercePanelWorkspace mode="payments" />,
  "09-commerce-stores": () => <CommercePanelWorkspace mode="commerce" />,
  "01-dashboard": () => <DashboardWorkspace />,
  "02-organizations": () => <OrganizationWorkspace />,
  "03-users-access": () => <IdentityWorkspace />,
  "04-customers-360": () => <Customer360Workspace />,
  "05-smart-calendar": () => <SmartCalendarWorkspace />,
  "06-business-rules": () => <BusinessRulesWorkspace />,
  "07-sla": () => <SLAWorkspace />,
  "08-accounting-finance": () => <AccountingFinanceWorkspace />,
  "08-check-documents": () => <TreasuryChecksWorkspace />,
  "14-form-builder": () => <FormBuilderWorkspace />,
  "15-menu-builder": () => <MenuBuilderWorkspace />,
  "16-page-builder": () => <PageBuilderWorkspace />,
  "17-frontend-management": () => <FrontendSectionsWorkspace />,
  "18-notifications": () => <FrontendNotificationsWorkspace />,
  "19-documents-governance": () => <DocumentGovernancePanelWorkspace />,
  "20-system-settings": () => <CentralSettingsWorkspace />,
  "21-purchasing-supply": () => <PurchasingSupplyWorkspace />,
  "22-sales-revenue": () => <SalesWorkspace />,
  "23-inventory-warehouse": () => <InventoryWarehouseWorkspace />,
  "12-logistics-supply": () => <LogisticsWorkspace />,
  "26-treasury-bank": () => <TreasuryBankWorkspace />,
  "29-wallet-ledger": () => <WalletLedgerWorkspace />,
  "37-collateral-guarantees": () => <CollateralGuaranteesWorkspace />,
  "38-collections": () => <CollectionWorkflowWorkspace />,
  "command-center": () => <DashboardWorkspace />,
  "accounting-finance": () => <AccountingWorkspace />,
  "09-treasury-bank": () => <TreasuryBankWorkspace />,
  "10-wallet-ledger": () => <WalletLedgerWorkspace />,
  "01-governance": () => <DashboardWorkspace />,
  "dashboard": () => <DashboardWorkspace />,
  "governance": () => <DashboardWorkspace />,
  "security": () => <IdentityWorkspace />,
  "02-identity": () => <IdentityWorkspace />,
  "03-master-data": () => <MasterDataWorkspace />,
  "04-customer-360": () => <Customer360Workspace />,
  "central-settings": () => <CentralSettingsWorkspace />,
  "11-credit-facilities": () => <CreditFacilitiesWorkspace />,
  "12-credit-applications": () => <CreditApplicationsWorkspace />,
  "13-loan-contracts": () => <LoanContractsWorkspace />,
  "14-installment-schedules": () => <InstallmentSchedulesWorkspace />,
  "15-installment-collections": () => <InstallmentCollectionsWorkspace />,
  "16-collateral-guarantees": () => <CollateralGuaranteesWorkspace />,
  "17-digital-binder": () => <DigitalBinderWorkspace />,
  "18-identity-verification": () => <IdentityVerificationWorkspace />,
  "19-credit-scoring": () => <CreditScoringWorkspace />,
  "20-credit-decisions": () => <CreditDecisionsWorkspace />,
  "21-credit-committee": () => <CreditCommitteeWorkspace />,
  "22-credit-disbursement": () => <CreditDisbursementWorkspace />,
  "23-loan-settlement": () => <LoanSettlementWorkspace />,
  "24-loan-ledger": () => <LoanLedgerWorkspace />,
  "25-loan-refunds": () => <LoanRefundsWorkspace />,
  "26-loan-closure": () => <LoanClosureWorkspace />,
  "27-loan-delinquency": () => <LoanDelinquencyWorkspace />,
  "28-collection-workflow": () => <CollectionWorkflowWorkspace />,
  "29-loan-restructuring": () => <LoanRestructuringWorkspace />,
  "30-loan-relief": () => <LoanReliefWorkspace />,
  "31-loan-legal-cases": () => <LoanLegalCasesWorkspace />,
  "32-form-builder": () => <FormBuilderWorkspace />,
  "33-menu-builder": () => <MenuBuilderWorkspace />,
  "34-page-builder": () => <PageBuilderWorkspace />,
  "35-page-block-editor": () => <PageBlockEditorWorkspace />,
  "36-page-templates": () => <PageTemplatesWorkspace />,
  "37-frontend-sections": () => <FrontendSectionsWorkspace />,
  "38-navigation-rules": () => <NavigationRulesWorkspace />,
  "39-frontend-notifications": () => <FrontendNotificationsWorkspace />,
  "40-notification-templates": () => <NotificationTemplatesWorkspace />,
  "41-documentation": () => <DocumentationWorkspace />,
  "42-document-approvals": () => <DocumentApprovalsWorkspace />,
  "43-document-versions": () => <DocumentVersionsWorkspace />,
  "44-document-search": () => <DocumentSearchWorkspace />,
  "45-document-retention": () => <DocumentRetentionWorkspace />,
  "46-document-distribution": () => <DocumentDistributionWorkspace />,
  "47-document-access-log": () => <DocumentAccessLogWorkspace />,
  "48-document-audit-reports": () => <DocumentAuditReportsWorkspace />,
  "49-document-compliance": () => <DocumentComplianceWorkspace />,
  "50-document-governance": () => <DocumentGovernanceWorkspace />,
  ...Object.fromEntries(operationalModuleCodes.map(code => [code, ({code}: ModuleRouteContext) => <OperationalModuleWorkspace code={code} />])),
  ...Object.fromEntries(canonicalLandingCodes.map(code => [code, (context: ModuleRouteContext) => <CanonicalModuleLanding {...context} />]))
};

function CanonicalModuleLanding({ code, module, menuChildren, error, activeMenu, items, actions, panel, activeItem }: {
  code: string;
  module: ModuleInfo | null;
  menuChildren: MenuItem[];
  error: string;
  activeMenu: string;
  items: RecordItem[];
  actions: Action[];
  panel: string;
  activeItem: string;
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
  const panelTitles: Record<string,string> = {domains:"مدیریت دامنه‌ها",acceptors:"پذیرندگان",sellers:"فروشندگان",payments:"پرداخت و تسویه",form:"فرم‌ساز",menu:"منوساز",frontend:"مدیریت فرانت‌اند"};
  const panelTitle = panelTitles[panel] || "";
  const selected = activeMenu || "";
  const selectedChild = menuChildren.find(item => item.title === selected || item.path.includes(`item=${encodeURIComponent(activeItem)}`));
  const effectiveTitle = selectedChild?.title || activeMenu || panelTitle || module?.title || code;
  const childHref = selectedChild?.path ? selectedChild.path + (panel && !selectedChild.path.includes("panel=") ? (selectedChild.path.includes("?")?"&":"?")+"panel="+encodeURIComponent(panel) : "") : "";
  return <main className="module-runtime canonical-module" dir="rtl">
    <header className="page-head">
      <div><span className="eyebrow">منوی مرکزی سازمان · بخش عملیاتی</span><h1>{effectiveTitle}</h1><p className="muted">{selected ? `بخش «${selected}» از ${module?.title || code}` : "مسیر عملیاتی واقعی سامانه برای این بخش. ورودی‌ها از ساختار منوی پایگاه داده خوانده می‌شوند."}</p></div>
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

 const routeContext: ModuleRouteContext = {code,module,menuChildren,error,activeMenu,items,actions,panel,activeItem};
 const panelRenderer = panel ? MODULE_ROUTE_REGISTRY["panel:"+panel] : undefined;
 const routeRenderer = panelRenderer || MODULE_ROUTE_REGISTRY[code];
 if(routeRenderer)return routeRenderer(routeContext);

 return <main className="module-runtime">
  <header className="page-head">
   <div><span className="eyebrow">هسته مرکزی کسب‌وکار{activeMenu?" · "+activeMenu:""}</span><h1>{menuChildren.find(x=>x.path.includes("tab="+activeSection))?.title||module?.title||"فضای عملیاتی ماژول"}</h1><p className="muted">کد ماژول: {code}{activeSection?" · فضای عملیاتی: "+activeSection:""}</p></div>
   <a className="back-link" href="/">بازگشت به منوی مرکزی</a>
  </header>
  {!!menuChildren.length&&<nav className="module-subnav" aria-label="زیرمنوی عملیاتی">
   {menuChildren.map(item=>{
    const tab=new URL(item.path,"http://module.local").searchParams.get("tab")||"";
    const itemKey=new URL(item.path,"http://module.local").searchParams.get("item")||"";
    const active=activeSection===tab || activeItem===itemKey;
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
