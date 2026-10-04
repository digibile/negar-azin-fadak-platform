"use client";

import Link from "next/link";
import {useEffect,useMemo,useState} from "react";
import {usePathname,useRouter,useSearchParams} from "next/navigation";
import {api} from "../../lib/api";

type ModuleItem={id:number;code:string;title:string;core:string;route?:string|null;is_active?:boolean};

type MenuDef={code:string;title:string;core:string;children:string[]};

const MENUS:MenuDef[]=[
{code:"governance",title:"01. حاکمیت و ساختار سازمانی",core:"core",children:["هلدینگ","شرکت‌ها","واحدهای کسب‌وکار","شعب","برندها","فروشگاه‌ها","نمایندگان","پذیرندگان","شرکای تجاری","تأمین‌کنندگان"]},
{code:"identity",title:"02. هویت، کاربران و امنیت",core:"core",children:["کاربران","مشتریان","نقش‌ها","مجوزها","محدوده دسترسی","ورود و ثبت‌نام","رمز عبور","OTP","احراز هویت","KYC","دستگاه‌ها","نشست‌ها","2FA","تشخیص ورود مشکوک","مدیریت نشست","امنیت و Audit"]},
{code:"master-data",title:"03. داده‌های پایه سازمان",core:"core",children:["اشخاص","مشتری","شرکت","برند","پذیرنده","نماینده","بازاریاب","شریک","تأمین‌کننده","حساب بانکی","آدرس","اطلاعات تماس"]},
{code:"customer-360",title:"04. مشتری 360",core:"core",children:["پروفایل","KYC","مدارک","حساب‌های بانکی","اعتبار","وام‌ها","اقساط","سفارش‌ها","پرداخت‌ها","کیف پول","حساب مالی","تیکت‌ها","تماس‌ها","پیامک","ایمیل","اعلان‌ها","قراردادها","دستگاه‌ها","ورودها","Timeline"]},
{code:"smart-calendar",title:"05. تقویم سازمانی هوشمند",core:"core",children:["تقویم شمسی","تقویم میلادی داخلی","روزهای کاری","پنجشنبه","جمعه","تعطیلات رسمی","تعطیلات اضطراری","تعطیلی سراسری","تعطیلی سازمان","تعطیلی شرکت","تعطیلی شعبه","تعطیلی پذیرنده","تعطیلی نماینده","روز کاری ویژه","ساعات کاری","تقویم اختصاصی طرح","تقویم اختصاصی شریک","تقویم اختصاصی شعبه","دریافت تعطیلی رسمی","ثبت دستی تعطیلی","نسخه‌بندی تقویم","محاسبه روز کاری","محاسبه ساعت کاری","محاسبه سررسید","جابه‌جایی خودکار تاریخ","تاریخچه تغییرات تقویم"]},
{code:"business-rules",title:"06. موتور قوانین کسب‌وکار",core:"core",children:["Rule Engine","Pricing Rules","Commission Rules","Eligibility Rules","Credit Rules","Settlement Rules","Delivery Rules","Payment Rules","Calendar Rules","Workflow Rules"]},
{code:"sla",title:"07. موتور SLA",core:"core",children:["SLA Plan","زمان کاری","ساعات کاری","روز کاری","تعطیلات","زمان باقی‌مانده","توقف SLA","ادامه SLA","SLA پذیرنده","SLA نماینده","SLA شریک","SLA طرح"]},
{code:"accounting-finance",title:"08. حسابداری و مالی",core:"finance",children:["دفتر کل","دفتر معین","دفتر تفصیلی","سرفصل حساب‌ها","اسناد حسابداری","دوره مالی","مراکز هزینه","پروژه‌ها","شرکت‌ها","شعب","برندها","ارزها","حساب‌های بانکی","صندوق","خزانه","بودجه","مالیات","دارایی ثابت","دریافتنی‌ها","پرداختنی‌ها","حسابداری بین‌شرکتی","تلفیق","دفتر رسمی","دفتر داخلی","حسابداری مدیریتی","حسابداری رویدادمحور","حسابرسی"]},
{code:"treasury-bank",title:"09. خزانه و بانک",core:"finance",children:["حساب‌های بانکی","واریز","برداشت","انتقال","دریافت","پرداخت","مغایرت بانکی","حواله","تسویه","گردش وجوه"]},
{code:"wallet-ledger",title:"10. کیف پول و دفتر تراکنش",core:"finance",children:["اعتبار","بدهکار","بستانکار","رزرو","آزادسازی","بازگشت وجه","اصلاح","برگشت تراکنش","پرداخت","Ledger"]},
{code:"credit-facilities",title:"11. اعتبار و تسهیلات",core:"credit",children:["محصولات اعتباری","درخواست اعتبار","احراز","اعتبارسنجی","ارزیابی ریسک","تصمیم اعتباری","سقف اعتبار","قرارداد","فعال‌سازی","قدرت خرید","پرداخت تسهیلات","تاریخچه اعتبار"]},
{code:"credit-scoring",title:"12. موتور اعتبارسنجی",core:"credit",children:["امتیاز اعتباری","درآمد","بدهی","نسبت بدهی","سابقه وام","تأخیر","سابقه مشتری","تقلب","اطلاعات بانکی","لیست سیاه","لیست سفید","قوانین قابل تنظیم"]},
{code:"loans-contracts",title:"13. وام و قرارداد",core:"credit",children:["Loan Product","مبلغ","سود","کارمزد","هزینه خدمات","هزینه اعتبارسنجی","تعداد اقساط","فاصله اقساط","تاریخ اولین سررسید","مدارک","شرایط احراز","قرارداد","فعال‌سازی"]},
{code:"installments",title:"14. اقساط",core:"credit",children:["برنامه اقساط","اصل","سود","کارمزد","سررسید","پرداخت کامل","پرداخت ناقص","تأخیر","جریمه","لغو","محاسبه مجدد"]},
{code:"collections",title:"15. وصول مطالبات",core:"credit",children:["پرونده وصول","بدهی","روزهای تأخیر","کارشناس وصول","تماس","پیامک","پیام‌رسان","وعده پرداخت","پیگیری","تسویه بدهی"]},
{code:"sales-trade",title:"16. فروش و تجارت",core:"commerce",children:["محصولات","دسته‌بندی","برند","ویژگی","تنوع","قیمت","تخفیف","موجودی","سبد خرید","سفارش","پرداخت","ارسال","فاکتور","پیش‌فاکتور","مرجوعی","Refund"]},
{code:"marketplace",title:"17. Marketplace",core:"commerce",children:["فروشندگان","پذیرندگان","فروشگاه‌ها","محصولات فروشندگان","سفارش‌ها","مشتریان","تسویه","کمیسیون","کارکنان فروشنده","پنل اختصاصی فروشنده"]},
{code:"delivery-logistics",title:"18. تحویل و لجستیک",core:"commerce",children:["انبار","ارسال","روش تحویل","زمان تحویل","تقویم تحویل","SLA تحویل","رهگیری","تحویل به مشتری","برگشت کالا"]},
{code:"commission",title:"19. کمیسیون",core:"commerce",children:["ثابت","درصدی","مبلغ وام","قدرت خرید","مبلغ وصولی","پلکانی","محصول‌محور","Rule","تأیید","قابل پرداخت","پرداخت‌شده"]},
{code:"settlement",title:"20. تسویه",core:"commerce",children:["پذیرنده","نماینده","بازاریاب","شریک","فروشنده","حساب بانکی","مبلغ","تاریخ تسویه","تقویم کاری","SLA","وضعیت","مرجع بانکی"]},
{code:"payments",title:"21. پرداخت",core:"commerce",children:["درگاه‌ها","پرداخت نقدی","پرداخت اعتباری","پرداخت ترکیبی","Payment Link","بازگشت وجه","تراکنش","Smart Routing","اولویت","Failover","مغایرت"]},
{code:"providers-integrations",title:"22. مرکز ارائه‌دهندگان و یکپارچه‌سازی",core:"commerce",children:["پرداخت","بانک","اعتبارسنجی","KYC","احراز موبایل","کد ملی","شبا","پیامک","ایمیل","پیام‌رسان","هوش مصنوعی","صوت","حمل‌ونقل","حسابداری","ذخیره‌سازی","API","Webhook","Sandbox","Production","اعتبارنامه","هزینه","مصرف","محدودیت","سلامت","Failover"]},
{code:"communications",title:"23. مرکز ارتباطات",core:"communication",children:["پیامک","ایمیل","Push","WhatsApp","پیام‌رسان‌ها","تماس صوتی","اعلان داخلی","قالب پیام","کمپین","صف ارسال","Retry","Delivery Status","گزارش هزینه"]},
{code:"events-notifications",title:"24. موتور رویداد و اعلان",core:"communication",children:["تأیید وام","امضای قرارداد","فعال‌سازی وام","سررسید قسط","تأخیر قسط","پرداخت موفق","پرداخت ناموفق","Refund","تسویه","سفارش","ارسال","رویدادهای سفارشی"]},
{code:"crm",title:"25. CRM",core:"communication",children:["سرنخ","مشتری","فرصت","فعالیت","تماس","پیگیری","کمپین","شکایت","Customer 360"]},
{code:"contact-center",title:"26. مرکز تماس",core:"communication",children:["تلفن","داخلی","صف","IVR","اپراتور","ضبط مکالمه","تبدیل صوت به متن","تبدیل متن به صوت","تحلیل تماس","شناسایی مشتری","هوش نگار","انتقال به اپراتور"]},
{code:"tickets-support",title:"27. تیکت و پشتیبانی",core:"communication",children:["تیکت","گروه","اپراتور","اولویت","SLA","وضعیت","پیوست","مکالمه","پاسخ هوش نگار","تاریخچه"]},
{code:"documents-office",title:"28. اسناد و اتوماسیون اداری",core:"documents-content",children:["اسناد","قرارداد","نامه","فاکتور","پیش‌فاکتور","پیوست","نسخه‌بندی","امضا","گردش سند","مجوز","بایگانی"]},
{code:"digital-binder",title:"29. زونکن دیجیتال",core:"documents-content",children:["تصویر مدرک","OCR","استخراج اطلاعات","تشخیص نوع مدرک","نمایش اطلاعات","تأیید اپراتور","اصلاح","ثبت خودکار اطلاعات"]},
{code:"web-domain",title:"30. مدیریت وب‌سایت و دامنه",core:"documents-content",children:["سایت‌ها","دامنه‌ها","زیردامنه‌ها","برند","لوگو","قالب","Theme","منو","صفحات","SEO","وبلاگ","اخبار","اطلاعیه","محتوا","دسترسی"]},
{code:"page-builder",title:"31. صفحه‌ساز",core:"documents-content",children:["ساخت صفحه","ویرایش","Preview","Version","Publish","Schedule","Rollback","Permission","Component Library"]},
{code:"form-builder",title:"32. فرم‌ساز",core:"documents-content",children:["فیلد","اعتبارسنجی","شرط","Workflow","Permission","ذخیره","اعلان","اتصال به ماژول‌ها"]},
{code:"content-management",title:"33. مدیریت محتوا",core:"documents-content",children:["مقالات","محصولات","صفحات","اخبار","رپورتاژ","تبلیغات","شبکه‌های اجتماعی","رسانه","SEO"]},
{code:"negar-ai",title:"34. هوش نگار",core:"documents-content",children:["درگاه هوش مصنوعی","مدیریت مدل‌ها","مدیریت Provider","دانش سازمان","جست‌وجوی هوشمند","RAG","OCR","تحلیل مالی","تحلیل کسب‌وکار","تولید محتوا","پشتیبانی","مرکز تماس","صوت","متن","کنترل دسترسی","ثبت فعالیت","مدیریت هزینه هوش مصنوعی"]},
{code:"human-resources",title:"35. منابع انسانی",core:"organization",children:["کارکنان","واحدها","سمت‌ها","حضور و غیاب","مرخصی","حقوق","ارزیابی","پرونده پرسنلی","دسترسی‌ها"]},
{code:"projects-operations",title:"36. پروژه و عملیات",core:"organization",children:["پروژه","وظیفه","بودجه","هزینه","زمان","منابع","اعضا","گزارش"]},
{code:"reports-analytics",title:"37. گزارش و تحلیل",core:"organization",children:["مالی","فروش","اعتبار","وام","اقساط","وصول","تسویه","کمیسیون","مشتری","پذیرنده","نماینده","موجودی","منابع انسانی","عملکرد","داشبوردهای مدیریتی"]},
{code:"command-center",title:"38. مرکز فرماندهی",core:"command-platform",children:["وضعیت سازمان","فروش","اعتبار","وام","بدهی","پرداخت","تسویه","Provider","سیستم","رخدادهای بحرانی","«چه چیزی نیاز به توجه دارد؟»"]},
{code:"monitoring-events",title:"39. مانیتورینگ و رخدادها",core:"command-platform",children:["سلامت سیستم","سلامت API","سلامت Database","سلامت Queue","سلامت Payment","سلامت Credit","سلامت Provider","سلامت SMS","سلامت Email","سلامت Mobile","Incident Center","Alert","Retry","Failover","Resolution"]},
{code:"audit-control",title:"40. حسابرسی و کنترل",core:"command-platform",children:["Audit Log","کاربر","عملیات","زمان","IP","دستگاه","مقدار قبلی","مقدار جدید","مجوز","تغییرات مالی","تغییرات حساس"]},
{code:"documentation",title:"41. مستندات",core:"command-platform",children:["مستندات کسب‌وکار","مستندات API","مستندات Provider","مستندات Integration","راهنمای عملیاتی","FAQ","نسخه‌بندی","مدیریت دسترسی"]},
{code:"api-integration",title:"42. API و یکپارچه‌سازی",core:"command-platform",children:["API","نسخه‌بندی","Authentication","Authorization","Validation","Pagination","Filtering","Sorting","Error Handling","Webhook","Idempotency","API Documentation"]},
{code:"infrastructure-data",title:"43. زیرساخت و داده",core:"command-platform",children:["PostgreSQL","Redis","Message Broker","Search","Object Storage","Cache","Queue","Background Jobs","Migration","Backup","Disaster Recovery"]},
{code:"mobile-app",title:"44. اپلیکیشن موبایل",core:"command-platform",children:["Android","iOS","خانه","اعتبار","فروشگاه","سفارش","اقساط","کیف پول","تراکنش","پشتیبانی","اعلان","پروفایل"]},
{code:"quality-lifecycle",title:"45. کیفیت و چرخه توسعه",core:"command-platform",children:["تحلیل","طراحی","پیاده‌سازی","Build","Unit Test","Integration Test","API Test","UI Test","Security Test","Performance Test","Migration Test","End-to-End Test","Code Review","مستندسازی","انتشار نسخه"]}
];

