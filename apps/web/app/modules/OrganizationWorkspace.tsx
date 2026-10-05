"use client";
import {useEffect,useMemo,useState} from "react";
import {useSearchParams} from "next/navigation";
import styles from "./OrganizationWorkspace.module.css";
import {api} from "../../lib/api";

type Org={id:string;code:string;name:string;organization_type:string;national_id:string|null;registration_no:string|null;economic_code:string|null;status:string};
type Entity={id:string;organization_id:string|null;parent_id:string|null;entity_type:string;code:string;name:string;status:string;manager_name:string|null};
type Center={id:string;organization_id:string|null;center_type:string;code:string;name:string;status:string};
type Ownership={id:string;owner_name:string;owned_name:string;ownership_percent:number;ownership_type:string};

export default function OrganizationWorkspace(){
 const [orgs,setOrgs]=useState<Org[]>([]),[entities,setEntities]=useState<Entity[]>([]),[centers,setCenters]=useState<Center[]>([]),[ownership,setOwnership]=useState<Ownership[]>([]);
 const searchParams=useSearchParams();
 const [tab,setTab]=useState("structure"),[error,setError]=useState(""),[saving,setSaving]=useState(false);
 useEffect(()=>{const t=searchParams.get("tab");if(t)setTab(t)},[searchParams]);
 const [orgForm,setOrgForm]=useState({code:"",name:"",organizationType:"company",nationalId:"",registrationNo:"",economicCode:""});
 const [entityForm,setEntityForm]=useState({organizationId:"",parentId:"",entityType:"company",code:"",name:"",managerName:""});
 const [centerForm,setCenterForm]=useState({organizationId:"",centerType:"cost",code:"",name:""});
 const [ownForm,setOwnForm]=useState({ownerEntityId:"",ownedEntityId:"",ownershipPercent:"100",ownershipType:"direct"});
 const load=async()=>{try{setError("");const r=await api<any>("/api/organization/overview");setOrgs(r.organizations||[]);setEntities(r.entities||[]);setCenters(r.centers||[]);setOwnership(r.ownership||[])}catch(e){setError(e instanceof Error?e.message:"خطا در دریافت اطلاعات")}};
 useEffect(()=>{load()},[searchParams]);
 const csrf=()=>document.cookie.split(";").map(x=>x.trim()).find(x=>x.startsWith("naf_csrf="))?.slice(9)||"";
 const post=async(path:string,body:any)=>{setSaving(true);try{const r=await fetch((process.env.NEXT_PUBLIC_API_BASE_URL||"")+path,{method:"POST",credentials:"include",headers:{"Content-Type":"application/json","X-CSRF-Token":csrf()},body:JSON.stringify(body)});const b=await r.json().catch(()=>null);if(!r.ok)throw new Error(b?.error||"عملیات انجام نشد");await load()}catch(e){setError(e instanceof Error?e.message:"خطا")}finally{setSaving(false)}};
 const counts=useMemo(()=>({holding:entities.filter(x=>x.entity_type==="holding").length,company:entities.filter(x=>x.entity_type==="company").length,branch:entities.filter(x=>x.entity_type==="branch").length,unit:entities.filter(x=>x.entity_type==="unit"||x.entity_type==="department").length}),[entities]);
 const addOrg=()=>post("/api/organization/organizations",orgForm);
 const addEntity=()=>post("/api/organization/entities",entityForm);
 const addCenter=()=>post("/api/organization/centers",centerForm);
 const addOwnership=()=>post("/api/organization/ownership",ownForm);
 return <main className={styles.wrap}>
  <header className={styles.head}><div><span className={styles.muted}>منوی مرکزی سازمان · ۰۲</span><h1>مدیریت سازمان و هلدینگ</h1><p className={styles.muted}>ساختار سازمانی، شرکت‌ها، شعب، واحدها و مراکز مدیریتی</p></div><button className={styles.primary} onClick={load}>به‌روزرسانی</button></header>
  {error&&<div className={styles.error}>{error}</div>}
  <section className={styles.grid}>{[["سازمان‌ها",orgs.length],["هلدینگ/شرکت",counts.holding+counts.company],["شعب",counts.branch],["واحدها و دپارتمان‌ها",counts.unit]].map(([a,b])=><div className={styles.card} key={String(a)}><span>{a}</span><strong>{b}</strong></div>)}</section>
  <nav className={styles.tabs}>{[["structure","ساختار سازمان"],["companies","شرکت‌ها"],["holdings","هلدینگ‌ها"],["branches","شعب"],["units","واحدها"],["departments","دپارتمان‌ها"],["cost","مراکز هزینه"],["revenue","مراکز درآمد"],["profit","مراکز سود"],["ownership","ساختار مالکیت"],["settings","تنظیمات سازمان"]].map(([k,t])=><button className={tab===k?styles.active:""} onClick={()=>setTab(k)} key={k}>{t}</button>)}</nav>
  <div className={styles.layout}>
   <section className={styles.panel}>
    <h2>{tab==="structure"?"درخت موجودیت‌های سازمان":tab==="holdings"?"هلدینگ‌ها":tab==="ownership"?"ساختار مالکیت":tab==="settings"?"تنظیمات سازمان":tab.includes("companies")?"شرکت‌ها":tab.includes("branches")?"شعب":"فهرست "+(["units","departments"].includes(tab)?"واحدها و دپارتمان‌ها":"مراکز")}</h2>
    <div className={styles.rows}>
     {tab==="settings"?<div className={styles.form}>{orgs.map(o=><div className={styles.row} key={o.id}><div><b>{o.name}</b><small>{o.code} · {o.organization_type}</small></div><span>{o.status}</span></div>)}</div>:tab==="ownership"?ownership.map(x=><div className={styles.row} key={x.id}><div><b>{x.owner_name}</b><small>مالک {x.owned_name}</small></div><b>{x.ownership_percent}%</b></div>):
      tab==="cost"||tab==="revenue"||tab==="profit"?centers.filter(x=>x.center_type===tab).map(x=><div className={styles.row} key={x.id}><div><b>{x.name}</b><small>{x.code} · {x.center_type}</small></div><span>{x.status}</span></div>):
      entities.filter(x=>tab==="structure"|| (tab==="companies"&&x.entity_type==="company") || (tab==="branches"&&x.entity_type==="branch") || (tab==="units"&&x.entity_type==="unit") || (tab==="departments"&&x.entity_type==="department")).map(x=><div className={styles.row} key={x.id}><div><b>{x.name}</b><small>{x.code} · {x.entity_type}{x.manager_name?" · مدیر: "+x.manager_name:""}</small></div><span>{x.status}</span></div>)}
     {tab!=="settings"&&((tab==="ownership"?ownership:tab==="cost"||tab==="revenue"||tab==="profit"?centers:entities).length===0)&&<div className={styles.muted}>رکوردی ثبت نشده است.</div>}
    </div>
   </section>
   <aside className={styles.panel}>
    <h2>ثبت اطلاعات</h2>
    {tab==="companies"||tab==="branches"||tab==="units"||tab==="departments"||tab==="structure"?<div className={styles.form}>
      <label>نوع موجودیت<select value={entityForm.entityType} onChange={e=>setEntityForm({...entityForm,entityType:e.target.value})}><option value="holding">هلدینگ</option><option value="company">شرکت</option><option value="branch">شعبه</option><option value="unit">واحد</option><option value="department">دپارتمان</option></select></label>
      <label>کد<input value={entityForm.code} onChange={e=>setEntityForm({...entityForm,code:e.target.value})}/></label><label>نام<input value={entityForm.name} onChange={e=>setEntityForm({...entityForm,name:e.target.value})}/></label><label>نام مدیر<input value={entityForm.managerName} onChange={e=>setEntityForm({...entityForm,managerName:e.target.value})}/></label>
      <label>والد<select value={entityForm.parentId} onChange={e=>setEntityForm({...entityForm,parentId:e.target.value})}><option value="">بدون والد</option>{entities.map(x=><option value={x.id} key={x.id}>{x.name}</option>)}</select></label>
      <button className={styles.primary+" "+styles.wide} disabled={saving} onClick={addEntity}>ثبت موجودیت</button>
     </div>:
     tab==="ownership"?<div className={styles.form}><label>مالک<select value={ownForm.ownerEntityId} onChange={e=>setOwnForm({...ownForm,ownerEntityId:e.target.value})}><option value="">انتخاب</option>{entities.map(x=><option value={x.id} key={x.id}>{x.name}</option>)}</select></label><label>زیرمجموعه<select value={ownForm.ownedEntityId} onChange={e=>setOwnForm({...ownForm,ownedEntityId:e.target.value})}><option value="">انتخاب</option>{entities.map(x=><option value={x.id} key={x.id}>{x.name}</option>)}</select></label><label>درصد مالکیت<input type="number" min="0" max="100" value={ownForm.ownershipPercent} onChange={e=>setOwnForm({...ownForm,ownershipPercent:e.target.value})}/></label><button className={styles.primary+" "+styles.wide} onClick={addOwnership}>ثبت مالکیت</button></div>:
     tab==="cost"||tab==="revenue"||tab==="profit"?<div className={styles.form}><label>کد<input value={centerForm.code} onChange={e=>setCenterForm({...centerForm,code:e.target.value,centerType:tab})}/></label><label>نام<input value={centerForm.name} onChange={e=>setCenterForm({...centerForm,name:e.target.value})}/></label><button className={styles.primary+" "+styles.wide} onClick={addCenter}>ثبت مرکز</button></div>:
     <div className={styles.form}><label>کد سازمان<input value={orgForm.code} onChange={e=>setOrgForm({...orgForm,code:e.target.value})}/></label><label>نام سازمان<input value={orgForm.name} onChange={e=>setOrgForm({...orgForm,name:e.target.value})}/></label><label>شناسه ملی<input value={orgForm.nationalId} onChange={e=>setOrgForm({...orgForm,nationalId:e.target.value})}/></label><label>شماره ثبت<input value={orgForm.registrationNo} onChange={e=>setOrgForm({...orgForm,registrationNo:e.target.value})}/></label><button className={styles.primary+" "+styles.wide} onClick={addOrg}>ثبت سازمان</button></div>}
   </aside>
  </div>
 </main>
}
