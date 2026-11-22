"use client";
import {useEffect,useState} from "react";
import {api} from "../../../lib/api";
import {ManagementDialog,ManagementToolbar} from "../../components/ManagementWorkspaceTools";
type Seller={id:string;legal_name:string;display_name:string;status:string;commission_rate:string|number;accounting_party_id:string|null;accounting_party_title:string|null;payable_account_code:string|null;payable_account_name:string|null;[key:string]:unknown};
type PartyOption={id:string;party_code:string;title:string;account_code:string;account_name:string};
const statusLabel:Record<string,string>={pending:"در انتظار بررسی",active:"فعال",suspended:"تعلیق‌شده",closed:"بسته"};
export default function SellersPage(){
 const [items,setItems]=useState<Seller[]>([]),[parties,setParties]=useState<PartyOption[]>([]),[mappingDrafts,setMappingDrafts]=useState<Record<string,string>>({}),[legal,setLegal]=useState(""),[display,setDisplay]=useState(""),[rate,setRate]=useState("0"),[error,setError]=useState(""),[savingId,setSavingId]=useState(""),[selected,setSelected]=useState<Seller|null>(null),[createOpen,setCreateOpen]=useState(false);
 async function load(){try{const [r,p]=await Promise.all([api<{items:Seller[]}>("/api/marketplace/sellers"),api<{items:PartyOption[]}>("/api/marketplace/seller-accounting/options")]);setItems(r.items||[]);setParties(p.items||[]);setMappingDrafts(Object.fromEntries((r.items||[]).map(x=>[x.id,x.accounting_party_id||""])))}catch(e){setError(e instanceof Error?e.message:"خطا در دریافت فروشندگان و اطلاعات حسابداری")}}
 useEffect(()=>{void load()},[]);
 async function create(){setError("");try{await api("/api/marketplace/sellers",{method:"POST",body:JSON.stringify({legalName:legal,displayName:display,commissionRate:Number(rate)})});setLegal("");setDisplay("");setRate("0");setCreateOpen(false);await load()}catch(e){setError(e instanceof Error?e.message:"ثبت فروشنده ناموفق بود")}}
 async function saveAccountingMapping(item:Seller){
  setError("");setSavingId(item.id);
  try{await api("/api/marketplace/sellers/"+encodeURIComponent(item.id)+"/accounting",{method:"PATCH",body:JSON.stringify({accountingPartyId:mappingDrafts[item.id]||null})});await load();}
  catch(e){setError(e instanceof Error?e.message:"اتصال حسابداری فروشنده ذخیره نشد")}
  finally{setSavingId("")}
 }
 async function changeStatus(item:Seller,status:"active"|"suspended"){setError("");setSavingId(item.id);try{await api("/api/marketplace/sellers/"+encodeURIComponent(item.id)+"/status",{method:"PATCH",body:JSON.stringify({status})});await load()}catch(e){setError(e instanceof Error?e.message:"تغییر وضعیت فروشنده ناموفق بود")}finally{setSavingId("")}}
 return <main className="enterprise-main" dir="rtl">
  <header className="platform-header"><div><span className="section-kicker">مرکز فروشندگان</span><h1>فروشندگان</h1><p>مدیریت فروشندگان و اتصال کنترل‌شده هر فروشنده به طرف حساب تأمین‌کننده و حساب معین مالی.</p></div><a href="/platform">مرکز عملیات</a></header>
  <ManagementToolbar rows={items as unknown as Record<string,unknown>[]} filename="marketplace-sellers" onCreate={()=>setCreateOpen(true)}/>
  {createOpen&&<ManagementDialog title="افزودن فروشنده" onClose={()=>setCreateOpen(false)}><div className="platform-form"><input value={legal} onChange={e=>setLegal(e.target.value)} placeholder="نام حقوقی"/><input value={display} onChange={e=>setDisplay(e.target.value)} placeholder="نام نمایشی"/><input value={rate} onChange={e=>setRate(e.target.value)} type="number" min="0" max="100" placeholder="درصد کارمزد"/><button onClick={create} disabled={!legal.trim()||!display.trim()}>ثبت فروشنده</button></div></ManagementDialog>}
  <section className="platform-panel">
   
   {error&&<p className="enterprise-loading error" role="alert">{error}</p>}
   <div className="platform-list">{items.map(item=><article className="platform-row" key={item.id}>
    <div><b>{item.display_name}</b><small>{item.legal_name}</small></div><span>کارمزد {Number(item.commission_rate).toLocaleString("fa-IR")}%</span><strong>{statusLabel[item.status]||item.status}</strong>
    <div style={{display:"flex",flexWrap:"wrap",alignItems:"center",gap:8,gridColumn:"1 / -1",padding:"10px 0",borderTop:"1px solid #edf1f4"}}>
     <div style={{minWidth:190,flex:"1 1 230px"}}><b style={{fontSize:12}}>اتصال به حسابداری</b><small style={{display:"block",color:"#748294",marginTop:3}}>{item.accounting_party_title?("طرف حساب: "+item.accounting_party_title+" · حساب "+(item.payable_account_code||"—")):"هنوز طرف حساب مالی متصل نشده است"}</small></div>
     <select aria-label={"طرف حساب مالی "+item.display_name} value={mappingDrafts[item.id]??item.accounting_party_id??""} onChange={e=>setMappingDrafts(v=>({...v,[item.id]:e.target.value}))} style={{minWidth:230,maxWidth:"100%",padding:"9px 10px",border:"1px solid #d5dee8",borderRadius:7,background:"#fff",color:"#172333"}}>
      <option value="">بدون اتصال</option>{parties.map(p=><option key={p.id} value={p.id}>{p.party_code} · {p.title} · {p.account_code}</option>)}
     </select>
     <button type="button" onClick={()=>saveAccountingMapping(item)} disabled={savingId===item.id||(mappingDrafts[item.id]??item.accounting_party_id??"")===(item.accounting_party_id||"")} style={{padding:"9px 13px",border:0,borderRadius:7,background:"#087dcc",color:"#fff",fontWeight:700,cursor:"pointer"}}>{savingId===item.id?"در حال ذخیره…":"ذخیره اتصال"}</button>
     <div className="record-actions"><button type="button" onClick={()=>setSelected(item)}>مشاهده</button>{item.status==="active"?<button onClick={()=>changeStatus(item,"suspended")} disabled={savingId===item.id}>تعلیق</button>:<button onClick={()=>changeStatus(item,"active")} disabled={savingId===item.id}>{savingId===item.id?"در حال ذخیره…":"فعال‌سازی فروشنده"}</button>}</div>
    </div>
   </article>)}</div>
   {!items.length&&<div className="enterprise-loading">فروشنده‌ای ثبت نشده است.</div>}
  </section>
  {selected&&<ManagementDialog title={"جزئیات فروشنده "+selected.display_name} onClose={()=>setSelected(null)}><dl className="management-detail-grid">{Object.entries(selected).filter(([key])=>key!=="id").map(([key,value])=><div key={key}><dt>{key}</dt><dd>{value===null||value===undefined?"—":String(value)}</dd></div>)}</dl></ManagementDialog>}
 </main>;
}