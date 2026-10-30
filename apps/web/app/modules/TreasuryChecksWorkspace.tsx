"use client";
import {useEffect,useMemo,useState} from "react";
import {api} from "../../lib/api";
import {CanonicalPartyReference} from "../../components/CanonicalPartyReference";
import styles from "./TreasuryChecksWorkspace.module.css";

type Check={id:string;check_type:string;check_no:string;issuer_name:string;beneficiary_name?:string;bank_name?:string;due_date:string;amount:string;status:string;linked_bank_name?:string;counterparty_party_id?:string|null;canonical_counterparty_title?:string|null;counterparty_iban?:string|null};
type Party={id:string;party_code:string;title:string;party_type:string};
type PartyBankAccount={id:string;party_id:string;account_title:string;bank_name:string;iban:string};
type TreasuryBankAccount={id:string;bank_name:string;account_title:string;status:string};
type Event={id:number;check_no:string;check_type:string;from_status?:string;to_status:string;event_type:string;reason?:string;created_at:string};
const req=(path:string,opt:RequestInit={})=>api<any>(path,opt);

const labels:Record<string,string>={registered:"ثبت‌شده",awaiting_collection:"در انتظار وصول",deposited:"واگذار شده به بانک",assigned:"واگذار شده",issued:"صادر شده",in_transit:"در جریان",collected:"وصول‌شده",returned:"برگشتی",protested:"واخواست‌شده",refunded:"مسترد",cancelled:"باطل",settled:"تسویه‌شده"};

