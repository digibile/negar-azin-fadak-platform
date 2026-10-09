"use client";

import {useEffect,useState} from "react";
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
    {tab==="templates" ? <PageTemplatesWorkspace/> : <FrontendSectionsWorkspace/>}
  </main>;
}
