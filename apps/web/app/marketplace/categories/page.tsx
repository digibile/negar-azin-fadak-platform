"use client";

import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import "./categories-workspace.css";

type Category = { id:string; code:string; name:string; status:"active"|"inactive"; sort_order:number };
type CategoryList = { items:Category[]; total:number };

export default function MarketplaceCategoriesPage() {
  const [items,setItems]=useState<Category[]>([]);
  const [name,setName]=useState("");
  const [code,setCode]=useState("");
  const [sortOrder,setSortOrder]=useState("10");
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const [search,setSearch]=useState("");

  async function load() {
    setError("");
    try {
      const result=await api<CategoryList>("/api/marketplace/categories");
      setItems(Array.isArray(result.items)?result.items:[]);
    } catch(reason) {
      setError(reason instanceof Error?reason.message:"دریافت دسته‌بندی‌ها ناموفق بود.");
    } finally { setLoading(false); }
  }
  useEffect(()=>{ void load(); },[]);

  async function createCategory() {
    setError("");setNotice("");
    const cleanName=name.trim();
    const cleanCode=code.trim().toLowerCase();
    if(!cleanName||!cleanCode){setError("نام و کد دسته‌بندی را وارد کنید.");return;}
    setSaving(true);
    try {
      await api("/api/marketplace/categories",{method:"POST",body:JSON.stringify({name:cleanName,code:cleanCode,sortOrder:Number(sortOrder)||0,status:"active"})});
      setName("");setCode("");setSortOrder(String((Number(sortOrder)||0)+10));
      setNotice("دسته‌بندی در پایگاه داده ثبت شد و پس از بارگیری دوباره در ویترین استفاده می‌شود.");
      await load();
    } catch(reason) {
      setError(reason instanceof Error?reason.message:"ثبت دسته‌بندی ناموفق بود.");
    } finally { setSaving(false); }
  }

  async function updateCategory(item:Category, patch:Partial<Pick<Category,"name"|"status"|"sort_order">>) {
    setError("");setNotice("");setSaving(true);
    try {
      await api("/api/marketplace/categories/"+encodeURIComponent(item.id),{method:"PATCH",body:JSON.stringify({
        name:patch.name??item.name,status:patch.status??item.status,sortOrder:patch.sort_order??item.sort_order
      })});
      setNotice("تغییرات دسته‌بندی ذخیره شد.");
      await load();
    } catch(reason) {
      setError(reason instanceof Error?reason.message:"ذخیره دسته‌بندی ناموفق بود.");
    } finally { setSaving(false); }
  }

  const visible=items.filter(item=>(item.name+" "+item.code).toLocaleLowerCase("fa").includes(search.trim().toLocaleLowerCase("fa")));
  return <main className="sk-category-admin" dir="rtl">
    <header className="sk-category-admin-head">
      <div><span>مدیریت کاتالوگ</span><h1>دسته‌بندی کالاها</h1><p>دسته‌ها در پایگاه دادهٔ سازمان نگهداری می‌شوند و فیلترهای ویترین از همین فهرست و دسته‌های واقعی محصولات ساخته می‌شوند.</p></div>
      <a href="/marketplace/products">بازگشت به محصولات ←</a>
    </header>
    {error&&<div className="sk-cat-feedback is-error" role="alert">{error}</div>}
    {notice&&<div className="sk-cat-feedback is-success" role="status">{notice}</div>}
    <section className="sk-cat-create">
      <div><h2>افزودن دسته‌بندی</h2><p>برای هر دسته یک کد پایدار انگلیسی تعریف کنید.</p></div>
      <div className="sk-cat-form">
        <label>نام نمایشی<input value={name} onChange={e=>setName(e.target.value)} placeholder="مثلاً لوازم جانبی موبایل"/></label>
        <label>کد یکتا<input dir="ltr" value={code} onChange={e=>setCode(e.target.value.replace(/\s+/g,"-"))} placeholder="mobile-accessories"/></label>
        <label>ترتیب نمایش<input type="number" value={sortOrder} onChange={e=>setSortOrder(e.target.value)} min="0"/></label>
        <button type="button" onClick={createCategory} disabled={saving||!name.trim()||!code.trim()}>{saving?"در حال ذخیره…":"ثبت دسته‌بندی"}</button>
      </div>
    </section>
    <section className="sk-cat-list">
      <div className="sk-cat-list-head"><div><h2>فهرست دسته‌بندی‌ها</h2><p>{items.length.toLocaleString("fa-IR")} دسته ثبت‌شده</p></div><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="جستجوی نام یا کد…"/></div>
      {loading?<div className="sk-cat-empty">در حال دریافت اطلاعات…</div>:visible.length?<div className="sk-cat-table">
        <div className="sk-cat-row is-heading"><span>دسته‌بندی</span><span>کد</span><span>ترتیب</span><span>وضعیت</span><span>عملیات</span></div>
        {visible.map(item=><CategoryRow key={item.id} item={item} saving={saving} onSave={updateCategory}/>)}
      </div>:<div className="sk-cat-empty">{items.length?"دسته‌ای با این جستجو پیدا نشد.":"هنوز دسته‌بندی‌ای ثبت نشده است."}</div>}
    </section>
  </main>;
}

function CategoryRow({item,saving,onSave}:{item:Category;saving:boolean;onSave:(item:Category,patch:Partial<Pick<Category,"name"|"status"|"sort_order">>)=>Promise<void>}) {
  const [name,setName]=useState(item.name);
  const [sortOrder,setSortOrder]=useState(String(item.sort_order));
  useEffect(()=>{setName(item.name);setSortOrder(String(item.sort_order));},[item.name,item.sort_order]);
  return <div className="sk-cat-row">
    <span><input aria-label={"نام دسته "+item.name} value={name} onChange={e=>setName(e.target.value)}/></span>
    <code dir="ltr">{item.code}</code>
    <span><input aria-label={"ترتیب دسته "+item.name} type="number" min="0" value={sortOrder} onChange={e=>setSortOrder(e.target.value)}/></span>
    <span><b className={item.status==="active"?"sk-cat-active":"sk-cat-inactive"}>{item.status==="active"?"فعال":"غیرفعال"}</b></span>
    <span className="sk-cat-actions">
      <button type="button" disabled={saving||!name.trim()} onClick={()=>void onSave(item,{name:name.trim(),sort_order:Number(sortOrder)||0})}>ذخیره</button>
      <button type="button" className="is-secondary" disabled={saving} onClick={()=>void onSave(item,{status:item.status==="active"?"inactive":"active"})}>{item.status==="active"?"غیرفعال‌سازی":"فعال‌سازی"}</button>
    </span>
  </div>;
}