export default function TreasuryChecksWorkspace(){
 const [checks,setChecks]=useState<Check[]>([]),[events,setEvents]=useState<Event[]>([]),[parties,setParties]=useState<Party[]>([]),[partyBankAccounts,setPartyBankAccounts]=useState<PartyBankAccount[]>([]),[bankAccounts,setBankAccounts]=useState<TreasuryBankAccount[]>([]),[status,setStatus]=useState(""),[q,setQ]=useState(""),[error,setError]=useState(""),[saving,setSaving]=useState(false);
 const today=new Date().toISOString().slice(0,10);
 const [form,setForm]=useState({checkType:"received",checkNo:"",seriesNo:"",bankName:"",branchName:"",accountNo:"",issuerName:"",beneficiaryName:"",issueDate:"",dueDate:today,amount:"",description:"",counterpartyReference:"",counterpartyPartyId:"",counterpartyBankAccountId:"",bankAccountId:""});
 const load=async()=>{try{setError("");const x=await req("/api/treasury-checks/overview");setChecks(x.checks||[]);setEvents(x.events||[]);setParties(x.parties||[]);setPartyBankAccounts(x.partyBankAccounts||[]);setBankAccounts(x.bankAccounts||[])}catch(e){setError(e instanceof Error?e.message:"خطا")}};
 useEffect(()=>{load()},[]);
 const submit=async()=>{if(!form.counterpartyPartyId){setError("برای ثبت چک، طرف‌حساب مرکزی را انتخاب کنید.");return}setSaving(true);try{await req("/api/treasury-checks",{method:"POST",body:JSON.stringify(form)});setForm({...form,checkNo:"",amount:"",issuerName:"",beneficiaryName:"",counterpartyPartyId:"",counterpartyBankAccountId:""});await load()}catch(e){setError(e instanceof Error?e.message:"خطا")}finally{setSaving(false)}};
 const transition=async(id:string,next:string)=>{try{await req("/api/treasury-checks/"+id+"/status",{method:"PATCH",body:JSON.stringify({status:next})});await load()}catch(e){setError(e instanceof Error?e.message:"خطا")}};
 const selectedPartyAccounts=useMemo(()=>partyBankAccounts.filter(x=>x.party_id===form.counterpartyPartyId),[partyBankAccounts,form.counterpartyPartyId]);
 const visible=useMemo(()=>checks.filter(x=>(!status||x.status===status)&&(!q||[x.check_no,x.issuer_name,x.beneficiary_name||"",x.bank_name||"",x.canonical_counterparty_title||"",x.counterparty_iban||""].join(" ").toLowerCase().includes(q.toLowerCase()))),[checks,status,q]);
 const actions=(x:Check)=>{const a:string[]=[];if(x.status==="registered")a.push("awaiting_collection");if(["registered","awaiting_collection","deposited","assigned"].includes(x.status))a.push("deposited");if(["awaiting_collection","deposited","assigned","issued","in_transit"].includes(x.status))a.push("collected");if(["registered","awaiting_collection","deposited","assigned","issued","in_transit"].includes(x.status))a.push("returned");if(["returned","protested"].includes(x.status))a.push("settled");return [...new Set(a)]};
 return <main className={styles.root} dir="rtl">
  <header className={styles.header}><div><span>هسته خزانه · کنترل اسناد</span><h1>چک و اسناد</h1><p>ثبت، گردش وضعیت، وصول، برگشت و تسویه با تاریخچه غیرقابل‌ابهام رویدادها.</p></div><div className={styles.kpis}><b>{checks.filter(x=>x.check_type==="received").length}</b><span>دریافتی</span><b>{checks.filter(x=>x.check_type==="payable").length}</b><span>پرداختی</span></div></header>
  {error&&<div className={styles.error}>{error}</div>}
  <section className={styles.layout}>
   <article className={styles.panel}><h2>ثبت سند</h2><div className={styles.form}>
    <label>نوع<select value={form.checkType} onChange={e=>setForm({...form,checkType:e.target.value})}><option value="received">چک دریافتی</option><option value="payable">چک پرداختی</option></select></label>
    <label>شماره چک<input value={form.checkNo} onChange={e=>setForm({...form,checkNo:e.target.value})}/></label>
    <label>سریال<input value={form.seriesNo} onChange={e=>setForm({...form,seriesNo:e.target.value})}/></label>
    <label>بانک<input value={form.bankName} onChange={e=>setForm({...form,bankName:e.target.value})}/></label>
    <label>شعبه<input value={form.branchName} onChange={e=>setForm({...form,branchName:e.target.value})}/></label>
    <label>شماره حساب روی چک<input value={form.accountNo} onChange={e=>setForm({...form,accountNo:e.target.value})}/></label>
    <label>حساب بانکی سازمان<select value={form.bankAccountId} onChange={e=>setForm({...form,bankAccountId:e.target.value})}><option value="">بدون اتصال به حساب سازمان</option>{bankAccounts.map(a=><option key={a.id} value={a.id}>{a.bank_name} · {a.account_title}</option>)}</select></label>
    {form.checkType==="payable"&&<label>صادرکننده چک<input value={form.issuerName} onChange={e=>setForm({...form,issuerName:e.target.value})}/></label>}
    <label>{form.checkType==="received"?"صادرکننده / طرف‌حساب مرکزی":"ذی‌نفع / طرف‌حساب مرکزی"}<select required value={form.counterpartyPartyId} onChange={e=>setForm({...form,counterpartyPartyId:e.target.value,counterpartyBankAccountId:""})}><option value="">انتخاب طرف‌حساب</option>{parties.map(p=><option key={p.id} value={p.id}>{p.title} · {p.party_code}</option>)}</select></label>
    <label>حساب بانکی تأییدشده طرف‌حساب<select value={form.counterpartyBankAccountId} onChange={e=>setForm({...form,counterpartyBankAccountId:e.target.value})}><option value="">بدون اتصال حساب بانکی</option>{selectedPartyAccounts.map(a=><option key={a.id} value={a.id}>{a.bank_name} · {a.iban} · {a.account_title}</option>)}</select></label>
    <label>تاریخ صدور<input type="date" value={form.issueDate} onChange={e=>setForm({...form,issueDate:e.target.value})}/></label>
    <label>سررسید<input type="date" value={form.dueDate} onChange={e=>setForm({...form,dueDate:e.target.value})}/></label>
    <label>مبلغ<input type="number" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}/></label>
    <label className={styles.full}>شرح<input value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label>
   </div><button className={styles.primary} disabled={saving} onClick={submit}>{saving?"در حال ثبت...":"ثبت سند واقعی"}</button></article>
   <article className={styles.panel}><div className={styles.toolbar}><h2>دفتر اسناد</h2><select value={status} onChange={e=>setStatus(e.target.value)}><option value="">همه وضعیت‌ها</option>{Object.entries(labels).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select><input placeholder="جستجو" value={q} onChange={e=>setQ(e.target.value)}/></div>
    <div className={styles.list}>{visible.map(x=><div className={styles.row} key={x.id}><div><strong>{x.check_no} · {x.canonical_counterparty_title||(x.check_type==="received"?x.issuer_name:x.beneficiary_name||x.issuer_name)}</strong><small>{x.check_type==="received"?"دریافتی":"پرداختی"} · سررسید {x.due_date} · {labels[x.status]||x.status}{x.counterparty_iban?" · شبا "+x.counterparty_iban:""}</small><CanonicalPartyReference partyId={x.counterparty_party_id} title={x.canonical_counterparty_title}/></div><b>{Number(x.amount).toLocaleString("fa-IR")}</b><div className={styles.actions}>{actions(x).map(a=><button key={a} onClick={()=>transition(x.id,a)}>{labels[a]}</button>)}</div></div>)}</div>
   </article>
  </section>
  <section className={styles.panel}><h2>تاریخچه رویدادها</h2><div className={styles.events}>{events.slice(0,40).map(e=><div key={e.id}><strong>{e.check_no}</strong><span>{labels[e.from_status||""]||"ایجاد"} ← {labels[e.to_status]||e.to_status}</span><small>{new Date(e.created_at).toLocaleString("fa-IR")} {e.reason||""}</small></div>)}</div></section>
 </main>;
}
