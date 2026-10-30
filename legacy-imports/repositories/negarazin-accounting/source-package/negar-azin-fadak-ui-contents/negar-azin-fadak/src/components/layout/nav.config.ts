// پیکربندی ناوبری — این فایل معادل UI ساده‌شده «Master Menu» است.
// در معماری واقعی، این آرایه از API منوی اختصاص‌یافته به هر Portal/Role دریافت می‌شود
// (همان چیزی که بخش «مدیریت منوها» تولید می‌کند). اینجا فقط برای Preview، Mock است.
import type { IconName } from "../ui/Icon";

export interface NavItem {
  label: string;
  icon: IconName;
  to?: string;
  children?: NavItem[];
}

export const adminNav: NavItem[] = [
  { label: "داشبورد", icon: "dashboard", to: "/master/dashboard" },
  {
    label: "مدیریت سازمان", icon: "building",
    children: [
      { label: "شرکت‌ها", icon: "building-plain", to: "/org/companies" },
      { label: "شعبه‌ها", icon: "map", to: "/org/branches" },
      { label: "برندها", icon: "tag", to: "/org/brands" },
      { label: "فروشگاه‌ها", icon: "store", to: "/org/stores" },
      { label: "واحدهای کسب‌وکار", icon: "boxes", to: "/org/business-units" },
      { label: "دپارتمان‌ها", icon: "layers", to: "/org/departments" },
      { label: "سمت‌های شغلی", icon: "briefcase", to: "/org/positions" },
      { label: "کارمندان", icon: "users", to: "/org/employees" },
      { label: "چارت سازمانی", icon: "folder-tree", to: "/org/structure" },
    ],
  },
  {
    label: "مدیریت منوها", icon: "list-tree",
    children: [{ label: "مدیریت منو", icon: "list-tree", to: "/menu-manager" }],
  },
  {
    label: "مدیریت قالب‌ها", icon: "brush",
    children: [{ label: "لیست قالب‌ها", icon: "brush", to: "/template-manager" }],
  },
  {
    label: "مدیریت داشبوردها", icon: "gauge",
    children: [{ label: "لیست داشبوردها", icon: "gauge", to: "/dashboard-builder" }],
  },
  {
    label: "کاربران و نقش‌ها", icon: "user-round",
    children: [
      { label: "کاربران", icon: "user-round", to: "/users-roles/users" },
      { label: "نقش‌ها و دسترسی‌ها", icon: "shield-check", to: "/users-roles/roles" },
    ],
  },
  {
    label: "تجارت", icon: "bag",
    children: [
      { label: "محصولات", icon: "package", to: "/commerce/products" },
      { label: "دسته‌بندی‌ها", icon: "rows", to: "/commerce/categories" },
      { label: "سفارش‌ها", icon: "invoice", to: "/commerce/orders" },
      { label: "فروش", icon: "trend", to: "/commerce/sales" },
      { label: "خریدها", icon: "download", to: "/commerce/purchases" },
    ],
  },
  {
    label: "موجودی", icon: "package",
    children: [
      { label: "داشبورد موجودی", icon: "chart", to: "/inventory" },
      { label: "انبارها", icon: "warehouse", to: "/inventory/warehouses" },
      { label: "گردش کالا", icon: "repeat", to: "/inventory/movements" },
      { label: "کالاهای کم‌موجود", icon: "alert", to: "/inventory/low-stock" },
    ],
  },
  { label: "مشتریان", icon: "team", to: "/customers" },
  { label: "پذیرندگان", icon: "store", to: "/merchants" },
  { label: "تأمین‌کنندگان", icon: "truck", to: "/suppliers" },
  { label: "اعتبار", icon: "card", to: "/credit" },
  { label: "تسهیلات", icon: "bank", to: "/loans" },
  {
    label: "مالی", icon: "money",
    children: [
      { label: "داشبورد مالی", icon: "chart", to: "/finance" },
      { label: "حساب‌های بانکی", icon: "bank", to: "/finance/bank-accounts" },
      { label: "اسناد حسابداری", icon: "sheet", to: "/finance/journal" },
    ],
  },
  { label: "CRM", icon: "handshake", to: "/crm" },
  { label: "گزارش‌ها", icon: "pie", to: "/reports" },
  { label: "Audit", icon: "history", to: "/audit" },
  { label: "تنظیمات", icon: "settings", to: "/settings" },
];

export const portalNavs: Record<string, NavItem[]> = {
  "super-admin": adminNav,
  finance: [
    { label: "داشبورد مالی", icon: "home", to: "/portals/finance" },
    { label: "پرداخت‌ها و دریافت‌ها", icon: "money", to: "/finance" },
    { label: "حساب‌های بانکی", icon: "bank", to: "/finance/bank-accounts" },
    { label: "اسناد حسابداری", icon: "sheet", to: "/finance/journal" },
    { label: "گزارش‌های مالی", icon: "pie", to: "/reports" },
  ],
  credit: [
    { label: "داشبورد اعتبار", icon: "home", to: "/portals/credit" },
    { label: "درخواست‌های اعتبار", icon: "card", to: "/credit" },
    { label: "پرونده‌های تسهیلات", icon: "bank", to: "/loans" },
    { label: "گزارش‌های ریسک", icon: "pie", to: "/reports" },
  ],
  commerce: [
    { label: "داشبورد تجارت", icon: "home", to: "/portals/commerce" },
    { label: "محصولات", icon: "package", to: "/commerce/products" },
    { label: "سفارش‌ها", icon: "invoice", to: "/commerce/orders" },
    { label: "مشتریان", icon: "team", to: "/customers" },
  ],
  merchant: [
    { label: "داشبورد پذیرنده", icon: "home", to: "/portals/merchant" },
    { label: "محصولات من", icon: "package", to: "/commerce/products" },
    { label: "سفارش‌های من", icon: "invoice", to: "/commerce/orders" },
    { label: "تسویه حساب", icon: "coins", to: "/merchants" },
  ],
  store: [
    { label: "داشبورد فروشگاه", icon: "home", to: "/portals/store" },
    { label: "سفارش‌ها", icon: "invoice", to: "/commerce/orders" },
    { label: "موجودی", icon: "package", to: "/inventory" },
  ],
  accounting: [
    { label: "داشبورد حسابداری", icon: "home", to: "/portals/accounting" },
    { label: "اسناد", icon: "sheet", to: "/finance/journal" },
    { label: "حساب‌های بانکی", icon: "bank", to: "/finance/bank-accounts" },
  ],
  customer: [
    { label: "خانه", icon: "home", to: "/shop/home" },
    { label: "سفارش‌های من", icon: "invoice", to: "/shop/orders" },
    { label: "کیف پول", icon: "wallet2", to: "/shop/wallet" },
    { label: "اعتبار من", icon: "card", to: "/shop/credit" },
  ],
};
