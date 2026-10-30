import { generateEntities } from "./generate";

export const users = generateEntities("USR", 30, (i) => `کاربر سازمانی ${i}`, (i) => `user${i}@negarazin.ir`);

export const roles = [
  { id: "ROLE-1", title: "مدیر ارشد سیستم", usersCount: 2, description: "دسترسی کامل به تمام پرتال‌ها و ماژول‌ها" },
  { id: "ROLE-2", title: "مدیر مالی", usersCount: 5, description: "دسترسی به ماژول مالی، حسابداری و گزارش‌ها" },
  { id: "ROLE-3", title: "کارشناس اعتبارسنجی", usersCount: 8, description: "دسترسی به ماژول اعتبار و تسهیلات" },
  { id: "ROLE-4", title: "مدیر فروشگاه", usersCount: 14, description: "دسترسی به پرتال فروشگاه و سفارش‌ها" },
  { id: "ROLE-5", title: "پذیرنده/فروشنده", usersCount: 22, description: "دسترسی به پرتال پذیرندگان" },
  { id: "ROLE-6", title: "کارشناس پشتیبانی مشتری", usersCount: 11, description: "دسترسی به CRM و پرونده مشتریان" },
];

export const permissionModules = [
  { key: "org", label: "مدیریت سازمان" },
  { key: "menu", label: "مدیریت منوها" },
  { key: "template", label: "مدیریت قالب‌ها" },
  { key: "dashboard", label: "مدیریت داشبوردها" },
  { key: "commerce", label: "تجارت" },
  { key: "inventory", label: "موجودی" },
  { key: "customers", label: "مشتریان" },
  { key: "credit", label: "اعتبار" },
  { key: "loans", label: "تسهیلات" },
  { key: "finance", label: "مالی" },
  { key: "crm", label: "CRM" },
  { key: "reports", label: "گزارش‌ها" },
  { key: "audit", label: "Audit" },
  { key: "settings", label: "تنظیمات" },
];

export const permissionActions = ["مشاهده", "ایجاد", "ویرایش", "حذف", "فعال/غیرفعال", "تأیید/رد", "خروجی گرفتن"];
