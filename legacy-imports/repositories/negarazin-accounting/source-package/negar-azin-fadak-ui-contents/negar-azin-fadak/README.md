# پلتفرم بیزینس نگار آذین فدک ایران — Frontend UI/UX

نسخه پیش‌نمایش رابط کاربری **سامانه یکپارچه مدیریت کسب‌وکار نگار آذین فدک**.

> ⚠️ **این پروژه فقط UI/UX است.**
> هیچ Backend، Database، API واقعی، Authentication، Authorization، RBAC، Master Menu،
> Business Logic یا Data Model جدیدی در این پروژه اختراع یا پیاده‌سازی نشده است.
> تمام داده‌ها **Mock/Static** هستند و صرفاً برای Preview استفاده می‌شوند.

---

## اجرای پروژه (Local)

پیش‌نیاز: Node.js نسخه ۱۸ یا بالاتر

```bash
npm install
npm run dev      # اجرا روی http://localhost:5173
npm run build    # خروجی production در پوشه dist
npm run preview  # پیش‌نمایش خروجی build
```

---

## استک فنی

| مورد | انتخاب | دلیل |
|---|---|---|
| Framework | React 18 + TypeScript | سازگار با اکثر معماری‌های سازمانی |
| Build | Vite | سرعت بالای توسعه |
| Routing | React Router v6 | مسیرهای مستقل و قابل تطبیق |
| Styling | TailwindCSS + CSS Variables | Theme-ready و بدون hard-code |
| State | React state محلی | بدون وابستگی به State Manager خاص |

هیچ وابستگی سنگین یا قفل‌کننده‌ای (UI Kit تجاری، Chart library، Date library) اضافه نشده
تا تیم اصلی در انتخاب ابزارهای نهایی آزاد باشد.

---

## ساختار پروژه

```
src/
├── styles/
│   ├── tokens.css            ← Design Token System (تنها منبع رنگ/شعاع/فاصله)
│   └── global.css
├── theme/
│   ├── themes.ts             ← تعریف پوسته‌ها (خروجی آینده Template Manager)
│   └── ThemeProvider.tsx     ← Context تغییر پوسته و تراکم نمایش
├── lib/
│   ├── api/
│   │   ├── types.ts          ← قرارداد داده (Data Contract)
│   │   └── client.ts         ← ⭐ لایه انتزاعی دسترسی به داده
│   └── utils/format.ts       ← اعداد فارسی، ارز، تاریخ شمسی
├── mock/                     ← تمام داده‌های نمایشی
├── components/
│   ├── ui/                   ← Design System (Button, Table, Modal, Toast, ...)
│   ├── layout/               ← AppShell, Header, Sidebar, PortalShell, CustomerShell
│   └── patterns/             ← PageHeader, EntityListPage (موتور عمومی صفحات)
├── pages/                    ← صفحات، دسته‌بندی‌شده بر اساس ماژول
└── App.tsx                   ← نقشه کامل مسیرها
```

---

## ⭐ نکته کلیدی: جایگزینی Mock با API واقعی

تمام صفحات لیست/مدیریتی **فقط** از `src/lib/api/client.ts` داده می‌گیرند و هیچ صفحه‌ای
مستقیماً به پوشه `mock/` وابسته نیست.

برای اتصال به Backend واقعی، فقط بدنه توابع همین یک فایل تغییر می‌کند:

```ts
// وضعیت فعلی (Mock)
async list(source, params) {
  // فیلتر/صفحه‌بندی روی آرایه محلی
}

// وضعیت نهایی (API واقعی) — UI بدون تغییر باقی می‌ماند
async list(endpoint, params) {
  const res = await fetch(`${API_BASE}/${endpoint}?${qs(params)}`);
  return res.json();   // باید مطابق Paginated<T> باشد
}
```

قراردادهای داده در `src/lib/api/types.ts` تعریف شده‌اند (`Paginated<T>`, `BaseEntity`,
`Column<T>`, `FilterField`). تطبیق این قراردادها با مدل واقعی، تنها کاری است که برای
اتصال UI به سیستم لازم است.

---

## موتور عمومی صفحات (Shared Page Engine)

به‌جای کپی‌کردن کد برای هر ماژول، کامپوننت `EntityListPage` یک صفحه کامل تولید می‌کند:
PageHeader + Breadcrumb + Search + Filter + DataTable + Pagination + Create Drawer +
Confirm Dialog + Loading/Empty States.

```tsx
<EntityListPage
  title="شرکت‌ها"
  entityLabel="شرکت"
  breadcrumb={[{ label: "خانه", to: "/master/dashboard" }, { label: "شرکت‌ها" }]}
  source={companies}
  filters={[{ key: "status", label: "وضعیت", type: "status", options: [...] }]}
  createLabel="افزودن شرکت"
/>
```

