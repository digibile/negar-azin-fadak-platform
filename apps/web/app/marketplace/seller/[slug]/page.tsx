import Link from "next/link";
export default async function SellerPage({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;
 return <main className="marketplace-shell" dir="rtl"><header className="marketplace-header"><div><span className="section-kicker">Marketplace</span><h1>فروشگاه فروشنده</h1><p>شناسه عمومی: {slug}</p></div><Link href="/marketplace">بازگشت به بازارگاه</Link></header><section className="marketplace-grid"><article className="marketplace-product"><h2>صفحه فروشنده</h2><p>پروفایل عمومی فروشنده، محصولات، امتیاز، ارسال، بازگشت و وضعیت تأیید از داده‌های واقعی فروشنده تکمیل می‌شود.</p><Link href="/marketplace/sellers">مدیریت فروشندگان ←</Link></article></section></main>
}