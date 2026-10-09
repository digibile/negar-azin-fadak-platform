"use client";

import {useEffect,useMemo,useState} from "react";
import type {ReactNode} from "react";
import {useSearchParams} from "next/navigation";
import styles from "./OrganizationWorkspace.module.css";
import {api} from "../../lib/api";

type Org={id:string;code:string;name:string;organization_type:string;national_id:string|null;registration_no:string|null;economic_code:string|null;status:string};
type Entity={id:string;organization_id:string|null;organization_name?:string|null;parent_id:string|null;entity_type:string;code:string;name:string;status:string;manager_name:string|null;address?:string|null;phone?:string|null};
type Center={id:string;organization_id:string|null;parent_id:string|null;center_type:string;code:string;name:string;status:string};
type Ownership={id:string;owner_entity_id:string;owned_entity_id:string;owner_name:string;owned_name:string;ownership_percent:number;ownership_type:string};
type Setting={id:string;organization_id:string;setting_key:string;setting_value:unknown};

const TABS=[["structure","ساختار سازمان"],["organizations","سازمان‌ها"],["companies","شرکت‌ها"],["holdings","هلدینگ‌ها"],["branches","شعب"],["units","واحدها"],["departments","دپارتمان‌ها"],["cost","مراکز هزینه"],["revenue","مراکز درآمد"],["profit","مراکز سود"],["ownership","ساختار مالکیت"],["settings","تنظیمات سازمان"]] as const;
const ENTITY_TYPES=[["holding","هلدینگ"],["company","شرکت"],["branch","شعبه"],["unit","واحد"],["department","دپارتمان"]] as const;
const CENTER_TYPES=[["cost","هزینه"],["revenue","درآمد"],["profit","سود"]] as const;
const API_BASE=(process.env.NEXT_PUBLIC_API_BASE_URL||process.env.NEXT_PUBLIC_API_URL||"").replace(/\/$/,"");
const csrf=()=>document.cookie.split(";").map(x=>x.trim()).find(x=>x.startsWith("naf_csrf="))?.slice(9)||"";

