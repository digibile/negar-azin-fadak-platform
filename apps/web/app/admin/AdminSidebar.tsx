"use client";

import Link from "next/link";
import {useEffect,useMemo,useState} from "react";
import {usePathname,useRouter} from "next/navigation";
import {api} from "../../lib/api";
import styles from "./AdminSidebar.module.css";

type DynamicChild={id:string|number;menu_key:string|null;parent_id:string|number|null;title:string;path:string;icon?:string|null;sort_order:number;permission:string|null};
type DynamicMenuItem={id:string;menu_key:string|null;parent_id:string|null;title:string;path:string;permission:string|null;children:string[];child_items?:DynamicChild[];sort_order:number;panel_sort_order:number;is_shared:boolean};

function SearchIcon(){return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="m16 16 4.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>}
function ChevronIcon(){return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 9 5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
function HomeIcon(){return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3.5 10 8.5-7 8.5 7v10.5a1 1 0 0 1-1 1h-5.5v-6h-4v6H4.5a1 1 0 0 1-1-1V10Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>}

export default function AdminSidebar(){
 const pathname=usePathname();
 const router=useRouter();
 const [menuItems,setMenuItems]=useState<DynamicMenuItem[]>([]);
 const [query,setQuery]=useState("");
 const [error,setError]=useState("");
 const [openMenus,setOpenMenus]=useState<Record<string,boolean>>({});
 const [updateAvailable,setUpdateAvailable]=useState(false);

 useEffect(()=>{let alive=true;
  Promise.all([
   api<{items:DynamicMenuItem[]}>("/api/dashboard/menu-tree?panel=admin"),
   api<{updateAvailable?:boolean}>("/api/platform/update-status")
  ]).then(([menus,update])=>{if(alive){setMenuItems(menus.items||[]);setUpdateAvailable(Boolean(update.updateAvailable))}})
   .catch(e=>{if(alive)setError(e instanceof Error?e.message:"خطا در دریافت ساختار سامانه")});
  const timer=window.setInterval(async()=>{try{const update=await api<{updateAvailable?:boolean}>("/api/platform/update-status");if(alive)setUpdateAvailable(Boolean(update.updateAvailable))}catch{}}
  ,30000);
  return()=>{alive=false;window.clearInterval(timer)};
 },[]);

 const childItems=(item:DynamicMenuItem):DynamicChild[]=>{
  if(item.child_items?.length)return [...item.child_items].sort((a,b)=>a.sort_order-b.sort_order);
  const code=item.menu_key||"";
  const aliases:Record<string,string[]>={
   dashboard:["dashboard","executive","finance","sales","operations","branches","kpi","alerts","activity","notifications"],
   "02-identity":["identity-1","identity-2","identity-3","identity-4","identity-5"],
   "03-master-data":["master-data-1","master-data-2","master-data-3","master-data-4","master-data-5"],
   "04-customer-360":["customer-360-1","customer-360-2","customer-360-3","customer-360-4","customer-360-5"],
   "05-smart-calendar":["smart-calendar-1","smart-calendar-2","smart-calendar-3","smart-calendar-4","smart-calendar-5"],
   "06-business-rules":["business-rules-1","business-rules-2","business-rules-3","business-rules-4","business-rules-5"],
   "07-sla":["sla-1","sla-2","sla-3","sla-4","sla-5"],
   "08-accounting-finance":["accounting-finance-1","accounting-finance-2","accounting-finance-3","accounting-finance-4","accounting-finance-5"],
   "09-treasury-bank":["treasury-bank-1","treasury-bank-2","treasury-bank-3","treasury-bank-4","treasury-bank-5"],
   "10-wallet-ledger":["wallet-ledger-1","wallet-ledger-2","wallet-ledger-3","wallet-ledger-4","wallet-ledger-5"]
  };
  const tabs=aliases[code]||[];
  return (item.children||[]).map((title,i)=>({
   id:item.id+":"+i,
   menu_key:code+":"+(i+1),
   parent_id:item.id,
   title,
   path:"/modules/?code="+encodeURIComponent(code)+"&tab="+encodeURIComponent(tabs[i]||title),
   sort_order:i+1,
   permission:item.permission
  }));
 };
 const sidebarModules=useMemo(()=>{
  const titles:Record<string,string[]>={"01-governance":["داشبورد اصلی","داشبورد مدیرعامل","KPI و شاخص‌ها","هشدارها","فعالیت‌ها"],"02-identity":["کاربران","نقش‌ها","گروه‌های کاربری","مجوزها","ورود و نشست‌ها"],"03-master-data":["تعاریف پایه","کدها و شناسه‌ها","دسته‌بندی‌ها","واحدها","سوابق تغییر"],"04-customer-360":["پرونده مشتری","مشخصات هویتی","تعاملات","سوابق خرید","نمای مالی"],"05-smart-calendar":["تقویم کاری","تعطیلات","رویدادها","سررسیدها","برنامه‌ریزی"],"06-business-rules":["قواعد","شرایط","اقدامات","اولویت اجرا","نسخه قواعد"],"07-sla":["تعهدات خدمت","سطح سرویس","زمان پاسخ","زمان حل","نقض تعهد"],"08-accounting-finance":["دفتر حساب‌ها","اسناد حسابداری","دوره‌های مالی","مرکز هزینه","گزارش مالی"],"09-treasury-bank":["حساب‌های بانکی","دریافت‌ها","پرداخت‌ها","مغایرت بانکی","تنخواه"],"10-wallet-ledger":["دفترکل کیف پول","حساب‌های کیف پول","گردش‌ها","تسویه کیف پول","گزارش دفترکل"]};
  const modules:DynamicMenuItem[]=[];
  for(const root of menuItems) for(const child of (root.child_items||[])){
   const match=child.path.match(/[?&]code=([^&]+)/); const code=match?decodeURIComponent(match[1]):child.menu_key?.split(":")[0]||""; const n=Number(code.slice(0,2));
   if(n>=1&&n<=10&&/^\\d{2}-/.test(code)) modules.push({id:String(child.id),menu_key:code,parent_id:null,title:child.title,path:child.path,permission:child.permission,children:titles[code]||[],child_items:[],sort_order:n,panel_sort_order:n,is_shared:true});
  }
  return modules.sort((a,b)=>a.sort_order-b.sort_order);
 },[menuItems]);

 const filtered=useMemo(()=>{
  const q=query.trim().toLocaleLowerCase("fa-IR");
  if(!q)return menuItems;
  return menuItems.filter(item=>
   (item.title+" "+childItems(item).map(child=>child.title).join(" ")).toLocaleLowerCase("fa-IR").includes(q)
  );
 },[query,sidebarModules]);

 const childUrl=(child:DynamicChild)=>child.path||null;
 const moduleUrl=(item:DynamicMenuItem)=>{
  if(item.path&&item.path!=="#"){
   if(item.menu_key==="users-security")return "/modules/?code=security";
   if(item.menu_key==="central-settings")return "/modules/?code=central-settings";
   return item.path;
  }
  return null;
 };
 const active=(item:DynamicMenuItem)=>{
  const url=moduleUrl(item);
  return Boolean(url&&pathname===url.split("?")[0]);
 };
 const toggleMenu=(id:string)=>setOpenMenus(v=>({...v,[id]:!v[id]}));
 const openModule=(item:DynamicMenuItem,e:React.MouseEvent<HTMLElement>)=>{
  const url=moduleUrl(item); if(!url)return;
  const target=e.target as HTMLElement;
  if(target.closest("summary .master-chevron"))return;
  e.preventDefault(); router.push(url);
 };

 return <aside className={styles["enterprise-sidebar"]} aria-label="منوی مرکزی سازمان">
  <div className={styles["enterprise-brand"]}>
   <div className={styles["brand-symbol"]} aria-hidden="true">ن</div>
   <div className={styles["enterprise-brand-copy"]}>
    <strong>مرکز مدیریت نگار آذین فدک</strong>
    <span>منوی مرکزی سازمان · نسخه ۲۰۲۶</span>
   </div>
  </div>

  <div className={styles["sidebar-command"]}>
   <Link className={styles["sidebar-command-main"]+" "+(pathname==="/admin"?styles["active"]:"")} href="/admin">
    <span className={styles["sidebar-command-icon"]}><HomeIcon/></span>
    <div><b>مرکز فرماندهی</b><small>نمای کلی و وضعیت سامانه</small></div>
   </Link>
   <label className={styles["sidebar-search"]}>
    <span><SearchIcon/></span>
    <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="جستجوی منو و زیرمنو..." aria-label="جستجوی منو"/>
    {query&&<button type="button" aria-label="پاک کردن جستجو" onClick={()=>setQuery("")}>×</button>}
   </label>
  </div>

  <div className={styles["sidebar-caption"]}>
   <span>کاتالوگ عملیاتی</span>
   <b>{filtered.length}/10</b>
  </div>
  {error&&<div className={styles["sidebar-menu-error"]}>{error}</div>}

  <nav className={styles["master-nav"]}>
   {filtered.map(item=>{
    const url=moduleUrl(item);
    const isCurrent=active(item);
    const isOpen=Boolean(query)||isCurrent||Boolean(openMenus[item.id]);
    return <div className={styles["master-item"]+" "+(isCurrent?styles["is-current"]:"")+" "+(isOpen?styles["is-open"]:"")} key={item.id}>
     <div className={styles["master-header"]}>
      <button type="button" className={styles["master-chevron-button"]} onClick={()=>toggleMenu(item.id)} aria-expanded={isOpen} aria-label={(isOpen?"بستن ":"باز کردن ")+item.title}>
       <span className={styles["master-chevron"]}><ChevronIcon/></span>
      </button>
      <button type="button" className={styles["master-title-button"]} onClick={e=>openModule(item,e)}>
       <span className={styles["master-copy"]}><strong>{item.title}</strong><small>{childItems(item).length} قابلیت عملیاتی{item.is_shared?" · مشترک":""}</small></span>
      </button>
      {url?<Link className={styles["master-open"]} href={url} aria-label={"ورود به "+item.title}>↗</Link>:<span className={styles["master-open"]+" "+styles["disabled"]} aria-hidden="true">•</span>}
     </div>
     {isOpen&&<div className={styles["master-children"]}>
      {childItems(item).map((child,i)=>{const childHref=childUrl(child);return childHref?<Link className={styles["master-child"]} href={childHref} key={child.id}><span className={styles["master-child-index"]}>{String(i+1).padStart(2,"0")}</span><span>{child.title}</span></Link>:<div className={styles["master-child"]} key={child.id}><span className={styles["master-child-index"]}>{String(i+1).padStart(2,"0")}</span><span>{child.title}</span></div>})}
      {url&&<Link className={styles["master-enter"]} href={url}>ورود به ماژول <span>←</span></Link>}
     </div>}
    </div>;
   })}
  </nav>

  <footer className={styles["sidebar-footer"]}>
   <Link href="/admin/editors"><span>✦</span><div><b>ویرایشگرهای سامانه</b><small>قالب، صفحه، فرم و منو</small></div></Link>
   <Link className={updateAvailable?styles["update-available"]:""} href="/admin/updates"><span>↻</span><div><b>نسخه و بروزرسانی {updateAvailable&&<em>نسخه جدید</em>}</b><small>{updateAvailable?"نسخه جدید GitHub آماده نصب است":"بررسی نسخه و نصب امن از GitHub"}</small></div></Link>
   <small className={styles["sidebar-version"]}>50 بخش · طراحی مینیمال · CSS-first · RTL</small>
  </footer>
 </aside>
}