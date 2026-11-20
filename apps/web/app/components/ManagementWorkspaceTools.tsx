"use client";

import {useEffect,useRef,useState,type ReactNode} from "react";
import styles from "./ManagementWorkspaceTools.module.css";

type Row=Record<string,unknown>;
type ImportHandler=(rows:Record<string,string>[])=>void|Promise<void>;

function csvCell(value:unknown){
  let text=String(value??"");
  if(/^[=+@\t\r]/.test(text))text="'"+text;
  return /[",\n\r]/.test(text)?'"'+text.replace(/"/g,'""')+'"':text;
}
function downloadCsv(rows:Row[],filename:string){
  if(!rows.length)return;
  const columns=Array.from(new Set(rows.flatMap(row=>Object.keys(row))));
  const csv="\uFEFF"+[columns.map(csvCell).join(","),...rows.map(row=>columns.map(key=>csvCell(row[key])).join(","))].join("\r\n");
  const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));
  const anchor=document.createElement("a");anchor.href=url;anchor.download=filename.endsWith(".csv")?filename:filename+".csv";anchor.style.display="none";document.body.appendChild(anchor);anchor.click();anchor.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function parseCsv(input:string):string[][]{
  const rows:string[][]=[];let row:string[]=[],cell="",quoted=false;
  for(let i=0;i<input.length;i++){const ch=input[i];
    if(ch==='"'&&quoted&&input[i+1]==='"'){cell+='"';i++;}
    else if(ch==='"'){quoted=!quoted;}
    else if(ch===","&&!quoted){row.push(cell);cell="";}
    else if((ch==="\n"||ch==="\r")&&!quoted){if(ch==="\r"&&input[i+1]==="\n")i++;row.push(cell);if(row.some(v=>v.trim()))rows.push(row);row=[];cell="";}
    else cell+=ch;
  }
  row.push(cell);if(row.some(v=>v.trim()))rows.push(row);
  if(quoted)throw new Error("ساختار CSV ناقص است؛ کوتیشن بسته‌نشده وجود دارد.");
  return rows;
}

export function ManagementToolbar({rows=[],filename="گزارش",onCreate,onImport,onPrint,onShare,createLabel="ایجاد رکورد"}:{
  rows?:Row[];filename?:string;onCreate?:()=>void;onImport?:ImportHandler;onPrint?:()=>void;onShare?:()=>void;createLabel?:string;
}){
  const fileRef=useRef<HTMLInputElement>(null);const [preview,setPreview]=useState<Record<string,string>[]>([]);const [importError,setImportError]=useState("");const [busy,setBusy]=useState(false);
  async function readFile(file?:File){if(!file)return;setImportError("");try{
    const matrix=parseCsv((await file.text()).replace(/^\uFEFF/,""));if(matrix.length<2)throw new Error("فایل باید حداقل یک ردیف عنوان و یک ردیف داده داشته باشد.");
    const headers=matrix[0].map(x=>x.trim());if(headers.some(x=>!x)||new Set(headers).size!==headers.length)throw new Error("عنوان ستون‌ها خالی یا تکراری است.");
    if(matrix.length>10001)throw new Error("حداکثر ۱۰٬۰۰۰ ردیف در هر بار ورود مجاز است.");
    const dataRows=matrix.slice(1);const invalid=dataRows.findIndex(values=>values.length!==headers.length);if(invalid>=0)throw new Error("تعداد ستون‌های ردیف "+(invalid+2)+" با عنوان‌ها یکسان نیست.");
    setPreview(dataRows.map(values=>Object.fromEntries(headers.map((h,i)=>[h,values[i]??""]))));}
    catch(e){setImportError(e instanceof Error?e.message:"خواندن فایل ناموفق بود.");}}
  async function confirmImport(){if(!onImport)return;setBusy(true);try{await onImport(preview);setPreview([]);if(fileRef.current)fileRef.current.value="";}catch(e){setImportError(e instanceof Error?e.message:"ورود اطلاعات ناموفق بود.");}finally{setBusy(false);}}
  async function share(){if(onShare){onShare();return;}const url=window.location.href;try{if(navigator.share){await navigator.share({title:document.title,url});return;}if(navigator.clipboard)await navigator.clipboard.writeText(url);}catch{if(navigator.clipboard)await navigator.clipboard.writeText(url);}}
  return <div className={styles.toolbar} role="toolbar" aria-label="عملیات صفحه">
    {onCreate&&<button type="button" className={styles.primary} onClick={onCreate}>＋ {createLabel}</button>}
    {onImport&&<><button type="button" onClick={()=>fileRef.current?.click()}>⇧ ورود اطلاعات</button><input ref={fileRef} className={styles.hidden} type="file" accept=".csv,text/csv" onChange={e=>void readFile(e.target.files?.[0])}/></>}
    <button type="button" onClick={()=>downloadCsv(rows,filename)} disabled={!rows.length}>⇩ خروجی CSV</button>
    <button type="button" onClick={onPrint||(()=>window.print())}>▤ چاپ</button>
    <button type="button" onClick={()=>void share()}>↗ ارسال</button>
    {preview.length>0&&<ManagementDialog title="پیش‌نمایش ورود اطلاعات" onClose={()=>setPreview([])}><p className={styles.help}>تعداد {preview.length.toLocaleString("fa-IR")} ردیف آماده بررسی است. ثبت نهایی فقط پس از تأیید شما انجام می‌شود.</p>{importError&&<p className={styles.error}>{importError}</p>}<div className={styles.preview}>{preview.slice(0,8).map((row,i)=><div key={i}><b>{i+1}</b><span>{Object.entries(row).map(([k,v])=>k+": "+v).join(" · ")}</span></div>)}</div><div className={styles.dialogActions}><button type="button" onClick={()=>setPreview([])}>انصراف</button><button type="button" className={styles.primary} disabled={busy} onClick={()=>void confirmImport()}>{busy?"در حال ثبت…":"تأیید و ارسال برای ثبت"}</button></div></ManagementDialog>}
    {importError&&<span className={styles.error} role="alert">{importError}</span>}
  </div>;
}

export function ManagementDialog({title,children,onClose,dirty=false,initialFullscreen=false}:{title:string;children:ReactNode;onClose:()=>void;dirty?:boolean;initialFullscreen?:boolean}){
  const [fullscreen,setFullscreen]=useState(initialFullscreen);
  const closeRef=useRef(onClose);closeRef.current=onClose;
  useEffect(()=>{const key=(event:KeyboardEvent)=>{if(event.key==="Escape"){if(dirty&&!window.confirm("تغییرات ذخیره‌نشده هستند. پنجره بسته شود؟"))return;closeRef.current();}};window.addEventListener("keydown",key);return()=>window.removeEventListener("keydown",key);},[dirty]);
  function close(){if(dirty&&!window.confirm("تغییرات ذخیره‌نشده هستند. پنجره بسته شود؟"))return;onClose();}
  return <div className={styles.backdrop} role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)close();}}>
    <section className={fullscreen?styles.dialogFull:styles.dialog} role="dialog" aria-modal="true" aria-label={title} dir="rtl">
      <header className={styles.dialogHeader}><strong>{title}</strong><div><button type="button" onClick={()=>setFullscreen(v=>!v)} aria-label={fullscreen?"بازگشت به اندازه پنجره":"تمام‌صفحه"}>{fullscreen?"❐":"□"} {fullscreen?"بازگشت":"تمام‌صفحه"}</button><button type="button" onClick={close} aria-label="بستن پنجره">×</button></div></header>
      <div className={styles.dialogBody}>{children}</div>
    </section>
  </div>;
}
