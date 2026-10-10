"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import "./storefront.css";
import { STORE_CATEGORY_NAVIGATION } from "./category-navigation";
import { AddToCartButton, CartCount } from "./cart-actions";
import { useEffect, useMemo, useState, type CSSProperties } from "react";

type Product = {
  id: string;
  sku: string;
  title: string;
  description: string | null;
  category: string | null;
  price: string;
  currency: string;
  seller_name: string;
  store_id: string | null;
  image_url?: string | null;
  brand?: string | null;
  rating?: number | null;
  is_reference?: boolean;
  is_demo_product?: boolean;
  source_url?: string | null;
  source_name?: string | null;
  source_type?: string | null;
  source_available?: boolean | null;
  attributes?: { specifications?: Array<{group:string;items:Array<{name:string;values:string[]}>}>; galleryImages?: string[]; [key:string]:unknown };
};
type Store = { id: string; name: string; slug: string; seller_name: string };
type Catalog = { tenant?: { name?: string }; products: Product[]; stores?: Store[]; categories?: string[]; total?: number };
type StoreTheme = {key?:string;primaryColor:string;accentColor:string;canvasColor:string;surfaceColor:string;productColumns:number;productCard:"rounded"|"bordered"|"flat"|"elevated";productImageRatio:"square"|"portrait"|"landscape";showHero:boolean;showCategories:boolean;headerMode:string;footerMode:string;sectionOrder:string};

const money = (value: string, currency: string) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return `${value} ${currency}`;
  return `${amount.toLocaleString("fa-IR")} ${currency === "IRR" ? "ریال" : currency}`;
};

const safeImageUrl = (value: string | null | undefined) => value && (value.startsWith("https://") || value.startsWith("http://") || (value.startsWith("/") && !value.startsWith("//"))) ? value : null;
const normalizeText = (value: string) => value
  .normalize("NFKC")
  .replace(/[يى]/g, "ی")
  .replace(/ك/g, "ک")
  .replace(/[\u200c\s]+/g, " ")
  .trim()
  .toLocaleLowerCase("fa");

const BROWSE_CATEGORIES = [
  "موبایل",
  "ابزارآلات",
  "لپ تاپ",
  "پزشکی و سلامت",
  "کالای دیجیتال",
  "شهر کتاب و هنر",
  "خانه و آشپزخانه",
  "ورزش و سفر",
  "لوازم خانگی برقی",
  "کارت هدیه",
  "آرایشی بهداشتی",
  "سوپرمارکتی",
  "مد و پوشاک",
  "اسباب‌بازی و کودک",
  "طلا و نقره",
  "بومی و محلی",
  "خودرو و موتور",
  "پت شاپ"
];

const categoryGlyph = (category: string | null, title: string) => {
  const value = `${category || ""} ${title}`.toLocaleLowerCase("fa");
  if (/موبایل|گوشی|تلفن|تبلت/.test(value)) return "▯";
  if (/لپ.?تاپ|کامپیوتر|مانیتور|الکترونیک/.test(value)) return "▰";
  if (/پوشاک|لباس|کفش|مد/.test(value)) return "◇";
  if (/خانه|آشپزخانه|لوازم خانگی/.test(value)) return "⌂";
  if (/زیبایی|آرایش|بهداشت/.test(value)) return "✳";
  if (/کتاب|فرهنگ/.test(value)) return "▤";
  return "◈";
};

type StoreVariant = "default" | "digikala" | "technolife" | "ava" | "kipa" | "digibile";

const DIGIKALA_NAVIGATION = [
  { name: "موبایل و تبلت", children: ["همه موبایل‌ها", "گوشی سامسونگ", "گوشی اپل", "گوشی شیائومی", "گوشی اقتصادی", "تبلت", "ساعت هوشمند", "لوازم جانبی موبایل", "شارژر و پاوربانک"] },
  { name: "کالای دیجیتال", children: ["هدفون و هندزفری", "اسپیکر", "تلویزیون", "دوربین", "کنسول بازی", "لوازم گیمینگ", "هارد و SSD", "مودم و شبکه"] },
  { name: "لپ‌تاپ و کامپیوتر", children: ["لپ‌تاپ دانشجویی", "لپ‌تاپ گیمینگ", "لپ‌تاپ حرفه‌ای", "کامپیوتر رومیزی", "مانیتور", "قطعات کامپیوتر", "ماوس و کیبورد"] },
  { name: "مد و پوشاک", children: ["پوشاک زنانه", "پوشاک مردانه", "پوشاک کودک", "کفش", "کیف و کوله", "ساعت و زیورآلات", "لباس ورزشی"] },
  { name: "زیبایی و سلامت", children: ["آرایش صورت", "مراقبت پوست", "مراقبت مو", "عطر و ادکلن", "بهداشت فردی", "لوازم شخصی برقی"] },
  { name: "خانه و آشپزخانه", children: ["دکوراسیون", "مبلمان", "ظروف آشپزخانه", "خواب و حمام", "فرش و روشنایی", "ابزار خانه"] },
  { name: "لوازم خانگی برقی", children: ["یخچال و فریزر", "ماشین لباسشویی", "جاروبرقی", "تهویه و سرمایش", "قهوه‌ساز", "لوازم نظافت"] },
  { name: "سوپرمارکت", children: ["مواد غذایی", "تنقلات", "نوشیدنی", "صبحانه", "شوینده و نظافت", "بهداشت خانه"] },
  { name: "کتاب و لوازم‌التحریر", children: ["کتاب عمومی", "کتاب کودک", "کتاب دانشگاهی", "دفتر و نوشت‌افزار", "هنر و طراحی", "لوازم اداری"] },
  { name: "اسباب‌بازی و کودک", children: ["بازی فکری", "عروسک و فیگور", "ساختنی", "لوازم نوزاد", "بهداشت کودک", "اتاق کودک"] },
  { name: "ورزش و سفر", children: ["پوشاک ورزشی", "تجهیزات ورزشی", "کمپینگ", "چمدان و کوله", "لوازم سفر"] },
  { name: "ابزار و تجهیزات", children: ["ابزار دستی", "ابزار برقی", "تجهیزات ایمنی", "باغبانی", "یراق و اتصالات"] },
  { name: "خودرو و موتورسیکلت", children: ["لوازم جانبی خودرو", "نگهداری خودرو", "لوازم موتورسیکلت", "تجهیزات سفر خودرو"] },
  { name: "طلا، نقره و زیورآلات", children: ["زیورآلات", "ساعت", "اکسسوری", "هدیه‌های ویژه"] },
  { name: "کالاهای بومی و محلی", children: ["صنایع دستی", "خوراکی محلی", "محصولات هنری", "هدیه محلی"] },
  { name: "پت‌شاپ", children: ["غذای حیوانات", "بهداشت حیوانات", "اسباب‌بازی حیوانات", "لوازم نگهداری"] },
  { name: "کارت هدیه", children: ["کارت هدیه خرید", "هدیه مناسبتی", "هدیه دیجیتال"] }
] as const;

