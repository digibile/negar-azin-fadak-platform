"use client";
import {useEffect,useMemo,useState} from "react";

type Field={id:string;key:string;label:string;type:string;required:boolean;placeholder?:string;help?:string;options?:string[];width?:string};
type Block={id:string;type:string;content:string;settings?:Record<string,unknown>};
const id=()=>globalThis.crypto?.randomUUID?.()||Math.random().toString(36).slice(2)+Date.now();
const fieldTypes=[["text","متن"],["email","ایمیل"],["tel","تلفن"],["number","عدد"],["date","تاریخ"],["datetime-local","تاریخ و زمان"],["textarea","متن چندخطی"],["select","انتخابی"],["radio","گزینه‌ای"],["checkbox","تأیید"],["file","فایل"],["hidden","مخفی"]];
const blockTypes=[["hero","هدر اصلی"],["heading","عنوان"],["text","متن غنی"],["image","تصویر"],["columns","ستون‌ها"],["cards","کارت‌ها"],["button","دکمه"],["form","فرم"],["divider","جداکننده"],["spacer","فاصله"],["html","HTML امن"]];

export function FormBuilder({initial,onSave}:{initial?:Field[];onSave:(v:Field[])=>Promise<void>}){
 const [fields,setFields]=useState<Field[]>(initial||[]),[active,setActive]=useState<string|null>(null);
 useEffect(()=>setFields(initial||[]),[initial]);
 const current=fields.find(x=>x.id===active);
 const add=()=>{const f:Field={id:id(),key:"field_"+(fields.length+1),label:"فیلد جدید",type:"text",required:false,width:"full"};setFields(v=>[...v,f]);setActive(f.id)};
 const patch=(key:string,value:unknown)=>setFields(v=>v.map(x=>x.id===active?{...x,[key]:value}:x));
 const move=(i:number,d:number)=>setFields(v=>{const a=[...v],j=i+d;if(j<0||j>=a.length)return a;[a[i],a[j]]=[a[j],a[i]];return a});
 return <div className="builder-pro">
  <div className="builder-toolbar"><div><strong>ساختار فرم</strong><small>{fields.length} فیلد · اعتبارسنجی سمت سرور</small></div><div><button onClick={add}>+ افزودن فیلد</button><button className="primary" onClick={()=>onSave(fields)}>ذخیره نسخه</button></div></div>
  <div className="builder-layout"><aside className="builder-outline">{fields.map((f,i)=><button className={active===f.id?"active":""} key={f.id} onClick={()=>setActive(f.id)}><b>{i+1}</b><span>{f.label}</span><small>{f.type}</small></button>)}{!fields.length&&<p className="muted">هنوز فیلدی ساخته نشده است.</p>}</aside>
  <section className="builder-canvas"><div className="preview-form">{fields.map((f,i)=><div className={"preview-field "+(f.width==="half"?"half":"")} key={f.id}><label>{f.label}{f.required&&" *"}</label>{f.type==="textarea"?<textarea placeholder={f.placeholder}/>:f.type==="select"?<select><option>{f.placeholder||"انتخاب کنید"}</option></select>:f.type==="checkbox"?<label><input type="checkbox"/> {f.label}</label>:<input type={f.type} placeholder={f.placeholder}/>} {f.help&&<small>{f.help}</small>}<div className="builder-inline-actions"><button onClick={()=>move(i,-1)}>↑</button><button onClick={()=>move(i,1)}>↓</button><button className="danger" onClick={()=>{setFields(v=>v.filter(x=>x.id!==f.id));setActive(null)}}>حذف</button></div></div>)}</div></section>
  <aside className="builder-inspector">{current?<><h3>تنظیمات فیلد</h3><label>کلید<input value={current.key} onChange={e=>patch("key",e.target.value)}/></label><label>عنوان<input value={current.label} onChange={e=>patch("label",e.target.value)}/></label><label>نوع<select value={current.type} onChange={e=>patch("type",e.target.value)}>{fieldTypes.map(x=><option key={x[0]} value={x[0]}>{x[1]}</option>)}</select></label><label>راهنما<input value={current.help||""} onChange={e=>patch("help",e.target.value)}/></label><label>Placeholder<input value={current.placeholder||""} onChange={e=>patch("placeholder",e.target.value)}/></label><label>عرض<select value={current.width||"full"} onChange={e=>patch("width",e.target.value)}><option value="full">کامل</option><option value="half">نیمه</option></select></label><label className="check"><input type="checkbox" checked={current.required} onChange={e=>patch("required",e.target.checked)}/> الزامی</label></>:<p className="muted">یک فیلد را برای ویرایش انتخاب کنید.</p>}</aside></div>
 </div>;
}

