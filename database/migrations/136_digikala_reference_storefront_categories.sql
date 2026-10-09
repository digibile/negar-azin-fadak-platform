-- 136: align the storefront's category navigation with the approved visual reference.
-- These are Sookar-owned categories; no external product pages or source links are exposed.
update marketplace_categories
set status='inactive',updated_at=now()
where code='office-supplies';

insert into marketplace_categories(tenant_id,code,name,status,sort_order)
select t.id,c.code,c.name,'active',c.sort_order
from tenants t
cross join (values
 ('mobile-tablet','موبایل',10),
 ('tools','ابزارآلات',20),
 ('laptop-computer','لپ تاپ',30),
 ('health-medical','پزشکی و سلامت',40),
 ('audio-video','کالای دیجیتال',50),
 ('books-stationery','شهر کتاب و هنر',60),
 ('home-kitchen','خانه و آشپزخانه',70),
 ('sports-travel','ورزش و سفر',80),
 ('home-appliances','لوازم خانگی برقی',90),
 ('gift-card','کارت هدیه',100),
 ('beauty-health','آرایشی بهداشتی',110),
 ('supermarket','سوپرمارکتی',120),
 ('fashion-apparel','مد و پوشاک',130),
 ('baby-kids','اسباب‌بازی و کودک',140),
 ('gold-silver','طلا و نقره',150),
 ('local-products','بومی و محلی',160),
 ('auto-tools','خودرو و موتور',170),
 ('pet-shop','پت شاپ',180)
) as c(code,name,sort_order)
where t.status='active'
on conflict(tenant_id,code) do update
set name=excluded.name,status='active',sort_order=excluded.sort_order,updated_at=now();
