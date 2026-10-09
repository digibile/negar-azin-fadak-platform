"use client";

import {useCallback,useEffect,useMemo,useState} from "react";
import {useSearchParams} from "next/navigation";
import styles from "./OrganizationWorkspace.module.css";
import {api} from "../../lib/api";

type Org={id:string;code:string;name:string;organization_type:string;national_id:string|null;registration_no:string|null;economic_code:string|null;status:string};
type Entity={id:string;organization_id:string|null;organization_name?:string|null;parent_id:string|null;entity_type:string;code:string;name:string;status:string;manager_name:string|null;address?:string|null;phone?:string|null};
type Center={id:string;organization_id:string|null;center_type:string;code:string;name:string;status:string;parent_id:string|null};
type Ownership={id:string;owner_entity_id:string;owned_entity_id:string;owner_name:string;owned_name:string;ownership_percent:number;ownership_type:string;status:string};
type Setting={id:string;organization_id:string|null;setting_key:string;setting_value:unknown;updated_at:string};
type Overview={organizations:Org[];entities:Entity[];centers:Center[];ownership:Ownership[];settings:Setting[]};
type Tab={key:string;title:string};
const TABS:Tab[]=[
 {key:"structure",title:"ساختار سازمان"},{key:"companies",title:"شرکت‌ها"},{key:"holdings",title:"هلدینگ‌ها"},
 {key:"branches",title:"شعب"},{key:"units",title:"واحدها"},{key:"departments",title:"دپارتمان‌ها"},
 {key:"cost",title:"مراکز هزینه"},{key:"revenue",title:"مراکز درآمد"},{key:"profit",title:"مراکز سود"},
 {key:"ownership",title:"ساختار مالکیت"},{key:"organizations",title:"سازمان‌ها"},{key:"settings",title:"تنظیمات سازمان"}
];
const ENTITY_LABEL:Record<string,string>={holding:"هلدینگ",company:"شرکت",branch:"شعبه",unit:"واحد",department:"دپارتمان"};
const CENTER_LABEL:Record<string,string>={cost:"هزینه",revenue:"درآمد",profit:"سود"};
const EMPTY_ORG={code:"",name:"",organizationType:"company",nationalId:"",registrationNo:"",economicCode:""};
const EMPTY_ENTITY={organizationId:"",parentId:"",entityType:"company",code:"",name:"",managerName:"",address:"",phone:""};
const EMPTY_CENTER={organizationId:"",parentId:"",centerType:"cost",code:"",name:""};
const EMPTY_OWN={ownerEntityId:"",ownedEntityId:"",ownershipPercent:"100",ownershipType:"direct"};
const EMPTY_SETTING={organizationId:"",settingKey:"",settingValue:"{}"};