const CORES=[
["core","01 تا 07 · هسته مرکزی کسب‌وکار"],
["finance","08 تا 10 · مالی و خزانه"],
["credit","11 تا 15 · اعتبار و تسهیلات"],
["commerce","16 تا 22 · تجارت و پرداخت"],
["communication","23 تا 27 · ارتباطات و مشتری"],
["documents-content","28 تا 34 · اسناد و محتوا"],
["organization","35 تا 37 · سازمان و عملیات"],
["command-platform","38 تا 45 · مرکز فرماندهی و پلتفرم"]
] as const;

export default function AdminSidebar(){
 const pathname=usePathname(),search=useSearchParams(),router=useRouter();
 const [modules,setModules]=useState<ModuleItem[]>([]),[error,setError]=useState(""),[open,setOpen]=useState<Record<string,boolean>>(()=>Object.fromEntries(CORES.map(([core])=>[core,true])));
 useEffect(()=>{let alive=true;api<{items:ModuleItem[]}>("/api/platform/modules").then(x=>{if(alive)setModules(x.items||[])}).catch(e=>{if(alive)setError(e instanceof Error?e.message:"خطا در دریافت منوی سامانه")});return()=>{alive=false}},[]);
 const visible=useMemo(()=>new Map(modules.map(m=>[m.code,m])),[modules]);
 const isModule=(code:string)=>pathname==="/modules"&&search.get("code")===code;
 const go=(code:string)=>{const m=visible.get(code);if(m)router.push("/modules/?code="+encodeURIComponent(code))};
 return <aside className="enterprise-sidebar">
  <div className="enterprise-brand"><div className="brand-symbol">ن</div><div><strong>مرکز مدیریت نگار آذین فدک</strong><span>منوی مرکزی سازمان</span></div></div>
  <div className="sidebar-section-title">ساختار کامل سامانه · ۴۵ بخش عملیاتی</div>
  <nav className="tree-nav">
   <Link className={"tree-root "+(pathname==="/admin"?"active":"")} href="/admin"><span className="tree-icon">⌂</span><span>داشبورد مدیریتی</span></Link>
   {error&&<div className="sidebar-menu-error">{error}</div>}
   {!modules.length&&!error&&<div className="sidebar-menu-loading">در حال دریافت منوی واقعی سامانه...</div>}
   {CORES.map(([core,label])=><section className="tree-group" key={core}>
    <button className="tree-group-head" type="button" onClick={()=>setOpen(v=>({...v,[core]:!v[core]}))}><span className="tree-chevron">{open[core]?"⌄":"‹"}</span><span className="tree-index">{label.split("·")[0].trim()}</span><span className="tree-group-name">{label.split("·")[1]?.trim()}</span><b>{MENUS.filter(m=>m.core===core&&visible.has(m.code)).length}</b></button>
    {open[core]&&<div className="tree-children">
      {MENUS.filter(m=>m.core===core&&visible.has(m.code)).map(m=><div className="tree-module" key={m.code}>
       <button className={"tree-module-head "+(isModule(m.code)?"active":"")} type="button" onClick={()=>go(m.code)}><span className="tree-index">{m.code.split("-")[0]}</span><span className="tree-module-title">{m.title.replace(/^\d+\. /,"")}</span><span>›</span></button>
       <div className="tree-capabilities">{m.children.map(x=><span key={x}>{x}</span>)}</div>
      </div>)}
    </div>}
   </section>)}
  </nav>
  <div className="sidebar-footer"><Link href="/admin/editors">ویرایشگرهای سامانه</Link><small>دسترسی‌ها و لینک‌های ماژول‌ها از سرویس واقعی سامانه خوانده می‌شوند.</small></div>
 </aside>;
}
