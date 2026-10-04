"use client";

import {useEffect,useState} from "react";

type UiSettings={fontScale:number;density:"comfortable"|"compact";sidebarWidth:number};

const KEY="naf-admin-ui-settings";
const DEFAULTS:UiSettings={fontScale:1.12,density:"comfortable",sidebarWidth:330};

function apply(settings:UiSettings){
 const root=document.documentElement;
 root.style.setProperty("--admin-font-scale",String(settings.fontScale));
 root.style.setProperty("--admin-density",settings.density==="compact"?"0.82":"1");
 root.style.setProperty("--admin-sidebar-width",settings.sidebarWidth+"px");
}

export default function AdminAppearance(){
 const [open,setOpen]=useState(false);
 const [settings,setSettings]=useState<UiSettings>(DEFAULTS);

 useEffect(()=>{
  try{
   const saved=localStorage.getItem(KEY);
   if(saved){
    const parsed={...DEFAULTS,...JSON.parse(saved)};
    setSettings(parsed);
    apply(parsed);
   }else apply(DEFAULTS);
  }catch{apply(DEFAULTS)}
 },[]);

 function update(patch:Partial<UiSettings>){
  const next={...settings,...patch};
  setSettings(next);
  apply(next);
  localStorage.setItem(KEY,JSON.stringify(next));
 }

 function reset(){
  setSettings(DEFAULTS);
  apply(DEFAULTS);
  localStorage.setItem(KEY,JSON.stringify(DEFAULTS));
 }

 return <div className="admin-appearance">
  <button
   type="button"
   className="appearance-trigger"
   aria-expanded={open}
   onClick={()=>setOpen(v=>!v)}
  >
   <span aria-hidden="true">Aa</span>
   تنظیمات نمایش
  </button>

  {open&&<div className="appearance-panel" role="dialog" aria-label="تنظیمات نمایش مرکز مدیریت">
   <div className="appearance-head">
    <div><strong>تنظیمات نمایش</strong><small>قابل ذخیره روی همین مرورگر</small></div>
    <button type="button" className="appearance-close" onClick={()=>setOpen(false)} aria-label="بستن">×</button>
   </div>

   <label className="appearance-control">
    <span>اندازه نوشته</span>
    <select value={settings.fontScale} onChange={e=>update({fontScale:Number(e.target.value)})}>
     <option value="1">استاندارد</option>
     <option value="1.08">خوانا</option>
     <option value="1.12">حرفه‌ای</option>
     <option value="1.18">درشت</option>
     <option value="1.25">خیلی درشت</option>
    </select>
   </label>

   <label className="appearance-control">
    <span>تراکم منو و محتوا</span>
    <select value={settings.density} onChange={e=>update({density:e.target.value as UiSettings["density"]})}>
     <option value="comfortable">خوانا</option>
     <option value="compact">فشرده</option>
    </select>
   </label>

   <label className="appearance-control">
    <span>عرض منوی مرکزی</span>
    <select value={settings.sidebarWidth} onChange={e=>update({sidebarWidth:Number(e.target.value)})}>
     <option value="300">300px</option>
     <option value="330">330px</option>
     <option value="360">360px</option>
     <option value="390">390px</option>
    </select>
   </label>

   <button type="button" className="appearance-reset" onClick={reset}>بازنشانی تنظیمات نمایش</button>
  </div>}
 </div>;
}
