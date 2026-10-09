"use client";

import {useEffect,useState} from "react";
import Link from "next/link";
import {useSearchParams} from "next/navigation";
import PageTemplatesWorkspace from "./PageTemplatesWorkspace";
import FrontendSectionsWorkspace from "./FrontendSectionsWorkspace";

type Tab = "templates" | "sections";

export default function FrontendManagementWorkspace() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>(searchParams.get("tab")==="sections" ? "sections" : "templates");
  useEffect(() => { setTab(searchParams.get("tab")==="sections" ? "sections" : "templates"); }, [searchParams]);
  return <main dir="rtl" style={{maxWidth:1600,margin:"0 auto",padding:"20px 16px 40px",color:"var(--foreground, #182230)"}}>
    <header style={{display:"flex",flexWrap:"wrap",alignItems:"center",justifyContent:"space-between",gap:16,marginBottom:20}}>
      <div>
        <div style={{fontSize:12,opacity:.72,marginBottom:6}}>مرکز مدیریت نگار آذین فدک · پنل ۱۷</div>
        <h1 style={{fontSize:"clamp(24px,3vw,34px)",fontWeight:750,margin:"0 0 8px"}}>مدیریت فرانت‌اند و کتابخانه قالب‌ها</h1>
        <p style={{margin:0,opacity:.78,lineHeight:1.8}}>قالب‌های صفحات با نام مشخص، تعریف ساختار و چرخه انتشار؛ همراه با مدیریت بخش‌های قابل استفاده در صفحات.</p>
      </div>
      <nav aria-label="بخش‌های مدیریت فرانت‌اند" style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        <button type="button" aria-pressed={tab==="templates"} onClick={()=>setTab("templates")} style={{border:tab==="templates"?"1px solid #2563eb":"1px solid #cbd5e1",background:tab==="templates"?"#2563eb":"transparent",color:tab==="templates"?"#fff":"inherit",borderRadius:12,padding:"10px 16px",fontWeight:650,cursor:"pointer"}}>مدیریت قالب‌ها</button>
        <button type="button" aria-pressed={tab==="sections"} onClick={()=>setTab("sections")} style={{border:tab==="sections"?"1px solid #2563eb":"1px solid #cbd5e1",background:tab==="sections"?"#2563eb":"transparent",color:tab==="sections"?"#fff":"inherit",borderRadius:12,padding:"10px 16px",fontWeight:650,cursor:"pointer"}}>بخش‌های فرانت‌اند</button>
      </nav>
    </header>
    <section aria-label="پیش‌نمایش زنده برندها" style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",margin:"0 0 20px",padding:"14px",border:"1px solid #dbe3ef",borderRadius:16,background:"var(--card, #fff)"}}>
      <strong style={{fontSize:13,marginInlineEnd:6}}>پیش‌نمایش زنده سایت‌ها:</strong>
      <Link href="/store/digipay" style={{padding:"8px 12px",borderRadius:10,background:"#155eef",color:"#fff",fontSize:12,fontWeight:700}}>دیجی‌پی ↗</Link>
      <Link href="/store/digibile" style={{padding:"8px 12px",borderRadius:10,background:"#0f766e",color:"#fff",fontSize:12,fontWeight:700}}>دیجی‌بایل ↗</Link>
      <Link href="/store/technolife" style={{padding:"8px 12px",borderRadius:10,background:"#374151",color:"#fff",fontSize:12,fontWeight:700}}>تکنولایف ↗</Link>
      <Link href="/store/kipa" style={{padding:"8px 12px",borderRadius:10,background:"#166534",color:"#fff",fontSize:12,fontWeight:700}}>کیپا ↗</Link>
      <Link href="/store/vamcity" style={{padding:"8px 12px",borderRadius:10,background:"#115e59",color:"#fff",fontSize:12,fontWeight:700}}>وام‌سیتی ↗</Link>
      <Link href="/store/naf" style={{padding:"8px 12px",borderRadius:10,background:"#1e3a8a",color:"#fff",fontSize:12,fontWeight:700}}>نگار آذین فدک ↗</Link>
      <Link href="/store/digikala" style={{padding:"8px 12px",borderRadius:10,background:"#b91c1c",color:"#fff",fontSize:12,fontWeight:700}}>قالب فروشگاهی قرمز ↗</Link>
      <Link href="/store" style={{padding:"8px 12px",borderRadius:10,border:"1px solid #cbd5e1",color:"inherit",fontSize:12,fontWeight:700}}>سوکار ↗</Link>
    </section>
    {tab==="templates" ? <PageTemplatesWorkspace/> : <FrontendSectionsWorkspace/>}
  </main>;
}