export function PageBuilder({initial,onSave}:{initial?:Block[];onSave:(v:Block[])=>Promise<void>}){
 const [blocks,setBlocks]=useState<Block[]>(initial||[]),[active,setActive]=useState<string|null>(null);
 useEffect(()=>setBlocks(initial||[]),[initial]);
 const current=blocks.find(x=>x.id===active);
 const add=(type:string)=>{const b:Block={id:id(),type,content:type==="hero"?"عنوان اصلی شما":type==="button"?"مشاهده بیشتر":type==="form"?"شناسه فرم":"محتوای جدید"};setBlocks(v=>[...v,b]);setActive(b.id)};
 const patch=(k:string,v:unknown)=>setBlocks(xs=>xs.map(x=>x.id===active?{...x,[k]:v}:x));
 const move=(i:number,d:number)=>setBlocks(v=>{const a=[...v],j=i+d;if(j<0||j>=a.length)return a;[a[i],a[j]]=[a[j],a[i]];return a});
 const palette=useMemo(()=>blockTypes,[]);
 const presets:[string,Block[]][]=[["صفحه اصلی",[ {id:id(),type:"hero",content:"عنوان اصلی",settings:{}},{id:id(),type:"cards",content:"خدمات و مزیت‌ها",settings:{}},{id:id(),type:"form",content:"contact",settings:{}}]],["فرود تبلیغاتی",[{id:id(),type:"hero",content:"پیشنهاد ویژه",settings:{}},{id:id(),type:"text",content:"توضیح پیشنهاد و مزایا",settings:{}},{id:id(),type:"button",content:"شروع",settings:{}}]],["ورود",[ {id:id(),type:"hero",content:"ورود به حساب",settings:{}},{id:id(),type:"form",content:"login",settings:{}}]],["ثبت‌نام",[ {id:id(),type:"hero",content:"ایجاد حساب",settings:{}},{id:id(),type:"form",content:"register",settings:{}}]],["کپچر",[ {id:id(),type:"hero",content:"فرم دریافت سرنخ",settings:{}},{id:id(),type:"form",content:"lead-capture",settings:{}}]]];
 return <div className="builder-pro">
  <div className="builder-toolbar"><div><strong>صفحه‌ساز حرفه‌ای</strong><small>صفحات اصلی، فرود، ورود، ثبت‌نام و کپچر</small></div><div>{presets.map(([name,items])=><button key={name} onClick={()=>{setBlocks(items);setActive(items[0]?.id||null)}}>{name}</button>)}<button className="primary" onClick={()=>onSave(blocks)}>ذخیره نسخه</button></div></div>
  <div className="builder-layout"><aside className="builder-palette"><h3>بلوک‌ها</h3>{palette.map(x=><button key={x[0]} onClick={()=>add(x[0])}>{x[1]} <span>+</span></button>)}</aside>
  <section className="builder-canvas page-preview">{blocks.map((b,i)=><article className={"page-block "+(active===b.id?"selected":"")} key={b.id} onClick={()=>setActive(b.id)}><span className="block-type">{b.type}</span><div>{b.type==="hero"?<><h1>{b.content}</h1><p>ساختار قابل انتشار برای صفحات اصلی، فرود، فروشگاه و معرفی سرویس.</p></>:b.type==="heading"?<h2>{b.content}</h2>:b.type==="button"?<button className="primary">{b.content}</button>:b.type==="form"?<div className="form-placeholder">فرم: {b.content}</div>:b.type==="image"?<div className="image-placeholder">ناحیه تصویر</div>:b.type==="divider"?<hr/>:b.type==="spacer"?<div style={{height:48}}/>:<p>{b.content}</p>}</div><div className="builder-inline-actions"><button onClick={e=>{e.stopPropagation();move(i,-1)}}>↑</button><button onClick={e=>{e.stopPropagation();move(i,1)}}>↓</button><button className="danger" onClick={e=>{e.stopPropagation();setBlocks(v=>v.filter(x=>x.id!==b.id));setActive(null)}}>حذف</button></div></article>)}</section>
  <aside className="builder-inspector">{current?<><h3>تنظیمات بلوک</h3><label>نوع<select value={current.type} onChange={e=>patch("type",e.target.value)}>{blockTypes.map(x=><option key={x[0]} value={x[0]}>{x[1]}</option>)}</select></label><label>محتوا<textarea rows={8} value={current.content} onChange={e=>patch("content",e.target.value)}/></label><label>نمایش در موبایل<select value={String(current.settings?.mobile??true)} onChange={e=>patch("settings",{...(current.settings||{}),mobile:e.target.value==="true"})}><option value="true">نمایش</option><option value="false">مخفی</option></select></label></>:<p className="muted">یک بلوک را برای تنظیمات انتخاب کنید.</p>}</aside></div>
 </div>;
}