export default function OrganizationWorkspace(){
 const searchParams=useSearchParams();
 const [tab,setTab]=useState("structure");
 const [orgs,setOrgs]=useState<Org[]>([]);
 const [entities,setEntities]=useState<Entity[]>([]);
 const [centers,setCenters]=useState<Center[]>([]);
 const [ownership,setOwnership]=useState<Ownership[]>([]);
 const [settings,setSettings]=useState<Setting[]>([]);
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const [editingOrgId,setEditingOrgId]=useState<string|null>(null);
 const [editingEntityId,setEditingEntityId]=useState<string|null>(null);
 const [editingCenterId,setEditingCenterId]=useState<string|null>(null);
 const [orgForm,setOrgForm]=useState({code:"",name:"",organizationType:"company",nationalId:"",registrationNo:"",economicCode:"",status:"active"});
 const [entityForm,setEntityForm]=useState({organizationId:"",parentId:"",entityType:"company",code:"",name:"",managerName:"",address:"",phone:""});
 const [centerForm,setCenterForm]=useState({organizationId:"",parentId:"",centerType:"cost",code:"",name:""});
 const [ownForm,setOwnForm]=useState({ownerEntityId:"",ownedEntityId:"",ownershipPercent:"100",ownershipType:"direct"});
 const [settingForm,setSettingForm]=useState({organizationId:"",key:"",value:"{}"});

 useEffect(()=>{const next=searchParams.get("tab");if(next&&TABS.some(([key])=>key===next))setTab(next)},[searchParams]);
 const load=async()=>{
  setLoading(true);setError("");
  try{
   const r=await api<any>("/api/organization/overview");
   setOrgs(r.organizations||[]);setEntities(r.entities||[]);setCenters(r.centers||[]);setOwnership(r.ownership||[]);setSettings(r.settings||[]);
  }catch(e){setError(e instanceof Error?e.message:"خطا در دریافت اطلاعات سازمان");}
  finally{setLoading(false);}
 };
 useEffect(()=>{void load()},[]);
 const counts=useMemo(()=>({holding:entities.filter(x=>x.entity_type==="holding").length,company:entities.filter(x=>x.entity_type==="company").length,branch:entities.filter(x=>x.entity_type==="branch").length,unit:entities.filter(x=>x.entity_type==="unit"||x.entity_type==="department").length}),[entities]);

 const mutate=async(path:string,method:string,body?:unknown)=>{
  setSaving(true);setError("");setNotice("");
  try{
   const r=await fetch(API_BASE+path,{method,credentials:"include",headers:{"Content-Type":"application/json","X-CSRF-Token":csrf()},...(body===undefined?{}:{body:JSON.stringify(body)})});
   const response=await r.json().catch(()=>null);
   if(!r.ok)throw new Error(response?.error||"عملیات انجام نشد");
   setNotice("تغییرات با موفقیت در پایگاه داده ثبت شد.");
   await load();
   return true;
  }catch(e){setError(e instanceof Error?e.message:"خطا در ذخیره اطلاعات");return false;}
  finally{setSaving(false);}
 };
 const resetEntity=()=>{setEditingEntityId(null);setEntityForm({organizationId:"",parentId:"",entityType:tab==="holdings"?"holding":tab==="companies"?"company":tab==="branches"?"branch":tab==="units"?"unit":tab==="departments"?"department":"company",code:"",name:"",managerName:"",address:"",phone:""})};
 const editEntity=(x:Entity)=>{setEditingEntityId(x.id);setEntityForm({organizationId:x.organization_id||"",parentId:x.parent_id||"",entityType:x.entity_type,code:x.code,name:x.name,managerName:x.manager_name||"",address:x.address||"",phone:x.phone||""});setTab("structure");setError("");};
 const saveEntity=async()=>{if(!entityForm.code.trim()||!entityForm.name.trim())return setError("کد و نام موجودیت الزامی است.");const ok=await mutate("/api/organization/entities"+(editingEntityId?"/"+editingEntityId:""),editingEntityId?"PATCH":"POST",entityForm);if(ok)resetEntity();};
 const saveOrg=async()=>{if(!orgForm.code.trim()||!orgForm.name.trim())return setError("کد و نام سازمان الزامی است.");const ok=await mutate("/api/organization/organizations"+(editingOrgId?"/"+editingOrgId:""),editingOrgId?"PATCH":"POST",orgForm);if(ok){setEditingOrgId(null);setOrgForm({code:"",name:"",organizationType:"company",nationalId:"",registrationNo:"",economicCode:"",status:"active"});}};
 const editOrg=(o:Org)=>{setEditingOrgId(o.id);setOrgForm({code:o.code,name:o.name,organizationType:o.organization_type,nationalId:o.national_id||"",registrationNo:o.registration_no||"",economicCode:o.economic_code||"",status:o.status});setTab("organizations");};
 const saveCenter=async()=>{if(!centerForm.code.trim()||!centerForm.name.trim())return setError("کد و نام مرکز الزامی است.");const ok=await mutate("/api/organization/centers"+(editingCenterId?"/"+editingCenterId:""),editingCenterId?"PATCH":"POST",centerForm);if(ok){setEditingCenterId(null);setCenterForm({organizationId:"",parentId:"",centerType:tab==="revenue"?"revenue":tab==="profit"?"profit":"cost",code:"",name:""});}};
 const editCenter=(x:Center)=>{setEditingCenterId(x.id);setCenterForm({organizationId:x.organization_id||"",parentId:x.parent_id||"",centerType:x.center_type,code:x.code,name:x.name});setTab(x.center_type);};
 const saveOwnership=async()=>{const pct=Number(ownForm.ownershipPercent);if(!ownForm.ownerEntityId||!ownForm.ownedEntityId||ownForm.ownerEntityId===ownForm.ownedEntityId||!Number.isFinite(pct)||pct<0||pct>100)return setError("مالک و زیرمجموعه متفاوت و درصد مالکیت بین صفر تا صد انتخاب کنید.");const ok=await mutate("/api/organization/ownership","POST",{...ownForm,ownershipPercent:pct});if(ok)setOwnForm({ownerEntityId:"",ownedEntityId:"",ownershipPercent:"100",ownershipType:"direct"});};
 const saveSetting=async()=>{if(!settingForm.organizationId||!settingForm.key.trim())return setError("سازمان و کلید تنظیمات الزامی است.");let value:unknown;try{value=JSON.parse(settingForm.value)}catch{return setError("مقدار تنظیمات باید JSON معتبر باشد.");}const ok=await mutate("/api/organization/settings/"+encodeURIComponent(settingForm.organizationId)+"/"+encodeURIComponent(settingForm.key.trim()),"PUT",{value});if(ok)setSettingForm(x=>({...x,key:"",value:"{}"}));};
 const remove=async(path:string,label:string)=>{if(!window.confirm("«"+label+"» حذف شود؟ این کار ممکن است به دلیل وابستگی‌های سازمانی قابل بازگشت نباشد."))return;await mutate(path,"DELETE");};
 const entityList=entities.filter(x=>tab==="structure"||(tab==="companies"&&x.entity_type==="company")||(tab==="holdings"&&x.entity_type==="holding")||(tab==="branches"&&x.entity_type==="branch")||(tab==="units"&&x.entity_type==="unit")||(tab==="departments"&&x.entity_type==="department"));
 const renderTree=(parentId:string|null,depth=0):ReactNode=>entities.filter(x=>x.parent_id===parentId).map(x=><div key={x.id} style={{marginInlineStart:depth*16}}><div className={styles.row}><div><b>{x.name}</b><small>{x.code} · {ENTITY_TYPES.find(([k])=>k===x.entity_type)?.[1]||x.entity_type}{x.manager_name?" · مدیر: "+x.manager_name:""}</small></div><div><button type="button" onClick={()=>editEntity(x)}>ویرایش</button> <button type="button" className={styles.danger} onClick={()=>remove("/api/organization/entities/"+x.id,x.name)}>حذف</button></div></div>{renderTree(x.id,depth+1)}</div>);

 return <main className={styles.wrap} dir="rtl">
  <header className={styles.head}><div><span className={styles.muted}>منوی مرکزی سازمان · پنل ۰۲</span><h1>سازمان‌ها و شرکت‌ها</h1><p className={styles.muted}>ساختار هلدینگ، شرکت‌ها، شعب، نیروی انسانی، پروژه‌ها و مراکز مدیریتی</p></div><button className={styles.primary} onClick={()=>void load()} disabled={loading}>به‌روزرسانی</button></header>
  {error&&<div className={styles.error} role="alert">{error}</div>}{notice&&<div className={styles.notice} role="status">{notice}</div>}
  <section className={styles.grid}>{[["سازمان‌ها",orgs.length],["هلدینگ‌ها و شرکت‌ها",counts.holding+counts.company],["شعب",counts.branch],["واحدها و دپارتمان‌ها",counts.unit]].map(([label,value])=><div className={styles.card} key={String(label)}><span>{label}</span><strong>{value}</strong></div>)}</section>
  <nav className={styles.tabs} aria-label="بخش‌های سازمان">{TABS.map(([key,label])=><button type="button" className={tab===key?styles.active:""} onClick={()=>{setTab(key);setError("");}} key={key}>{label}</button>)}</nav>
  {loading?<section className={styles.panel}>در حال دریافت اطلاعات واقعی سازمان...</section>:<div className={styles.layout}>
   <section className={styles.panel}>
    <h2>{TABS.find(([key])=>key===tab)?.[1]}</h2>
    <div className={styles.rows}>
     {tab==="structure"&&renderTree(null)}
     {tab==="organizations"&&orgs.map(o=><div className={styles.row} key={o.id}><div><b>{o.name}</b><small>{o.code} · {o.organization_type} · {o.status}</small><small>{o.national_id||"بدون شناسه ملی"}{o.registration_no?" · ثبت "+o.registration_no:""}</small></div><div><button type="button" onClick={()=>editOrg(o)}>ویرایش</button> <button type="button" className={styles.danger} onClick={()=>remove("/api/organization/organizations/"+o.id,o.name)}>حذف</button></div></div>)}
     {["companies","holdings","branches","units","departments"].includes(tab)&&entityList.map(x=><div className={styles.row} key={x.id}><div><b>{x.name}</b><small>{x.code} · {x.entity_type}{x.manager_name?" · مدیر: "+x.manager_name:""}</small></div><div><button type="button" onClick={()=>editEntity(x)}>ویرایش</button> <button type="button" className={styles.danger} onClick={()=>remove("/api/organization/entities/"+x.id,x.name)}>حذف</button></div></div>)}
     {["cost","revenue","profit"].includes(tab)&&centers.filter(x=>x.center_type===tab).map(x=><div className={styles.row} key={x.id}><div><b>{x.name}</b><small>{x.code} · {x.status}</small></div><div><button type="button" onClick={()=>editCenter(x)}>ویرایش</button> <button type="button" className={styles.danger} onClick={()=>remove("/api/organization/centers/"+x.id,x.name)}>حذف</button></div></div>)}
     {tab==="ownership"&&ownership.map(x=><div className={styles.row} key={x.id}><div><b>{x.owner_name}</b><small>مالک {x.owned_name} · {x.ownership_type}</small><b>{x.ownership_percent}%</b></div><div><button type="button" onClick={()=>setOwnForm({ownerEntityId:x.owner_entity_id,ownedEntityId:x.owned_entity_id,ownershipPercent:String(x.ownership_percent),ownershipType:x.ownership_type})}>ویرایش</button> <button type="button" className={styles.danger} onClick={()=>remove("/api/organization/ownership/"+x.id,x.owner_name+" ← "+x.owned_name)}>حذف</button></div></div>)}
     {tab==="settings"&&settings.map(x=><div className={styles.row} key={x.id}><div><b>{orgs.find(o=>o.id===x.organization_id)?.name||"سازمان"}</b><small>{x.setting_key}</small><code>{JSON.stringify(x.setting_value)}</code></div></div>)}
     {tab!=="settings"&&((tab==="structure"||["companies","holdings","branches","units","departments"].includes(tab))?entityList.length===0:tab==="organizations"?orgs.length===0:tab==="ownership"?ownership.length===0:["cost","revenue","profit"].includes(tab)?centers.filter(x=>x.center_type===tab).length===0:false)&&<div className={styles.muted}>رکوردی ثبت نشده است.</div>}
    </div>
   </section>
   <aside className={styles.panel}>
    <h2>{tab==="organizations"?(editingOrgId?"ویرایش سازمان":"ثبت سازمان"):tab==="ownership"?"ثبت رابطه مالکیت":tab==="settings"?"تنظیمات سازمان":["cost","revenue","profit"].includes(tab)?(editingCenterId?"ویرایش مرکز":"ثبت مرکز"):editingEntityId?"ویرایش موجودیت":"ثبت موجودیت"}</h2>
    {tab==="organizations"?<div className={styles.form}>
     <label>کد سازمان<input value={orgForm.code} disabled={Boolean(editingOrgId)} onChange={e=>setOrgForm({...orgForm,code:e.target.value})}/></label><label>نام سازمان<input value={orgForm.name} onChange={e=>setOrgForm({...orgForm,name:e.target.value})}/></label>
     <label>نوع سازمان<select value={orgForm.organizationType} onChange={e=>setOrgForm({...orgForm,organizationType:e.target.value})}><option value="company">شرکت</option><option value="holding">هلدینگ</option><option value="nonprofit">غیرانتفاعی</option><option value="government">دولتی</option><option value="other">سایر</option></select></label>
     <label>شناسه ملی<input value={orgForm.nationalId} onChange={e=>setOrgForm({...orgForm,nationalId:e.target.value})}/></label><label>شماره ثبت<input value={orgForm.registrationNo} onChange={e=>setOrgForm({...orgForm,registrationNo:e.target.value})}/></label><label>کد اقتصادی<input value={orgForm.economicCode} onChange={e=>setOrgForm({...orgForm,economicCode:e.target.value})}/></label>
     <label>وضعیت<select value={orgForm.status} onChange={e=>setOrgForm({...orgForm,status:e.target.value})}><option value="active">فعال</option><option value="inactive">غیرفعال</option></select></label>
     <button className={styles.primary+" "+styles.wide} disabled={saving} onClick={()=>void saveOrg()}>{saving?"در حال ذخیره...":editingOrgId?"ذخیره تغییرات":"ثبت سازمان"}</button>{editingOrgId&&<button className={styles.wide} onClick={()=>{setEditingOrgId(null);setOrgForm({code:"",name:"",organizationType:"company",nationalId:"",registrationNo:"",economicCode:"",status:"active"})}}>لغو ویرایش</button>}
    </div>:["structure","companies","holdings","branches","units","departments"].includes(tab)?<div className={styles.form}>
     <label>نوع موجودیت<select value={entityForm.entityType} onChange={e=>setEntityForm({...entityForm,entityType:e.target.value})}>{ENTITY_TYPES.map(([key,label])=><option value={key} key={key}>{label}</option>)}</select></label>
     <label>سازمان مرتبط<select value={entityForm.organizationId} onChange={e=>setEntityForm({...entityForm,organizationId:e.target.value})}><option value="">بدون اتصال</option>{orgs.map(o=><option value={o.id} key={o.id}>{o.name}</option>)}</select></label>
     <label>کد<input value={entityForm.code} onChange={e=>setEntityForm({...entityForm,code:e.target.value})}/></label><label>نام<input value={entityForm.name} onChange={e=>setEntityForm({...entityForm,name:e.target.value})}/></label>
     <label>مدیر مسئول<input value={entityForm.managerName} onChange={e=>setEntityForm({...entityForm,managerName:e.target.value})}/></label><label>تلفن<input value={entityForm.phone} onChange={e=>setEntityForm({...entityForm,phone:e.target.value})}/></label>
     <label>نشانی<input value={entityForm.address} onChange={e=>setEntityForm({...entityForm,address:e.target.value})}/></label>
     <label>والد در ساختار<select value={entityForm.parentId} onChange={e=>setEntityForm({...entityForm,parentId:e.target.value})}><option value="">ریشه ساختار</option>{entities.filter(x=>x.id!==editingEntityId).map(x=><option value={x.id} key={x.id}>{x.name}</option>)}</select></label>
     <button className={styles.primary+" "+styles.wide} disabled={saving} onClick={()=>void saveEntity()}>{saving?"در حال ذخیره...":editingEntityId?"ذخیره تغییرات":"ثبت موجودیت"}</button>{editingEntityId&&<button className={styles.wide} onClick={resetEntity}>لغو ویرایش</button>}
    </div>:["cost","revenue","profit"].includes(tab)?<div className={styles.form}>
     <label>نوع مرکز<select value={centerForm.centerType} onChange={e=>setCenterForm({...centerForm,centerType:e.target.value})}>{CENTER_TYPES.map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label><label>سازمان مرتبط<select value={centerForm.organizationId} onChange={e=>setCenterForm({...centerForm,organizationId:e.target.value})}><option value="">بدون اتصال</option>{orgs.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></label>
     <label>کد مرکز<input value={centerForm.code} onChange={e=>setCenterForm({...centerForm,code:e.target.value})}/></label><label>نام مرکز<input value={centerForm.name} onChange={e=>setCenterForm({...centerForm,name:e.target.value})}/></label>
     <label>مرکز والد<select value={centerForm.parentId} onChange={e=>setCenterForm({...centerForm,parentId:e.target.value})}><option value="">بدون والد</option>{centers.filter(x=>x.id!==editingCenterId&&x.center_type===centerForm.centerType).map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
     <button className={styles.primary+" "+styles.wide} disabled={saving} onClick={()=>void saveCenter()}>{saving?"در حال ذخیره...":editingCenterId?"ذخیره تغییرات":"ثبت مرکز"}</button>{editingCenterId&&<button className={styles.wide} onClick={()=>{setEditingCenterId(null);setCenterForm({organizationId:"",parentId:"",centerType:tab,code:"",name:""})}}>لغو ویرایش</button>}
    </div>:tab==="ownership"?<div className={styles.form}>
     <label>مالک<select value={ownForm.ownerEntityId} onChange={e=>setOwnForm({...ownForm,ownerEntityId:e.target.value})}><option value="">انتخاب موجودیت</option>{entities.map(x=><option value={x.id} key={x.id}>{x.name}</option>)}</select></label><label>زیرمجموعه<select value={ownForm.ownedEntityId} onChange={e=>setOwnForm({...ownForm,ownedEntityId:e.target.value})}><option value="">انتخاب موجودیت</option>{entities.map(x=><option value={x.id} key={x.id}>{x.name}</option>)}</select></label>
     <label>درصد مالکیت<input type="number" min="0" max="100" step="0.01" value={ownForm.ownershipPercent} onChange={e=>setOwnForm({...ownForm,ownershipPercent:e.target.value})}/></label><label>نوع مالکیت<select value={ownForm.ownershipType} onChange={e=>setOwnForm({...ownForm,ownershipType:e.target.value})}><option value="direct">مستقیم</option><option value="indirect">غیرمستقیم</option><option value="joint">مشترک</option></select></label>
     <button className={styles.primary+" "+styles.wide} disabled={saving} onClick={()=>void saveOwnership()}>{saving?"در حال ذخیره...":"ثبت رابطه مالکیت"}</button>
    </div>:<div className={styles.form}>
     <label>سازمان<select value={settingForm.organizationId} onChange={e=>setSettingForm({...settingForm,organizationId:e.target.value})}><option value="">انتخاب سازمان</option>{orgs.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></label><label>کلید تنظیم<input value={settingForm.key} onChange={e=>setSettingForm({...settingForm,key:e.target.value})}/></label>
     <label className={styles.wide}>مقدار تنظیم (JSON)<textarea value={settingForm.value} rows={4} onChange={e=>setSettingForm({...settingForm,value:e.target.value})}/></label><button className={styles.primary+" "+styles.wide} disabled={saving} onClick={()=>void saveSetting()}>{saving?"در حال ذخیره...":"ذخیره تنظیم سازمان"}</button>
    </div>}
   </aside>
  </div>}
 </main>;
}
