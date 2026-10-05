"use client";
import {useEffect,useState} from "react";
import styles from "./WalletLedgerWorkspace.module.css";

type Wallet={id:string;code:string;title:string;currency:string;current_balance:number;opening_balance:number;status:string};
type Entry={id:string;entry_no:string;wallet_code:string;wallet_title:string;direction:string;amount:number;balance_after:number;description:string;created_at:string};

const api=async(path:string,options:RequestInit={})=>{const r=await fetch(path,{credentials:"include",...options});if(!r.ok)throw new Error((await r.json().catch(()=>({}))).error||"خطا در دریافت اطلاعات");return r.status===204?null:r.json()};

export default function WalletLedgerWorkspace(){
 const [tab,setTab]=useState("wallets"),[wallets,setWallets]=useState<Wallet[]>([]),[entries,setEntries]=useState<Entry[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState("");
 const [code,setCode]=useState(""),[title,setTitle]=useState(""),[opening,setOpening]=useState("0"),[selected,setSelected]=useState(""),[amount,setAmount]=useState(""),[entryNo,setEntryNo]=useState(""),[idem,setIdem]=useState(""),[direction,setDirection]=useState("credit"),[description,setDescription]=useState("");
 const params=typeof window!=="undefined"?new URLSearchParams(window.location.search):null;
 const qtab=params?.get("tab")||"wallet-ledger-1";
 const tabMap:Record<string,string>={"wallet-ledger-1":"wallets","wallet-ledger-2":"movements","wallet-ledger-3":"ledger","wallet-ledger-4":"credits","wallet-ledger-5":"debits"};
 useEffect(()=>{const v=tabMap[qtab]||"wallets";setTab(v)},[qtab]);
 const load=async()=>{setLoading(true);setError("");try{const [w,e]=await Promise.all([api("/api/wallet-ledger/wallets"),api("/api/wallet-ledger/entries?limit=100")]);setWallets(w);setEntries(e)}catch(e:any){setError(e.message)}finally{setLoading(false)}};
 useEffect(()=>{load()},[]);
 const submitWallet=async()=>{try{await api("/api/wallet-ledger/wallets",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({code,title,openingBalance:Number(opening)})});setCode("");setTitle("");setOpening("0");await load()}catch(e:any){setError(e.message)}};
 const postEntry=async()=>{if(!selected)return setError("کیف پول را انتخاب کنید");try{await api("/api/wallet-ledger/entries",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({walletId:selected,entryNo,direction,amount:Number(amount),description,idempotencyKey:idem})});setAmount("");setEntryNo("");setIdem("");setDescription("");await load()}catch(e:any){setError(e.message)}};
 const filtered=tab==="credits"?entries.filter(x=>x.direction==="credit"):tab==="debits"?entries.filter(x=>x.direction==="debit"):entries;
 return <main className={styles.shell} dir="rtl">
  <header><div><span className={styles.eyebrow}>هسته مالی</span><h1>کیف پول و دفترکل</h1><p>موجودی و گردش مالی با ثبت تراکنش اتمیک و قابل ردیابی.</p></div><div className={styles.stats}><b>{wallets.length}</b><span>کیف پول</span></div><div className={styles.stats}><b>{entries.length}</b><span>ثبت دفترکل</span></div></header>
  <nav className={styles.tabs}>{[["wallets","کیف پول‌ها"],["movements","گردش کیف پول"],["ledger","دفترکل"],["credits","بستانکاری"],["debits","بدهکاری"]].map(x=><button key={x[0]} className={tab===x[0]?styles.active:""} onClick={()=>setTab(x[0])}>{x[1]}</button>)}</nav>
  {error&&<div className={styles.error}>{error}</div>}
  {loading?<div className={styles.empty}>در حال بارگذاری...</div>:<>
   {tab==="wallets"&&<section className={styles.grid}><form className={styles.card} onSubmit={e=>{e.preventDefault();submitWallet()}}><h2>ایجاد کیف پول</h2><input value={code} onChange={e=>setCode(e.target.value)} placeholder="کد یکتا" required/><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="عنوان کیف پول" required/><input value={opening} onChange={e=>setOpening(e.target.value)} type="number" step="0.01" placeholder="موجودی افتتاحیه"/><button>ثبت کیف پول</button></form><div className={styles.list}>{wallets.map(w=><article className={styles.row} key={w.id}><div><strong>{w.title}</strong><small>{w.code} · {w.currency}</small></div><b>{Number(w.current_balance).toLocaleString("fa-IR")}</b></article>)}</div></section>}
   {tab==="movements"&&<section className={styles.grid}><form className={styles.card} onSubmit={e=>{e.preventDefault();postEntry()}}><h2>ثبت گردش</h2><select value={selected} onChange={e=>setSelected(e.target.value)} required><option value="">انتخاب کیف پول</option>{wallets.map(w=><option key={w.id} value={w.id}>{w.title} · {w.code}</option>)}</select><div className={styles.twocol}><select value={direction} onChange={e=>setDirection(e.target.value)}><option value="credit">بستانکاری</option><option value="debit">بدهکاری</option></select><input value={amount} onChange={e=>setAmount(e.target.value)} type="number" min="0.01" step="0.01" placeholder="مبلغ" required/></div><input value={entryNo} onChange={e=>setEntryNo(e.target.value)} placeholder="شماره ثبت" required/><input value={idem} onChange={e=>setIdem(e.target.value)} placeholder="کلید idempotency" required/><input value={description} onChange={e=>setDescription(e.target.value)} placeholder="شرح"/><button>ثبت گردش</button></form><EntryList items={entries}/></section>}
   {tab==="ledger"&&<EntryList items={entries}/>}
   {tab==="credits"&&<EntryList items={filtered}/>}
   {tab==="debits"&&<EntryList items={filtered}/>}
  </>}
 </main>
}
function EntryList({items}:{items:Entry[]}){return <section className={styles.list}><div className={styles.listHead}><h2>دفترکل</h2><span>{items.length} ثبت</span></div>{items.map(e=><article className={styles.row} key={e.id}><div><strong>{e.wallet_title}</strong><small>{e.entry_no} · {e.description||"بدون شرح"}</small></div><div className={e.direction==="credit"?styles.credit:styles.debit}>{e.direction==="credit"?"+":"−"} {Number(e.amount).toLocaleString("fa-IR")}</div><small>مانده: {Number(e.balance_after).toLocaleString("fa-IR")}</small></article>)}</section>}