const TECHNOLIFE_NAVIGATION = [
  { name: "موبایل و تبلت", children: ["همه گوشی‌ها", "گوشی سامسونگ", "گوشی اپل", "گوشی شیائومی", "گوشی اقتصادی", "گوشی پرچم‌دار", "تبلت", "ساعت هوشمند", "لوازم جانبی موبایل"] },
  { name: "لپ‌تاپ و کامپیوتر", children: ["همه لپ‌تاپ‌ها", "لپ‌تاپ گیمینگ", "لپ‌تاپ دانشجویی", "لپ‌تاپ حرفه‌ای", "کامپیوتر و آل‌این‌وان", "مانیتور", "قطعات کامپیوتر", "ماوس و کیبورد"] },
  { name: "صوتی و تصویری", children: ["هدفون و هندزفری", "اسپیکر", "تلویزیون", "سینمای خانگی", "دوربین عکاسی", "میکروفون"] },
  { name: "گجت و پوشیدنی", children: ["ساعت هوشمند", "مچ‌بند هوشمند", "ردیاب و گجت", "عینک هوشمند", "لوازم جانبی پوشیدنی"] },
  { name: "شبکه و ذخیره‌سازی", children: ["مودم و روتر", "تجهیزات شبکه", "هارد اکسترنال", "SSD", "فلش و کارت حافظه", "ذخیره‌ساز تحت شبکه"] },
  { name: "کنسول و گیمینگ", children: ["کنسول بازی", "دسته بازی", "هدست گیمینگ", "صندلی گیمینگ", "لوازم جانبی بازی", "بازی"] },
  { name: "قطعات و لوازم جانبی", children: ["پردازنده", "کارت گرافیک", "مادربرد", "رم و حافظه", "پاور و کیس", "کابل و مبدل"] },
  { name: "لوازم اداری و هوشمند", children: ["پرینتر و اسکنر", "ویدئو پروژکتور", "خانه هوشمند", "تجهیزات کنفرانس", "لوازم جانبی کامپیوتر"] }
] as const;

const DIGIBILE_NAVIGATION = [
  { name: "کالای دیجیتال", children: ["موبایل و تبلت", "لپ‌تاپ و کامپیوتر", "صوتی و تصویری", "گجت هوشمند", "قطعات و لوازم جانبی"] },
  { name: "خانه و زندگی", children: ["خانه و آشپزخانه", "لوازم خانگی برقی", "دکوراسیون", "ابزار و تجهیزات", "نور و روشنایی"] },
  { name: "مد و سبک زندگی", children: ["پوشاک زنانه", "پوشاک مردانه", "کفش و کیف", "زیبایی و سلامت", "ساعت و زیورآلات", "ورزش و سفر"] },
  { name: "سوپرمارکت و روزمره", children: ["مواد غذایی", "نوشیدنی و تنقلات", "بهداشت و نظافت", "کالاهای مصرفی خانه"] },
  { name: "کتاب و سرگرمی", children: ["کتاب و لوازم‌التحریر", "اسباب‌بازی", "بازی و سرگرمی", "هنر و صنایع دستی"] },
  { name: "خودرو و ابزار", children: ["لوازم خودرو", "موتورسیکلت", "ابزار دستی", "ابزار برقی", "تجهیزات ایمنی"] },
  { name: "زیبایی، سلامت و ورزش", children: ["مراقبت پوست و مو", "بهداشت فردی", "تجهیزات ورزشی", "سفر و کمپینگ"] },
  { name: "بازارگاه و فروشندگان", children: ["همه فروشندگان", "فروشگاه‌های منتخب", "ثبت‌نام فروشنده", "پیگیری سفارش", "مرکز پشتیبانی"] },
  { name: "خدمات خرید", children: ["خرید اعتباری", "کارت هدیه", "پیشنهادهای ویژه", "کالاهای تخفیف‌دار"] }
] as const;

const AVA_NAVIGATION = [
  { name: "خانه آوا", children: ["تازه‌های آوا", "پرفروش‌های منتخب", "پیشنهادهای امروز", "هدیه برای عزیزان"] },
  { name: "خانه و دکور", children: ["دکوراسیون مینیمال", "روشنایی", "ظروف و پذیرایی", "خواب و حمام", "نظم‌دهنده‌ها"] },
  { name: "زیبایی و مراقبت", children: ["مراقبت پوست", "مراقبت مو", "عطر و رایحه", "بهداشت فردی", "لوازم آرایش"] },
  { name: "مد و اکسسوری", children: ["پوشاک زنانه", "پوشاک مردانه", "کیف و کفش", "ساعت و زیورآلات", "اکسسوری روزمره"] },
  { name: "دیجیتال روزمره", children: ["هدفون و هندزفری", "لوازم جانبی موبایل", "گجت‌های کاربردی", "لوازم اداری"] },
  { name: "سلامت و سبک زندگی", children: ["ورزش و تندرستی", "سفر و کمپینگ", "مراقبت شخصی", "کالاهای کاربردی"] },
  { name: "کتاب و هدیه", children: ["کتاب و نوشت‌افزار", "هدیه مناسبتی", "صنایع دستی", "کارت هدیه"] },
  { name: "خوراک و روزمره", children: ["خوراکی‌های بسته‌بندی", "نوشیدنی", "محصولات مصرفی خانه", "بهداشت و نظافت"] }
] as const;

