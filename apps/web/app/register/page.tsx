import Link from "next/link";

type BrandKey="naf"|"digipay"|"digibile"|"vamcity"|"kipa"|"technolife";
const brands:Record<BrandKey,{name:string;description:string;requestTitle:string;requestText:string}>={
 naf:{name:"نگار آذین فدک",description:"ساخت حساب سازمانی از مسیر احراز هویت مرکزی انجام می‌شود.",requestTitle:"ثبت درخواست مشتری",requestText:"برای خرید، اعتبار یا تسهیلات، درخواست خود را ثبت کنید تا مسیر احراز هویت و بررسی واقعی فعال شود."},
 digipay:{name:"دیجی‌پی",description:"ثبت‌نام و فعال‌سازی خدمات پرداخت پس از اتصال به سرویس هویت و تأییدهای لازم انجام می‌شود.",requestTitle:"شروع درخواست خدمات",requestText:"برای ادامه، درخواست خدمات را از مسیر رسمی ثبت کنید؛ این صفحه حساب یا کیف پول جعلی ایجاد نمی‌کند."},
 digibile:{name:"دیجی‌بایل",description:"حساب خریدار و فروشنده باید از مسیر احراز هویت و سرویس حساب واقعی ایجاد شود.",requestTitle:"شروع حساب خرید",requestText:"برای خرید و پیگیری سفارش‌ها، فرایند ثبت درخواست حساب را شروع کنید."},
 vamcity:{name:"وام‌سیتی",description:"ایجاد حساب و درخواست تسهیلات به احراز هویت و بررسی واقعی نیاز دارد.",requestTitle:"ثبت درخواست تسهیلات",requestText:"درخواست را از مسیر رسمی ارسال کنید؛ هیچ نرخ، سقف اعتبار یا تأییدیه‌ای در این صفحه جعل نمی‌شود."},
 kipa:{name:"کیپا",description:"فعال‌سازی حساب کاربری پس از اتصال سرویس هویت و تأییدهای لازم انجام می‌شود.",requestTitle:"شروع ثبت‌نام مشتری",requestText:"درخواست ایجاد حساب را ثبت کنید تا مسیر هویت واقعی تکمیل شود."},
 technolife:{name:"تکنولایف",description:"حساب مشتری برای خرید و پیگیری سفارش‌ها باید از سرویس حساب واقعی ایجاد شود.",requestTitle:"شروع حساب فروشگاهی",requestText:"برای ادامه خرید، فرایند ایجاد حساب مشتری را شروع کنید."}
};
export default async function RegisterPage({searchParams}:{searchParams:Promise<{brand?:string}>}){
 const params=await searchParams;
 const candidate=(params.brand||"naf") as BrandKey;
 const brand=brands[candidate]||brands.naf;
 const brandKey=candidate in brands?candidate:"naf";
 return <main className="sookar-store" dir="rtl"><section className="store-section" style={{maxWidth:760,margin:"60px auto"}}>
  <span>حساب کاربری · {brand.name}</span><h1>ایجاد حساب در {brand.name}</h1><p>{brand.description}</p>
  <div className="plan-grid">
   <article><h3>{brand.requestTitle}</h3><p>{brand.requestText}</p><Link href={brandKey==="vamcity"?"/pay/apply":brandKey==="digibile"?"/store/shop":"/pay/apply"}>ادامه و ثبت درخواست ←</Link></article>
   <article><h3>قبلاً حساب دارید؟</h3><p>برای ورود، از صفحه اختصاصی همین برند استفاده کنید.</p><Link href={"/login?brand="+brandKey}>ورود امن ←</Link></article>
  </div>
  <p style={{marginTop:24,fontSize:13,opacity:.75}}>این صفحه به‌تنهایی حساب کاربری نمی‌سازد. ایجاد حساب نهایی به سرویس احراز هویت متصل و تأییدشده وابسته است.</p>
 </section></main>;
}
