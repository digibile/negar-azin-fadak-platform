# TejarhStore

فروشگاه اینترنتی «تجارت» — ASP.NET Core 9 / PostgreSQL

## ساختار پروژه
- `TejarhStore.Domain` — موجودیت‌ها (Entities)
- `TejarhStore.Application` — رابط‌ها (Interfaces)
- `TejarhStore.Infrastructure` — دیتابیس (EF Core + PostgreSQL)
- `TejarhStore.Web` — کنترلرها، View ها، و API

## نصب روی سرور (بعد از git clone)

```bash
cd tejarhstore
dotnet restore
dotnet build
```

### تنظیم appsettings.json
فایل `src/TejarhStore.Web/appsettings.json` را باز کن و مقادیر واقعی را جایگزین کن:
- `ConnectionStrings:DefaultConnection` — اطلاعات دیتابیس PostgreSQL
- `Zarinpal:MerchantId` — کد درگاه پرداخت
- `Jwt:Key` — یک رشته‌ی تصادفی و امن برای امضای توکن

### ساخت Migration و اتصال به دیتابیس
```bash
cd src/TejarhStore.Web
dotnet ef migrations add InitialCreate -p ../TejarhStore.Infrastructure -s .
dotnet ef database update -p ../TejarhStore.Infrastructure -s .
```

### اجرا (تست)
```bash
dotnet run --urls http://127.0.0.1:5000
```

## ادمین پیش‌فرض
- Email: `admin@tejarh.ir`
- Password: `Admin@123456`

⚠️ حتماً بعد از اولین ورود این رمز را تغییر بده.

## به‌روزرسانی بعدی (وقتی کدها روی گیت‌هاب تغییر کرد)
```bash
cd tejarhstore
git pull
dotnet build
systemctl restart tejarhstore
```