export default function OrganizationWorkspace(){
 const searchParams=useSearchParams();
 const [tab,setTab]=useState("structure");
 const [data,setData]=useState<Overview>({organizations:[],entities:[],centers:[],ownership:[],settings:[]});
 const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const [q,setQ]=useState("");
 const [orgForm,setOrgForm]=useState(EMPTY_ORG),[editingOrg,setEditingOrg]=useState<string|null>(null);
 const [entityForm,setEntityForm]=useState(EMPTY_ENTITY),[editingEntity,setEditingEntity]=useState<string|null>(null);
 const [centerForm,setCenterForm]=useState(EMPTY_CENTER),[editingCenter,setEditingCenter]=useState<string|null>(null);
 const [ownForm,setOwnForm]=useState(EMPTY_OWN),[settingForm,setSettingForm]=useState(EMPTY_SETTING);

 const load=useCallback(async(showSpinner=true)=>{
  if(showSpinner)setLoading(true);
  setError("");
  try{
   const response=await api<Overview>("/api/organization/overview");
   setData({organizations:response.organizations||[],entities:response.entities||[],centers:response.centers||[],ownership:response.ownership||[],settings:response.settings||[]});
  }catch(e){setError(e instanceof Error?e.message:"دریافت اطلاعات سازمانی ناموفق بود");}
  finally{if(showSpinner)setLoading(false);}
 },[]);
 useEffect(()=>{const next=searchParams.get("tab");if(next&&TABS.some(x=>x.key===next))setTab(next);void load()},[searchParams,load]);

 const counts=useMemo(()=>({
  organizations:data.organizations.length,
  companies:data.entities.filter(x=>x.entity_type==="holding"||x.entity_type==="company").length,
  branches:data.entities.filter(x=>x.entity_type==="branch").length,
  units:data.entities.filter(x=>x.entity_type==="unit"||x.entity_type==="department").length
 }),[data]);
 const matches=(s:string)=>s.toLocaleLowerCase("fa-IR").includes(q.trim().toLocaleLowerCase("fa-IR"));
 const visibleEntities=useMemo(()=>data.entities.filter(x=>{
  const typeMatch=tab==="companies"?x.entity_type==="company":tab==="holdings"?x.entity_type==="holding":tab==="branches"?x.entity_type==="branch":tab==="units"?x.entity_type==="unit":tab==="departments"?x.entity_type==="department":true;
  return typeMatch&&(!q.trim()||matches(x.name)||matches(x.code)||matches(x.manager_name||"")||matches(x.organization_name||""));
 }),[data.entities,tab,q]);
 const visibleOrganizations=useMemo(()=>data.organizations.filter(x=>!q.trim()||matches(x.name)||matches(x.code)||matches(x.national_id||"")),[data.organizations,q]);
 const visibleCenters=useMemo(()=>data.centers.filter(x=>x.center_type===tab&&(!q.trim()||matches(x.name)||matches(x.code))),[data.centers,tab,q]);
 const visibleOwnership=useMemo(()=>data.ownership.filter(x=>!q.trim()||matches(x.owner_name)||matches(x.owned_name)),[data.ownership,q]);
 const visibleSettings=useMemo(()=>data.settings.filter(x=>!q.trim()||matches(x.setting_key)||matches(JSON.stringify(x.setting_value))),[data.settings,q]);

 const resetForms=()=>{setEditingOrg(null);setEditingEntity(null);setEditingCenter(null);setOrgForm(EMPTY_ORG);setEntityForm(EMPTY_ENTITY);setCenterForm(EMPTY_CENTER);setOwnForm(EMPTY_OWN);setSettingForm(EMPTY_SETTING)};
 const run=async(label:string,operation:()=>Promise<unknown>)=>{
  setSaving(true);setError("");setNotice("");
  try{await operation();await load(false);resetForms();setNotice(label+" با موفقیت ثبت شد.");}
  catch(e){setError(e instanceof Error?e.message:"عملیات انجام نشد");}
  finally{setSaving(false);}
 };
 const saveOrg=()=>run(editingOrg?"ویرایش سازمان":"ثبت سازمان",()=>api(editingOrg?"/api/organization/organizations/"+editingOrg:"/api/organization/organizations",{method:editingOrg?"PATCH":"POST",body:JSON.stringify(orgForm)}));
 const saveEntity=()=>run(editingEntity?"ویرایش موجودیت":"ثبت موجودیت",()=>api(editingEntity?"/api/organization/entities/"+editingEntity:"/api/organization/entities",{method:editingEntity?"PATCH":"POST",body:JSON.stringify(entityForm)}));
 const saveCenter=()=>run(editingCenter?"ویرایش مرکز":"ثبت مرکز",()=>api(editingCenter?"/api/organization/centers/"+editingCenter:"/api/organization/centers",{method:editingCenter?"PATCH":"POST",body:JSON.stringify(centerForm)}));
 const saveOwnership=()=>{
  const pct=Number(ownForm.ownershipPercent);
  if(!ownForm.ownerEntityId||!ownForm.ownedEntityId)return setError("مالک و شرکت زیرمجموعه را انتخاب کنید.");
  if(ownForm.ownerEntityId===ownForm.ownedEntityId)return setError("یک موجودیت نمی‌تواند مالک خودش باشد.");
  if(!Number.isFinite(pct)||pct<0||pct>100)return setError("درصد مالکیت باید بین صفر تا صد باشد.");
  return run("ثبت مالکیت",()=>api("/api/organization/ownership",{method:"POST",body:JSON.stringify({...ownForm,ownershipPercent:pct})}));
 };
 const saveSetting=()=>{
  if(!settingForm.settingKey.trim())return setError("کلید تنظیمات الزامی است.");
  let value:unknown;try{value=JSON.parse(settingForm.settingValue)}catch{return setError("مقدار تنظیمات باید JSON معتبر باشد.");}
  if(!settingForm.organizationId)return setError("سازمان مربوط به تنظیم را انتخاب کنید.");
  return run("ذخیره تنظیم سازمان",()=>api("/api/organization/settings/"+encodeURIComponent(settingForm.organizationId)+"/"+encodeURIComponent(settingForm.settingKey.trim()),{method:"PUT",body:JSON.stringify({value})}));
 };
 const editOrg=(x:Org)=>{setEditingOrg(x.id);setOrgForm({code:x.code,name:x.name,organizationType:x.organization_type,nationalId:x.national_id||"",registrationNo:x.registration_no||"",economicCode:x.economic_code||""});setTab("organizations")};
 const editEntity=(x:Entity)=>{setEditingEntity(x.id);setEntityForm({organizationId:x.organization_id||"",parentId:x.parent_id||"",entityType:x.entity_type,code:x.code,name:x.name,managerName:x.manager_name||"",address:x.address||"",phone:x.phone||""});setTab(x.entity_type==="holding"?"holdings":x.entity_type==="company"?"companies":x.entity_type==="branch"?"branches":x.entity_type==="unit"?"units":"departments")};
 const editCenter=(x:Center)=>{setEditingCenter(x.id);setCenterForm({organizationId:x.organization_id||"",parentId:x.parent_id||"",centerType:x.center_type,code:x.code,name:x.name});setTab(x.center_type)};
 const removeEntity=async(x:Entity)=>{
  if(!window.confirm("موجودیت «"+x.name+"» حذف شود؟ اگر زیرمجموعه یا وابستگی ثبت‌شده داشته باشد، پایگاه داده حذف را رد می‌کند."))return;
  await run("حذف موجودیت",()=>api("/api/organization/entities/"+x.id,{method:"DELETE"}));
 };
 const title=TABS.find(x=>x.key===tab)?.title||"مدیریت سازمان";
 const renderTree=(parentId:string|null,depth=0,ancestors:string[]=[]):React.ReactNode=>{
  const children=data.entities.filter(x=>x.parent_id===parentId&&(!q.trim()||matches(x.name)||matches(x.code)||matches(x.manager_name||"")));
  return children.filter(x=>!ancestors.includes(x.id)).map(x=><div className={styles.treeNode} key={x.id} style={{marginInlineStart:Math.min(depth,8)*16}}>
   <div className={styles.row}><div><b>{x.name}</b><small>{ENTITY_LABEL[x.entity_type]||x.entity_type} · {x.code}{x.manager_name?" · مدیر: "+x.manager_name:""}{x.organization_name?" · "+x.organization_name:""}</small></div><div className={styles.rowActions}><span className={styles.status}>{x.status==="active"?"فعال":x.status}</span><button type="button" onClick={()=>editEntity(x)}>ویرایش</button><button type="button" className={styles.danger} onClick={()=>void removeEntity(x)}>حذف</button></div></div>{depth<12&&renderTree(x.id,depth+1,[...ancestors,x.id])}
  </div>);
 };
 const entityFormVisible=["structure","companies","holdings","branches","units","departments"].includes(tab);
 const centerFormVisible=["cost","revenue","profit"].includes(tab);
 return <main className={styles.wrap} dir="rtl">
  <header className={styles.head}><div><span className={styles.muted}>منوی مرکزی سازمان · پنل ۰۲</span><h1>سازمان‌ها، هلدینگ‌ها و ساختار حقوقی</h1><p className={styles.muted}>مدیریت سلسله‌مراتب سازمانی، شرکت‌ها، شعب، واحدها، مراکز مدیریتی و مالکیت با داده‌های واقعی سامانه</p></div><button type="button" className={styles.primary} onClick={()=>void load()} disabled={loading}>به‌روزرسانی</button></header>
  {error&&<div role="alert" className={styles.error}>{error}</div>}{notice&&<div role="status" className={styles.notice}>{notice}</div>}
  <section className={styles.grid}>{[["سازمان‌ها",counts.organizations],["هلدینگ و شرکت",counts.companies],["شعب",counts.branches],["واحد و دپارتمان",counts.units]].map(([label,count])=><div className={styles.card} key={String(label)}><span>{label}</span><strong>{count}</strong></div>)}</section>
  <nav className={styles.tabs} aria-label="بخش‌های پنل سازمان">{TABS.map(x=><button type="button" className={tab===x.key?styles.active:""} onClick={()=>{setTab(x.key);setError("");setNotice("")}} key={x.key} aria-current={tab===x.key?"page":undefined}>{x.title}</button>)}</nav>
  <label className={styles.search}>جستجو در بخش جاری<input value={q} onChange={e=>setQ(e.target.value)} placeholder="نام، کد، مدیر یا کلید تنظیمات"/></label>
  {loading?<section className={styles.panel}>در حال دریافت اطلاعات از سامانه...</section>:<div className={styles.layout}>
   <section className={styles.panel}>
    <div className={styles.panelHeading}><div><h2>{tab==="structure"?"درخت سلسله‌مراتب سازمان":title}</h2><p className={styles.muted}>{tab==="structure"?"ساختار از والد به زیرمجموعه نمایش داده می‌شود.": "فقط داده‌های ثبت‌شده در پایگاه داده نمایش داده می‌شوند."}</p></div><span className={styles.count}>{tab==="structure"?data.entities.length:tab==="organizations"?visibleOrganizations.length:centerFormVisible?visibleCenters.length:tab==="ownership"?visibleOwnership.length:tab==="settings"?visibleSettings.length:visibleEntities.length} مورد</span></div>
    <div className={styles.rows}>
     {tab==="structure"&&<>{renderTree(null)}{data.entities.length===0&&<p className={styles.muted}>هنوز موجودیتی ثبت نشده است.</p>}</>}
     {tab==="organizations"&&<>{visibleOrganizations.map(x=><article className={styles.row} key={x.id}><div><b>{x.name}</b><small>{x.code} · {x.organization_type}{x.national_id?" · شناسه ملی "+x.national_id:""}{x.registration_no?" · ثبت "+x.registration_no:""}</small></div><div className={styles.rowActions}><span className={styles.status}>{x.status==="active"?"فعال":x.status}</span><button type="button" onClick={()=>editOrg(x)}>ویرایش</button></div></article>)}{visibleOrganizations.length===0&&<p className={styles.muted}>سازمانی ثبت نشده است.</p>}</>}
     {["companies","holdings","branches","units","departments"].includes(tab)&&<>{visibleEntities.map(x=><article className={styles.row} key={x.id}><div><b>{x.name}</b><small>{ENTITY_LABEL[x.entity_type]} · {x.code}{x.manager_name?" · مدیر: "+x.manager_name:""}{x.organization_name?" · "+x.organization_name:""}</small></div><div className={styles.rowActions}><span className={styles.status}>{x.status==="active"?"فعال":x.status}</span><button type="button" onClick={()=>editEntity(x)}>ویرایش</button><button type="button" className={styles.danger} onClick={()=>void removeEntity(x)}>حذف</button></div></article>)}{visibleEntities.length===0&&<p className={styles.muted}>موردی برای این دسته ثبت نشده است.</p>}</>}
     {centerFormVisible&&<>{visibleCenters.map(x=><article className={styles.row} key={x.id}><div><b>{x.name}</b><small>مرکز {CENTER_LABEL[x.center_type]} · {x.code}{x.parent_id?" · دارای والد":""}</small></div><div className={styles.rowActions}><span className={styles.status}>{x.status==="active"?"فعال":x.status}</span><button type="button" onClick={()=>editCenter(x)}>ویرایش</button></div></article>)}{visibleCenters.length===0&&<p className={styles.muted}>مرکزی ثبت نشده است.</p>}</>}
     {tab==="ownership"&&<>{visibleOwnership.map(x=><article className={styles.row} key={x.id}><div><b>{x.owner_name} ← {x.owned_name}</b><small>{x.ownership_type==="direct"?"مالکیت مستقیم":x.ownership_type} · {x.status==="active"?"فعال":x.status}</small></div><strong>{Number(x.ownership_percent).toLocaleString("fa-IR")}%</strong></article>)}{visibleOwnership.length===0&&<p className={styles.muted}>رابطه مالکیتی ثبت نشده است.</p>}</>}
     {tab==="settings"&&<>{visibleSettings.map(x=><article className={styles.row} key={x.id}><div><b>{x.setting_key}</b><small>{data.organizations.find(o=>o.id===x.organization_id)?.name||"تنظیم عمومی سازمان"}</small><code className={styles.value}>{JSON.stringify(x.setting_value)}</code></div><button type="button" onClick={()=>setSettingForm({organizationId:x.organization_id||"",settingKey:x.setting_key,settingValue:JSON.stringify(x.setting_value,null,2)})}>ویرایش مقدار</button></article>)}{visibleSettings.length===0&&<p className={styles.muted}>تنظیمی ثبت نشده است.</p>}</>}
    </div>
   </section>
   <aside className={styles.panel}>
    <div className={styles.panelHeading}><h2>{editingOrg||editingEntity||editingCenter?"ویرایش اطلاعات":"ثبت اطلاعات"}</h2>{(editingOrg||editingEntity||editingCenter)&&<button type="button" onClick={resetForms}>انصراف</button>}</div>
    {entityFormVisible&&<form className={styles.form} onSubmit={e=>{e.preventDefault();void saveEntity()}}>
     <label>نوع موجودیت<select required value={entityForm.entityType} onChange={e=>setEntityForm({...entityForm,entityType:e.target.value})}><option value="holding">هلدینگ</option><option value="company">شرکت</option><option value="branch">شعبه</option><option value="unit">واحد</option><option value="department">دپارتمان</option></select></label>
     <label>سازمان مرتبط<select value={entityForm.organizationId} onChange={e=>setEntityForm({...entityForm,organizationId:e.target.value})}><option value="">بدون سازمان</option>{data.organizations.map(x=><option value={x.id} key={x.id}>{x.name}</option>)}</select></label>
     <label>کد یکتا<input required maxLength={80} value={entityForm.code} onChange={e=>setEntityForm({...entityForm,code:e.target.value})}/></label>
     <label>نام موجودیت<input required maxLength={200} value={entityForm.name} onChange={e=>setEntityForm({...entityForm,name:e.target.value})}/></label>
     <label>موجودیت والد<select value={entityForm.parentId} onChange={e=>setEntityForm({...entityForm,parentId:e.target.value})}><option value="">بدون والد</option>{data.entities.filter(x=>x.id!==editingEntity).map(x=><option value={x.id} key={x.id}>{ENTITY_LABEL[x.entity_type]} · {x.name}</option>)}</select></label>
     <label>نام مدیر<input maxLength={200} value={entityForm.managerName} onChange={e=>setEntityForm({...entityForm,managerName:e.target.value})}/></label>
     <label>تلفن<input type="tel" maxLength={40} value={entityForm.phone} onChange={e=>setEntityForm({...entityForm,phone:e.target.value})}/></label>
     <label>نشانی<textarea rows={2} value={entityForm.address} onChange={e=>setEntityForm({...entityForm,address:e.target.value})}/></label>
     <button className={styles.primary+" "+styles.wide} type="submit" disabled={saving}>{saving?"در حال ذخیره...":editingEntity?"ذخیره تغییرات":"ثبت موجودیت"}</button>
    </form>}
    {tab==="organizations"&&<form className={styles.form} onSubmit={e=>{e.preventDefault();void saveOrg()}}>
     <label>نوع سازمان<select value={orgForm.organizationType} onChange={e=>setOrgForm({...orgForm,organizationType:e.target.value})}><option value="company">شرکت</option><option value="holding">هلدینگ</option><option value="nonprofit">غیرانتفاعی</option><option value="government">دولتی</option><option value="other">سایر</option></select></label>
     <label>کد سازمان<input required maxLength={80} value={orgForm.code} onChange={e=>setOrgForm({...orgForm,code:e.target.value})} disabled={Boolean(editingOrg)}/></label>
     <label>نام سازمان<input required maxLength={200} value={orgForm.name} onChange={e=>setOrgForm({...orgForm,name:e.target.value})}/></label>
     <label>شناسه ملی<input maxLength={32} value={orgForm.nationalId} onChange={e=>setOrgForm({...orgForm,nationalId:e.target.value})}/></label>
     <label>شماره ثبت<input maxLength={64} value={orgForm.registrationNo} onChange={e=>setOrgForm({...orgForm,registrationNo:e.target.value})}/></label>
     <label>شناسه اقتصادی<input maxLength={64} value={orgForm.economicCode} onChange={e=>setOrgForm({...orgForm,economicCode:e.target.value})}/></label>
     <button className={styles.primary+" "+styles.wide} type="submit" disabled={saving}>{saving?"در حال ذخیره...":editingOrg?"ذخیره تغییرات":"ثبت سازمان"}</button>
    </form>}
    {centerFormVisible&&<form className={styles.form} onSubmit={e=>{e.preventDefault();void saveCenter()}}>
     <label>نوع مرکز<select value={centerForm.centerType} onChange={e=>setCenterForm({...centerForm,centerType:e.target.value})}><option value="cost">هزینه</option><option value="revenue">درآمد</option><option value="profit">سود</option></select></label>
     <label>سازمان مرتبط<select value={centerForm.organizationId} onChange={e=>setCenterForm({...centerForm,organizationId:e.target.value})}><option value="">بدون سازمان</option>{data.organizations.map(x=><option value={x.id} key={x.id}>{x.name}</option>)}</select></label>
     <label>کد مرکز<input required maxLength={80} value={centerForm.code} onChange={e=>setCenterForm({...centerForm,code:e.target.value})} disabled={Boolean(editingCenter)}/></label>
     <label>نام مرکز<input required maxLength={200} value={centerForm.name} onChange={e=>setCenterForm({...centerForm,name:e.target.value})}/></label>
     <label>مرکز والد<select value={centerForm.parentId} onChange={e=>setCenterForm({...centerForm,parentId:e.target.value})}><option value="">بدون والد</option>{data.centers.filter(x=>x.id!==editingCenter&&x.center_type===centerForm.centerType).map(x=><option key={x.id} value={x.id}>{x.code} · {x.name}</option>)}</select></label>
     <button className={styles.primary+" "+styles.wide} type="submit" disabled={saving}>{saving?"در حال ذخیره...":editingCenter?"ذخیره تغییرات":"ثبت مرکز"}</button>
    </form>}
    {tab==="ownership"&&<form className={styles.form} onSubmit={e=>{e.preventDefault();void saveOwnership()}}>
     <label>مالک<select required value={ownForm.ownerEntityId} onChange={e=>setOwnForm({...ownForm,ownerEntityId:e.target.value})}><option value="">انتخاب مالک</option>{data.entities.map(x=><option value={x.id} key={x.id}>{x.name} · {ENTITY_LABEL[x.entity_type]}</option>)}</select></label>
     <label>شرکت یا موجودیت تحت مالکیت<select required value={ownForm.ownedEntityId} onChange={e=>setOwnForm({...ownForm,ownedEntityId:e.target.value})}><option value="">انتخاب زیرمجموعه</option>{data.entities.map(x=><option value={x.id} key={x.id}>{x.name} · {ENTITY_LABEL[x.entity_type]}</option>)}</select></label>
     <label>درصد مالکیت<input required type="number" min="0" max="100" step="0.0001" value={ownForm.ownershipPercent} onChange={e=>setOwnForm({...ownForm,ownershipPercent:e.target.value})}/></label>
     <label>نوع مالکیت<select value={ownForm.ownershipType} onChange={e=>setOwnForm({...ownForm,ownershipType:e.target.value})}><option value="direct">مستقیم</option><option value="indirect">غیرمستقیم</option><option value="joint">مشترک</option></select></label>
     <button className={styles.primary+" "+styles.wide} type="submit" disabled={saving}>ثبت رابطه مالکیت</button>
    </form>}
    {tab==="settings"&&<form className={styles.form} onSubmit={e=>{e.preventDefault();void saveSetting()}}>
     <label>سازمان<select required value={settingForm.organizationId} onChange={e=>setSettingForm({...settingForm,organizationId:e.target.value})}><option value="">انتخاب سازمان</option>{data.organizations.map(x=><option value={x.id} key={x.id}>{x.name}</option>)}</select></label>
     <label>کلید تنظیم<input required maxLength={120} value={settingForm.settingKey} onChange={e=>setSettingForm({...settingForm,settingKey:e.target.value})}/></label>
     <label className={styles.wide}>مقدار تنظیم (JSON)<textarea required rows={6} value={settingForm.settingValue} onChange={e=>setSettingForm({...settingForm,settingValue:e.target.value})}/></label>
     <button className={styles.primary+" "+styles.wide} type="submit" disabled={saving}>ذخیره تنظیمات</button>
    </form>}
    {tab==="structure"&&<p className={styles.muted}>برای ثبت هلدینگ، شرکت، شعبه یا واحد، نوع موجودیت را انتخاب کنید. والدها و سازمان مرتبط به‌صورت واقعی از پایگاه داده بارگذاری می‌شوند.</p>}
   </aside>
  </div>}
 </main>;
}