به همین دلیل، افزودن یک ماژول جدید چند خط کد است، نه یک صفحه جدید.

---

## Theme System

رنگ‌ها، شعاع‌ها و فاصله‌ها **به‌صورت CSS Variable** در `tokens.css` تعریف شده‌اند و
Tailwind از همان متغیرها می‌خواند. هیچ رنگی در کامپوننت‌ها hard-code نشده است.

چهار پوسته آماده: پیش‌فرض سازمانی، زمردی، بنفش، تیره.
تغییر پوسته از آیکن 🎨 در هدر یا از صفحه تنظیمات.

Template Manager در آینده فقط باید همین متغیرها را بازنویسی کند — بدون تغییر کامپوننت‌ها.

---

## نقشه مسیرها (Routes)

| بخش | مسیر نمونه |
|---|---|
| عمومی | `/`, `/products`, `/products/:id`, `/brands`, `/stores`, `/faq`, `/contact`, `/terms` |
| احراز هویت | `/auth/login`, `/auth/verify-otp`, `/auth/mfa`, `/auth/sessions`, `/auth/portal-selection` |
| Master Portal | `/master/dashboard`, `/master/notifications`, `/master/profile`, `/master/settings` |
| سازمان | `/org/companies`, `/org/branches`, `/org/brands`, `/org/employees`, `/org/structure` |
| **مدیریت منو** | `/menu-manager` |
| **مدیریت قالب** | `/template-manager`, `/template-manager/:id/edit` |
| **Dashboard Builder** | `/dashboard-builder`, `/dashboard-builder/:id` |
| کاربران و نقش‌ها | `/users-roles/users`, `/users-roles/roles`, `/users-roles/roles/:id` |
| تجارت | `/commerce/products`, `/commerce/orders`, `/commerce/orders/:id`, `/commerce/sales` |
| موجودی | `/inventory`, `/inventory/warehouses`, `/inventory/movements` |
| مشتریان | `/customers`, `/customers/:id` |
| اعتبار / تسهیلات | `/credit`, `/loans` |
| مالی / CRM | `/finance`, `/finance/journal`, `/crm` |
| گزارش / Audit | `/reports`, `/audit` |
| پرتال‌ها | `/portals/finance`, `/portals/credit`, `/portals/commerce`, `/portals/merchant`, `/portals/store`, `/portals/accounting` |
| پرتال مشتری | `/shop/home`, `/shop/cart`, `/shop/checkout`, `/shop/credit`, `/shop/wallet` |
| حالت‌ها | `/states-showcase`, `/permission-denied`, `/404` |

مسیرها **عمومی و ساده** انتخاب شده‌اند و از هیچ سایت تجاری کپی نشده‌اند؛ تیم اصلی
می‌تواند آن‌ها را با Routing واقعی سیستم جایگزین کند.

---

## صفحات کلیدی برای بررسی

1. `/menu-manager` — درخت منو با Drag & Drop، Expand/Collapse، تغییر وضعیت، Drawer دسترسی نقش‌ها
2. `/dashboard-builder/dash-1` — افزودن/حذف ویجت، کتابخانه ویجت، تخصیص به نقش و پرتال
3. `/template-manager/TPL-1/edit` — ویرایشگر قالب با پیش‌نمایش زنده دسکتاپ/تبلت/موبایل
4. `/users-roles/roles/ROLE-1` — ماتریس دسترسی Granular (ماژول × عملیات)
5. `/states-showcase` — ویترین همه حالت‌های Loading/Empty/Error/Success/Status

---

## مواردی که عمداً انجام **نشده** است

- ساخت Master Menu جدید — `nav.config.ts` فقط یک Mock نمایشی است
- تعریف مدل دسترسی یا RBAC — UI دسترسی‌ها صرفاً نمایشی است
- تعریف Data Model — تایپ‌ها فقط «شکل داده لازم برای رندر» هستند
- استفاده از تقویم شمسی دقیق — تابع `toJalaliApprox` تقریبی و صرفاً نمایشی است و باید
  با کتابخانه رسمی تیم جایگزین شود

---

## مرحله بعد (پیشنهاد تیم اصلی)

1. تأیید جهت بصری و Design Tokens
2. تطبیق `types.ts` با مدل داده واقعی
3. جایگزینی `client.ts` با API واقعی
4. اتصال `nav.config.ts` به Master Menu واقعی
5. اتصال Menu / Dashboard / Template Manager به موتورهای واقعی موجود
6. جایگزینی تقویم شمسی تقریبی با کتابخانه رسمی
