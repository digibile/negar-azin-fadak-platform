"use client";
import {useEffect,useState} from "react";
import {api} from "../../../lib/api";
export default function SettlementsPage(){const [items,setItems]=useState<any[]>([]),[error,setError]=useState("");
 useEffect(()=>{api<any>("/api/marketplace/settlements").then(x=>setItems(x.items||[])).catch(e=>setError(e.message||"خطا"))},[]);
 return <main className="enterprise-main" dir="rtl"><header className="platform-header"><div><span className="section-kicker">تسویه</span><h1>تسویه فروشندگان</h1><p>نمایش مانده‌ها و وضعیت تسویه واقعی</p></div><a href="/platform">مرکز عملیات</a></header><section className="platform-panel">{error&&<p className="enterprise-loading error">{error}</p>}{items.map(x=><div className="platform-row" key={x.id}><b>{x.settlement_no}</b><span>{x.gross_amount}</span><span>{x.net_amount}</span><small>{x.status}</small></div>)}{!items.length&&<p className="empty">تسویه‌ای ثبت نشده است.</p>}</section></main>