const KIPA_NAVIGATION = [
  { name: "کالای دیجیتال", children: ["موبایل و تبلت", "لپ‌تاپ و کامپیوتر", "صوتی و تصویری", "لوازم جانبی", "خانه هوشمند"] },
  { name: "خانه و خانواده", children: ["خانه و آشپزخانه", "لوازم خانگی", "کودک و نوزاد", "نظم‌دهنده و دکور"] },
  { name: "مد و زیبایی", children: ["پوشاک", "کیف و کفش", "آرایشی و بهداشتی", "عطر و مراقبت شخصی"] },
  { name: "سوپرمارکت", children: ["مواد غذایی", "تنقلات و نوشیدنی", "شوینده و نظافت", "کالاهای مصرفی"] },
  { name: "کتاب و سرگرمی", children: ["کتاب و لوازم‌التحریر", "اسباب‌بازی", "بازی فکری", "لوازم هنری"] },
  { name: "ورزش و سفر", children: ["تجهیزات ورزشی", "پوشاک ورزشی", "سفر و کمپینگ", "چمدان و کوله"] },
  { name: "ابزار و خودرو", children: ["ابزارآلات", "لوازم خودرو", "موتورسیکلت", "تجهیزات ایمنی"] },
  { name: "فروشندگان کیپا", children: ["فروشگاه‌های منتخب", "همه فروشندگان", "راهنمای خرید", "پیگیری سفارش"] },
  { name: "باشگاه مشتریان", children: ["پیشنهادهای ویژه", "کارت هدیه", "تخفیف‌های دوره‌ای", "پشتیبانی مشتریان"] }
] as const;
const brandIdentity:Record<StoreVariant,{name:string;mark:string;tagline:string;strip:string;heroKicker:string;heroTitle:React.ReactNode;heroDescription:string;loginBrand:string;footerDescription:string;domain:string}> = {
  default:{name:"سوکار",mark:"س",tagline:"خرید هوشمند، انتخاب مطمئن",strip:"سوکار، بازارگاه یکپارچه خرید و فروش",heroKicker:"بازارگاه سوکار",heroTitle:<>هرچی لازم داری،<br /><em>یک‌جا پیدا کن.</em></>,heroDescription:"کالاهای فروشگاه‌های فعال را ببین، مشخصات و قیمت ثبت‌شده را بررسی کن و محصولات موردنظرت را به سبد خرید اضافه کن.",loginBrand:"naf",footerDescription:"یک مسیر یکپارچه برای کشف کالا، مقایسه انتخاب‌ها و خرید از فروشگاه‌های ثبت‌شده.",domain:"sookar.ir"},
  digikala:{name:"بازار قرمز",mark:"ب",tagline:"انتخاب بیشتر، خرید آسان‌تر",strip:"پیش‌نمایش قالب فروشگاهی با هویت قرمز مستقل",heroKicker:"تجربه فروشگاهی سریع و آشنا",heroTitle:<>از میان انتخاب‌ها،<br /><em>بهترین را پیدا کن.</em></>,heroDescription:"محصولات فعال را مقایسه کن و مشخصات و قیمت ثبت‌شده را پیش از خرید بررسی کن.",loginBrand:"digibile",footerDescription:"پیش‌نمایش قالب فروشگاهی مستقل با کاتالوگ متصل به محصولات ثبت‌شده.",domain:"پیش‌نمایش قالب"},
  technolife:{name:"تکنولایف",mark:"ت",tagline:"دنیای فناوری، یک‌جا",strip:"تکنولایف، تجربه تخصصی کالای دیجیتال",heroKicker:"فروشگاه کالای دیجیتال",heroTitle:<>تکنولوژی روز،<br /><em>انتخابی آگاهانه.</em></>,heroDescription:"محصولات دیجیتال ثبت‌شده را جستجو کن، مشخصات و قیمت واقعی را بررسی کن و با آگاهی انتخاب کن.",loginBrand:"technolife",footerDescription:"تجربه تخصصی کالای دیجیتال با اطلاعات محصول برگرفته از کاتالوگ زنده.",domain:"پیش‌نمایش قالب"},
  ava:{name:"آوا",mark:"آ",tagline:"خرید آرام، انتخاب هوشمند",strip:"آوا، تجربه خرید آرام و هوشمند",heroKicker:"تجربه خرید مینیمال",heroTitle:<>انتخابی ساده،<br /><em>خریدی مطمئن.</em></>,heroDescription:"کالاهای ثبت‌شده را با رابطی خلوت، خوانا و سازگار با موبایل مرور کن.",loginBrand:"naf",footerDescription:"قالب فروشگاهی مینیمال با دسترسی روشن به کاتالوگ و سفارش‌ها.",domain:"پیش‌نمایش قالب"},
  kipa:{name:"کیپا",mark:"ک",tagline:"انتخاب روشن، خرید مطمئن",strip:"کیپا، بازارگاه هوشمند و یکپارچه",heroKicker:"کیپا · خرید آگاهانه",heroTitle:<>خرید روشن‌تر،<br /><em>انتخاب مطمئن‌تر.</em></>,heroDescription:"کالاهای ثبت‌شده فروشندگان فعال را مرور کن، جزئیات و قیمت واقعی را ببین و انتخابت را با اطلاعات شفاف انجام بده.",loginBrand:"kipa",footerDescription:"بازارگاه هوشمند با نمایش شفاف اطلاعات ثبت‌شده محصولات و فروشندگان.",domain:"پیش‌نمایش قالب"},
  digibile:{name:"دیجی‌بایل",mark:"د",tagline:"بازارگاه تجارت دیجیتال",strip:"دیجی‌بایل، خرید و فروش در یک بازارگاه یکپارچه",heroKicker:"بازارگاه دیجی‌بایل",heroTitle:<>بازار خرید و فروش،<br /><em>همه‌چیز یک‌جا.</em></>,heroDescription:"محصولات و فروشندگان ثبت‌شده را کشف کن، دسته‌بندی‌ها را مرور کن و خرید را از مسیر واقعی بازارگاه ادامه بده.",loginBrand:"digibile",footerDescription:"بازارگاه چندفروشنده با کاتالوگ زنده، دسترسی فروشندگان و مسیر روشن سفارش.",domain:"digibile.ir"}
};
export default function StorePage({ variant = "default" }: { variant?: StoreVariant }) {
  const pathname = usePathname();
  const [theme, setTheme] = useState<StoreTheme | null>(null);
  const templateVariant: StoreVariant = theme?.key === "technolife-store" ? "technolife" : theme?.key === "digibile-commerce" ? "digibile" : theme?.key === "kipa-store" ? "kipa" : variant;
  const identity = brandIdentity[templateVariant];
  const isTechnolife = templateVariant === "technolife";
  const activeStoreNavigation = templateVariant === "digikala" ? DIGIKALA_NAVIGATION : templateVariant === "technolife" ? TECHNOLIFE_NAVIGATION : templateVariant === "digibile" ? DIGIBILE_NAVIGATION : templateVariant === "ava" ? AVA_NAVIGATION : templateVariant === "kipa" ? KIPA_NAVIGATION : STORE_CATEGORY_NAVIGATION;
  const isDigikala = templateVariant === "digikala";
  const isAva = templateVariant === "ava";
  const isKipa = templateVariant === "kipa";
  const isDigibile = templateVariant === "digibile";
  const showAllProducts = pathname === "/store/shop";
  const productHrefFor = (product:Product) => "/store/product/" + encodeURIComponent(product.sku || product.id) + "?site=" + templateVariant;
  const [data, setData] = useState<Catalog | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [activeNavCategory, setActiveNavCategory] = useState(activeStoreNavigation[0]?.name || "موبایل");
  const [sortBy, setSortBy] = useState<"newest" | "price-asc" | "price-desc" | "title">("newest");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/public/storefront-theme", { headers: { accept: "application/json" }, cache: "no-store", signal: controller.signal })
      .then(async response => { if (!response.ok) throw new Error("تنظیمات قالب دریافت نشد"); return response.json(); })
      .then(body => { if (!controller.signal.aborted && body?.theme) setTheme(body.theme as StoreTheme); })
      .catch(() => { /* Use the safe built-in brand defaults when no public theme is published. */ });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/public/marketplace", {
      headers: { accept: "application/json" },
      cache: "no-store",
      signal: controller.signal
    }).then(async response => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "دریافت کاتالوگ ناموفق بود.");
      if (!Array.isArray(body.products)) throw new Error("ساختار کاتالوگ معتبر نیست.");
      if (!controller.signal.aborted) {
        setData({
          ...body,
          products: body.products,
          categories: Array.isArray(body.categories) ? body.categories : [],
          total: Number(body.total || body.products.length)
        } as Catalog);
        setError("");
      }
    }).catch(reason => {
      if (controller.signal.aborted || (reason instanceof Error && reason.name === "AbortError")) return;
      setError(reason instanceof Error ? reason.message : "اتصال به کاتالوگ برقرار نشد.");
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, []);


  const canonicalCategory = (value: string | null | undefined) => {
    const key = normalizeText(value || "");
    if (!key) return "";
    const aliases: Array<[RegExp, string]> = [
      [/موبایل|گوشی|تبلت|mobile|phone|tablet/, "موبایل"],
      [/ابزارآلات|ابزار|tool|hardware/, "ابزارآلات"],
      [/لپ.?تاپ|کامپیوتر|مانیتور|computer|laptop/, "لپ تاپ"],
      [/پزشکی|سلامت|دارو|medical|health/, "پزشکی و سلامت"],
      [/کالای دیجیتال|صوتی|تصویری|هدفون|اسپیکر|دوربین|digital|audio|video/, "کالای دیجیتال"],
      [/کتاب|هنر|فرهنگ|لوازم.?التحریر|stationery|book|art|اداری|office/, "شهر کتاب و هنر"],
      [/لوازم خانگی برقی|جاروبرقی|یخچال|ماشین لباسشویی|appliance/, "لوازم خانگی برقی"],
      [/خانه|آشپزخانه|لوازم خانگی|home|kitchen/, "خانه و آشپزخانه"],
      [/ورزش|سفر|sport|travel/, "ورزش و سفر"],
      [/کارت هدیه|gift.?card/, "کارت هدیه"],
      [/آرایشی|زیبایی|مراقبت پوست|cosmetic|beauty/, "آرایشی بهداشتی"],
      [/سوپرمارکت|سوپرمارکتی|خوراک|مواد غذایی|grocery|supermarket/, "سوپرمارکتی"],
      [/پوشاک|لباس|کفش|مد|fashion|apparel|clothing/, "مد و پوشاک"],
      [/اسباب.?بازی|کودک|نوزاد|baby|toy|kid/, "اسباب‌بازی و کودک"],
      [/طلا|نقره|gold|silver/, "طلا و نقره"],
      [/بومی|محلی|صنایع دستی|local/, "بومی و محلی"],
      [/خودرو|موتور|car|auto|motor/, "خودرو و موتور"],
      [/پت.?شاپ|حیوان خانگی|pet|animal/, "پت شاپ"]
    ];
    return aliases.find(([pattern]) => pattern.test(key))?.[1] || BROWSE_CATEGORIES.find(name => normalizeText(name) === key) || key;
  };

  const technologyPattern = /موبایل|گوشی|تبلت|لپ.?تاپ|کامپیوتر|مانیتور|کالای دیجیتال|صوتی|تصویری|هدفون|اسپیکر|دوربین|گیمینگ|کنسول|الکترونیک|ابزارآلات|ابزار|لوازم خانگی|خانه و آشپزخانه|آشپزخانه|شبکه|مودم|پرینتر|اداری|کالای برق|زیبایی|سلامت|ورزش|سفر|فرهنگ|کتاب|نوشت.?افزار|خودرو|موتورسیکلت|طلا|سکه|پوشیدنی|mobile|phone|tablet|laptop|computer|monitor|digital|audio|video|headphone|speaker|camera|gaming|console|electronics|tool|appliance|home|kitchen|network|router|printer|office|beauty|health|travel|book|auto|motor|gold|jewelry|wearable/i;
  const sourceProducts = isTechnolife ? (data?.products || []).filter(product => technologyPattern.test(normalizeText([product.title, product.category || "", product.description || "", product.brand || ""].join(" ")))) : (data?.products || []);
  const categoryNames = [...new Set([...activeStoreNavigation.map(item => item.name), ...(templateVariant === "default" ? BROWSE_CATEGORIES : []), ...(Array.isArray(data?.categories) ? data.categories : [])])].filter(name => !isTechnolife || technologyPattern.test(normalizeText(name)));
  const categories = [...new Set(categoryNames.map(name => canonicalCategory(name.trim())).filter(Boolean))]
    .filter((name, index, all) => all.findIndex(item => normalizeText(item) === normalizeText(name)) === index)
    .map(name => [normalizeText(name), name] as [string, string]);

  const techBrands = isTechnolife
    ? [...new Set(sourceProducts.map(product => product.brand?.trim()).filter((brand): brand is string => Boolean(brand)))].slice(0, 12)
    : [];
  const techShelfGroups = isTechnolife ? [
    { title: "پرچمداران هوشمند", eyebrow: "گوشی موبایل و تبلت", searchTerm: "گوشی", matches: /موبایل|گوشی|تبلت|phone|mobile|tablet/i },
    { title: "لپ‌تاپ‌ها در تکنولایف", eyebrow: "کار، دانشگاه و بازی", searchTerm: "لپ", matches: /لپ.?تاپ|laptop|notebook/i },
    { title: "ابزارآلات", eyebrow: "ابزار و تجهیزات", searchTerm: "ابزار", matches: /ابزارآلات|دریل|پیچ.?گوشتی|فرز|کمپرسور|tool|drill|screwdriver/i },
    { title: "هدفون و تجهیزات صوتی", eyebrow: "صوتی و تصویری", searchTerm: "هدفون", matches: /هدفون|هندزفری|اسپیکر|صوتی|headphone|earbud|speaker|audio/i },
    { title: "کامپیوتر و تجهیزات", eyebrow: "مانیتور، ذخیره‌سازی و شبکه", searchTerm: "کامپیوتر", matches: /مانیتور|کامپیوتر|مودم|روتر|هارد|فلش|ssd|پرینتر|monitor|computer|router|modem|storage|printer/i },
    { title: "لوازم خانگی خانه و آشپزخانه", eyebrow: "لوازم کاربردی خانه", searchTerm: "لوازم خانگی", matches: /لوازم خانگی|خانه و آشپزخانه|جاروبرقی|یخچال|لباسشویی|چای.?ساز|قهوه.?ساز|air.?fryer|appliance|kitchen/i },
    { title: "لوازم جانبی منتخب", eyebrow: "شارژر، پاوربانک و تجهیزات", searchTerm: "شارژر", matches: /شارژر|پاوربانک|کابل|مبدل|charger|power.?bank|cable|adapter/i },
    { title: "گجت و پوشیدنی", eyebrow: "ساعت و ابزارهای هوشمند", searchTerm: "ساعت هوشمند", matches: /ساعت هوشمند|مچ.?بند|پوشیدنی|smart.?watch|wearable|fitness.?band/i }
  ].map(shelf => ({ ...shelf, products: sourceProducts.filter(product => shelf.matches.test(normalizeText([product.title, product.category || "", product.description || "", product.brand || ""].join(" ")))) .slice(0, 8) }))
    : [];

  const sectionOrder = (theme?.sectionOrder || "hero,benefits,categories,products").split(",");
  const orderOf = (section:string) => { const index=sectionOrder.indexOf(section); return index<0?99:index; };

  const products = useMemo(() => {
    const needle = normalizeText(query);
    const selectedCategory = canonicalCategory(category);
    const filtered = sourceProducts.filter(product => {
      const matchesCategory = !selectedCategory || canonicalCategory(product.category) === selectedCategory;
      const searchable = normalizeText([product.title, product.sku, product.category || "", product.seller_name, product.description || "", product.brand || ""].join(" "));
      return matchesCategory && (!needle || searchable.includes(needle));
    });
    if (sortBy === "price-asc") filtered.sort((a, b) => Number(a.price) - Number(b.price));
    else if (sortBy === "price-desc") filtered.sort((a, b) => Number(b.price) - Number(a.price));
    else if (sortBy === "title") filtered.sort((a, b) => a.title.localeCompare(b.title, "fa"));
    return filtered;
  }, [sourceProducts, data, query, category, sortBy]);


  return (
    <main className={`sk-store sk-store--${templateVariant}${isTechnolife ? " sk-store--technolife" : isDigikala ? " sk-store--digikala" : isAva ? " sk-store--ava" : isKipa ? " sk-store--kipa" : isDigibile ? " sk-store--digibile" : ""}${theme?.headerMode === "بدون هدر" ? " sk-hide-header" : theme?.headerMode === "فشرده" ? " sk-compact-header" : ""}${theme?.footerMode === "بدون فوتر" ? " sk-hide-footer" : theme?.footerMode === "فشرده" ? " sk-compact-footer" : ""}`} data-product-card={theme?.productCard||"rounded"} data-product-image-ratio={theme?.productImageRatio||"square"} dir="rtl" style={{"--sk-primary":theme?.primaryColor,"--sk-primary-dark":theme?.primaryColor,"--sk-accent":theme?.accentColor,"--sk-canvas":theme?.canvasColor,"--sk-surface":theme?.surfaceColor,"--sk-product-columns":String(theme?.productColumns||4),"--sk-product-radius":theme?.productCard==="flat"?"4px":theme?.productCard==="bordered"?"7px":theme?.productCard==="elevated"?"18px":"14px"} as CSSProperties}>
      <div className="sk-service-strip">
        <div className="sk-wrap sk-service-inner">
          <span>{identity.strip}</span>
          <div><Link href="/marketplace/directory">فروشندگان</Link><Link href="/pay">خدمات اعتباری</Link><Link href="/store/orders">پیگیری سفارش</Link></div>
        </div>
      </div>

      <header className="sk-header">
        <div className="sk-wrap sk-header-main">
          <Link href={identity.domain==="sookar.ir"?"/":identity.domain==="digibile.ir"?"/store/digibile":"/store/"+templateVariant} className="sk-logo" aria-label={identity.name+"، صفحه اصلی"}>
            <span className="sk-logo-mark">{identity.mark}</span>
            <span><b>{identity.name}</b><small>{identity.tagline}</small></span>
          </Link>
          <form className="sk-search" role="search" onSubmit={event => { event.preventDefault(); document.getElementById("sk-products")?.scrollIntoView({ behavior: "smooth" }); }}>
            <span aria-hidden="true">⌕</span>
            <input value={query} onChange={event => setQuery(event.target.value)} placeholder={"جستجو در " + identity.name + "؛ کالا، دسته یا فروشنده"} aria-label={"جستجو در " + identity.name} />
            {query && <button type="button" aria-label="پاک کردن جستجو" onClick={() => setQuery("")}>×</button>}
          </form>
          <div className="sk-header-actions">
            <Link className="sk-login" href={"/login?brand="+identity.loginBrand}><span aria-hidden="true">♙</span><span>ورود به حساب</span></Link>
            <Link className="sk-register" href={"/register?brand="+identity.loginBrand}>عضویت</Link>
            <Link className="sk-cart" href="/store/cart" aria-label="سبد خرید"><span aria-hidden="true">🛒</span><CartCount /></Link>
          </div>
        </div>
        <nav className="sk-main-nav" aria-label="ناوبری اصلی">
          <div className="sk-wrap sk-nav-inner">
            <div className="sk-category-nav-menu">
              <button type="button" className="sk-all-cats" aria-expanded={showCategoryMenu} aria-haspopup="menu" onClick={() => setShowCategoryMenu(open => !open)}><span>☰</span> دسته‌بندی کالاها <span className="sk-category-nav-chevron">{showCategoryMenu ? "⌃" : "⌄"}</span></button>
              {showCategoryMenu && <div className="sk-category-nav-dropdown sk-category-nav-mega" role="menu" aria-label="دسته‌بندی کالاها">
                <div className="sk-category-mega-list">
                  {activeStoreNavigation.map(item => <button type="button" role="menuitem" key={item.name} className={activeNavCategory===item.name?"is-active":""} onMouseEnter={() => setActiveNavCategory(item.name)} onFocus={() => setActiveNavCategory(item.name)} onClick={() => { setCategory(item.name); setShowCategoryMenu(false); document.getElementById("sk-products")?.scrollIntoView({behavior:"smooth",block:"start"}); }}><span>{categoryGlyph(item.name,item.name)}</span><b>{item.name}</b><i>←</i></button>)}
                </div>
                <section className="sk-category-mega-content" aria-label={"زیر دسته‌های "+activeNavCategory}>
                  <header><b>{activeNavCategory}</b><button type="button" onClick={() => {setCategory(activeNavCategory);setShowCategoryMenu(false);document.getElementById("sk-products")?.scrollIntoView({behavior:"smooth",block:"start"});}}>مشاهده همه کالاهای این دسته ←</button></header>
                  <div className="sk-category-mega-children">
                    {(activeStoreNavigation.find(item=>item.name===activeNavCategory)?.children||[]).map(child=><button type="button" key={child} onClick={() => {setCategory(activeNavCategory);setQuery(child==="همه محصولات "+activeNavCategory?"":child.startsWith("همه ")?"":child);setShowCategoryMenu(false);document.getElementById("sk-products")?.scrollIntoView({behavior:"smooth",block:"start"});}}>{child}<span>←</span></button>)}
                  </div>
                </section>
              </div>}
            </div>
            <Link href="/store/shop">فروشگاه و فروشندگان</Link>
            <Link href="/pay">خرید اعتباری</Link>
            <Link href="/store/orders">پیگیری سفارش</Link>
          </div>
        </nav>
      </header>

      <div className="sk-wrap">
        <section className="sk-hero sk-retail-hero" aria-labelledby="sk-hero-title" style={{display:theme?.showHero===false?"none":undefined,order:orderOf("hero")}}>
          <div className="sk-hero-copy">
            <span className="sk-hero-kicker"><i /> {identity.heroKicker}</span>
            <h1 id="sk-hero-title">{identity.heroTitle}</h1>
            <p>{identity.heroDescription}</p>
            <div className="sk-hero-actions"><Link href="/store/shop" className="sk-primary-btn">خرید از همه دسته‌ها <span>←</span></Link><Link href="/marketplace/directory" className="sk-quiet-btn">فروشگاه‌های بازارگاه</Link></div>
            <div className="sk-hero-note"><span>✓</span> فقط اطلاعات کاتالوگ واقعی؛ بدون محصول و قیمت ساختگی</div>
          </div>
          <div className="sk-hero-products" aria-label="محصولات منتخب از کاتالوگ">
            {sourceProducts.filter(product => safeImageUrl(product.image_url)).slice(0, 3).map((product, index) => (
              <Link href={productHrefFor(product)} className={"sk-hero-product sk-hero-product-" + index} key={product.id}>
                <img src={safeImageUrl(product.image_url) || ""} alt={product.title} />
                <span>{product.title}</span><b>{money(product.price, product.currency)}</b>
              </Link>
            ))}
            {(!sourceProducts.length) && <div className="sk-hero-empty"><span>{identity.mark}</span><b>{isTechnolife ? "فناوری مناسب، خرید مطمئن" : "خرید ساده‌تر، انتخاب آگاهانه‌تر"}</b><small>محصولات فعال فروشگاه در اینجا نمایش داده می‌شوند</small></div>}
          </div>
        </section>

        {isTechnolife && techBrands.length > 0 && !query && !category && <section className="sk-tech-brands" aria-label="برندهای موجود در کاتالوگ">
          <div className="sk-tech-brands-heading"><b>برندهای منتخب</b><span>بر اساس برندهای ثبت‌شده در کاتالوگ</span></div>
          <div className="sk-tech-brand-list">{techBrands.map(brand => <button type="button" key={brand} onClick={() => { setQuery(brand); document.getElementById("sk-products")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>{brand}<span>←</span></button>)}</div>
        </section>}

        <section className="sk-benefits" aria-label="ویژگی‌های تجربه خرید" style={{order:orderOf("benefits")}}>
          <article><span className="sk-benefit-icon">⌕</span><div><b>جستجوی آسان</b><small>کالا و فروشنده را سریع‌تر پیدا کن</small></div></article>
          <article><span className="sk-benefit-icon">▦</span><div><b>بازارگاه چندفروشنده</b><small>محصولات فروشندگان در یک کاتالوگ</small></div></article>
          <article><span className="sk-benefit-icon">↗</span><div><b>جزئیات شفاف</b><small>مشاهده اطلاعات ثبت‌شده محصول</small></div></article>
          <article><span className="sk-benefit-icon">◷</span><div><b>پیگیری سفارش</b><small>دسترسی به مسیر سفارش‌های شما</small></div></article>
        </section>

        {isTechnolife && !query && !category && techShelfGroups.map(shelf => shelf.products.length > 0 && <section className="sk-tech-shelf" key={shelf.title} aria-label={shelf.title}>
          <div className="sk-tech-shelf-heading"><div><span>{shelf.eyebrow}</span><h2>{shelf.title}</h2></div><button type="button" onClick={() => { setQuery(shelf.searchTerm); document.getElementById("sk-products")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>مشاهده همه <b>←</b></button></div>
          <div className="sk-tech-shelf-products">{shelf.products.map(product => <Link href={productHrefFor(product)} className="sk-tech-shelf-card" key={product.id}>
            <span className="sk-tech-shelf-image">{safeImageUrl(product.image_url) ? <img src={safeImageUrl(product.image_url) || ""} alt={product.title} loading="lazy" decoding="async" /> : <i>{categoryGlyph(product.category, product.title)}</i>}</span>
            <span className="sk-tech-shelf-title">{product.title}</span>
            <span className="sk-tech-shelf-brand">{product.brand || product.seller_name || "کالای ثبت‌شده"}</span>
            <strong>{money(product.price, product.currency)}</strong>
          </Link>)}</div>
        </section>)}

        <section className="sk-featured-categories" aria-labelledby="sk-featured-categories-title" style={{display:theme?.showCategories===false?"none":undefined,order:orderOf("categories")}}>
          <div className="sk-section-heading"><div><span className="sk-eyebrow">دسته‌بندی‌های بازارگاه</span><h2 id="sk-featured-categories-title">از کجا شروع کنیم؟</h2><p>دستهٔ موردنظرت را انتخاب کن تا کالاهای مرتبط از کاتالوگ نمایش داده شوند.</p></div><Link href="/store/shop" className="sk-section-link">همه کالاها <span>←</span></Link></div>
          {categories.length ? <div className="sk-featured-grid">
            {categories.map(([key, name]) => {
              const count = sourceProducts.filter(product => normalizeText(canonicalCategory(product.category)) === key).length;
              const active = normalizeText(canonicalCategory(category)) === key;
              return <button type="button" key={key} className={active ? "sk-featured-category is-active" : "sk-featured-category"} aria-pressed={active} onClick={() => { setCategory(active ? "" : name); document.getElementById("sk-products")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>
                <span className="sk-featured-image sk-category-art" style={(() => { const image = safeImageUrl(sourceProducts.find(product => normalizeText(canonicalCategory(product.category)) === key && safeImageUrl(product.image_url))?.image_url); return image ? { backgroundImage: `linear-gradient(0deg,rgba(20,32,45,.12),rgba(20,32,45,.02)),url("${image}")` } : undefined; })()}><i>{categoryGlyph(name, name)}</i></span>
                <span className="sk-featured-copy"><b>{name}</b><small>{count.toLocaleString("fa-IR")} محصول ثبت‌شده</small></span><span className="sk-featured-arrow">←</span>
              </button>;
            })}
          </div> : <div className="sk-category-empty"><span>▦</span><div><b>دسته‌بندی‌های اصلی بازارگاه</b><p>این فهرست برای مرور دسته‌ها آماده است؛ تعداد کالاها فقط از محصولات واقعی و منتشرشده محاسبه می‌شود.</p></div></div>}
        </section>

        <section className="sk-catalog" id="sk-products" aria-labelledby="sk-products-title" style={{order:orderOf("products")}}>
          <div className="sk-section-heading"><div><span className="sk-eyebrow">کاتالوگ بازارگاه</span><h2 id="sk-products-title">محصولات برای انتخاب تو</h2><p>فقط محصولاتی نمایش داده می‌شوند که در کاتالوگ خود سوکار ثبت و برای فروش فعال شده‌اند.</p></div><Link href="/marketplace" className="sk-section-link">رفتن به بازارگاه <span>←</span></Link></div>

          <div className="sk-category-row" aria-label="فیلتر دسته‌بندی">
            <button type="button" className={!category ? "sk-category-chip is-active" : "sk-category-chip"} onClick={() => setCategory("")}>همه کالاها</button>
            {categories.map(([key, item]) => {
              const active = normalizeText(category) === key;
              const count = sourceProducts.filter(product => normalizeText(canonicalCategory(product.category)) === key).length;
              return <button type="button" key={key} aria-pressed={active} className={active ? "sk-category-chip is-active" : "sk-category-chip"} onClick={() => setCategory(active ? "" : item)}><span>{categoryGlyph(item, item)}</span>{item} <small>({count.toLocaleString("fa-IR")})</small></button>;
            })}
          </div>

          <div className="sk-catalog-meta"><span>{loading ? "در حال دریافت کاتالوگ…" : <><b>{products.length.toLocaleString("fa-IR")}</b> نتیجه</>}</span><label className="sk-sort-control">مرتب‌سازی <select value={sortBy} onChange={event => setSortBy(event.target.value as typeof sortBy)}><option value="newest">جدیدترین ثبت‌شده</option><option value="price-asc">ارزان‌ترین</option><option value="price-desc">گران‌ترین</option><option value="title">نام کالا</option></select></label>{(query || category) && <button type="button" onClick={() => { setQuery(""); setCategory(""); }}>پاک‌کردن فیلترها ×</button>}</div>

          {loading ? <div className="sk-state"><span className="sk-loader" />در حال دریافت اطلاعات واقعی محصولات…</div>
          : error ? <div className="sk-state sk-state-error"><b>دریافت محصولات انجام نشد</b><p>{error}</p><button type="button" onClick={() => window.location.reload()}>تلاش دوباره</button></div>
          : products.length ? <div className="sk-product-grid">{products.slice(0, showAllProducts ? products.length : 20).map(product => {
            const productHref = productHrefFor(product);
            const image = safeImageUrl(product.image_url);
            return <article className="sk-product-card" key={product.id}>
              <Link href={productHref} className="sk-product-visual" aria-label={"مشاهده " + product.title}>
                <span className="sk-product-category">{product.is_demo_product || product.is_reference ? "نمونهٔ آزمایشی" : (canonicalCategory(product.category) || "سایر کالاها")}</span>
                {image ? <img src={image} alt={product.title} loading="lazy" decoding="async" /> : <span className="sk-product-glyph"><span aria-hidden="true">{categoryGlyph(product.category, product.title)}</span><small>تصویر کالا هنوز ثبت نشده</small></span>}
                <span className="sk-visual-brand">{identity.name}</span>
              </Link>
              <div className="sk-product-info">
                <span className="sk-seller-name"><i />{product.is_demo_product ? "سوکار · کاتالوگ آزمایشی" : product.is_reference ? "سوکار · مرجع آزمایشی" : (product.seller_name || "فروشنده ثبت‌شده")}</span>
                <Link href={productHref} className="sk-product-title">{product.title}</Link>
                <p>{product.description || "مشخصات تکمیلی این کالا هنوز توسط فروشنده ثبت نشده است."}</p>
                <div className="sk-product-price"><strong>{money(product.price, product.currency)}</strong><small>{product.is_demo_product ? "قیمت مرجع آزمایشی؛ قیمت فروش سوکار نیست" : product.is_reference ? "قیمت مرجع از منبع اصلی؛ برای تست و بررسی" : "قیمت ثبت‌شده در کاتالوگ سوکار"}</small></div>
                <Link href={productHref} className="sk-product-cta">مشاهده جزئیات <span>←</span></Link>
               {!product.is_reference && <AddToCartButton compact product={{ id: product.id, sku: product.sku, title: product.title, price: product.price, currency: product.currency, seller_name: product.seller_name, store_id: product.store_id, image_url: product.image_url, is_demo_product: product.is_demo_product, source_url: product.source_url }} />}
              </div>
            </article>;
          })}</div>
          : <div className="sk-state"><b>{sourceProducts.length ? "محصولی با این فیلتر پیدا نشد." : isTechnolife ? "هنوز کالای دیجیتال فعالی در کاتالوگ ثبت نشده است." : "هنوز محصول فعالی برای نمایش عمومی ثبت نشده است."}</b><p>{sourceProducts.length ? "فیلتر دسته‌بندی یا عبارت جستجو را تغییر بده." : "پس از ثبت و فعال‌سازی محصولات واقعی، کالاها در این بخش نمایش داده می‌شوند."}</p>{(query || category) && <button type="button" onClick={() => { setQuery(""); setCategory(""); }}>نمایش همه کالاها</button>}</div>}
          {products.length > 12 && !showAllProducts && <div className="sk-more"><Link href="/store/shop">مشاهده همه {products.length.toLocaleString("fa-IR")} نتیجه <span>←</span></Link></div>}
          {showAllProducts && products.length > 12 && <div className="sk-catalog-meta"><span>نمایش همه نتایج دریافت‌شده از کاتالوگ</span><Link href="/">بازگشت به صفحه اصلی</Link></div>}
        </section>


        <section className="sk-market-banner">
          <div><span className="sk-eyebrow">برای فروشندگان</span><h2>کسب‌وکارت را به بازارگاه سوکار وصل کن.</h2><p>مسیر فروشندگان و فروشگاه‌های ثبت‌شده را ببین و درباره حضور در بازارگاه اطلاعات بگیر.</p><Link href={"/login?brand="+identity.loginBrand}>ورود به بخش فروشندگان <span>←</span></Link></div>
          <div className="sk-banner-symbol" aria-hidden="true"><span>س</span><i /><i /><i /></div>
        </section>

        <section className="sk-bottom-links"><Link href="/marketplace/directory"><span>▦</span><b>فروشگاه‌های بازارگاه</b><small>مرور فروشگاه‌های ثبت‌شده</small><em>←</em></Link><Link href="/pay"><span>◇</span><b>خدمات اعتباری</b><small>مشاهده مسیرهای فعال</small><em>←</em></Link><Link href="/store/orders"><span>◷</span><b>پیگیری سفارش</b><small>رفتن به بخش سفارش‌ها</small><em>←</em></Link></section>
      </div>

      <footer className="sk-footer">
        <div className="sk-wrap sk-footer-main">
          <div className="sk-footer-brand">
            <Link href={identity.domain==="sookar.ir"?"/":identity.domain==="digibile.ir"?"/store/digibile":"/store/"+variant} className="sk-logo"><span className="sk-logo-mark">{identity.mark}</span><span><b>{identity.name}</b><small>{identity.tagline}</small></span></Link>
            <p>{identity.footerDescription}</p>
            <div className="sk-footer-domain"><span aria-hidden="true">↗</span><span><small>نشانی سایت</small><b>{identity.domain}</b></span></div>
          </div>
          <div className="sk-footer-column"><b>خرید و کشف کالا</b><Link href="/store/shop">همه کالاها</Link><Link href="/marketplace">بازارگاه</Link><Link href="/marketplace/directory">فروشگاه‌های ثبت‌شده</Link><Link href="/store">دسته‌بندی‌های کالا</Link></div>
          <div className="sk-footer-column"><b>سفارش و پرداخت</b><Link href="/store/cart">سبد خرید</Link><Link href="/store/orders">پیگیری سفارش</Link><Link href="/pay">خدمات اعتباری</Link><Link href="/store/returns">بازگشت کالا</Link></div>
          <div className="sk-footer-column"><b>حساب کاربری</b><Link href={"/login?brand="+identity.loginBrand}>ورود به حساب</Link><Link href="/account/orders">سفارش‌های من</Link><Link href={"/login?brand="+identity.loginBrand}>پنل فروشندگان</Link><Link href="/store/faq">پرسش‌های متداول</Link></div>
          <div className="sk-footer-column"><b>راهنما و قوانین</b><Link href="/store/terms">قوانین و شرایط</Link><Link href="/store/faq">راهنمای خرید</Link><Link href="/marketplace/directory">معرفی فروشگاه‌ها</Link><Link href={"/login?brand="+identity.loginBrand}>ارتباط با پشتیبانی</Link></div>
        </div>
        <div className="sk-footer-trust"><div className="sk-wrap"><span><i>✓</i> نمایش اطلاعات ثبت‌شدهٔ کاتالوگ</span><span><i>⌕</i> جستجو و دسته‌بندی کالاها</span><span><i>↗</i> دسترسی مستقیم به صفحات فروشگاه</span></div></div>
        <div className="sk-footer-bottom"><div className="sk-wrap"><span>{identity.name} · فروشگاه و بازارگاه</span><span>نشانی سایت: {identity.domain==="sookar.ir" ? <a href="https://sookar.ir" target="_blank" rel="noopener noreferrer">sookar.ir ↗</a> : identity.domain}</span><span>اطلاعات قیمت و موجودی باید پیش از خرید بررسی شود.</span></div></div>
      </footer>
    </main>
  );
}
