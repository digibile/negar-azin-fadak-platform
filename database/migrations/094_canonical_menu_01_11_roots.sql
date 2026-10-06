-- Exact canonical operational roots 01..11 used by the management navigation contract.
begin;

with seed(menu_key,title,path,sort_order,permission,children) as (values
('governance','حاکمیت و راهبری','/modules/?code=governance',1,'modules:governance:read','["داشبورد حاکمیت","شرکت‌ها","هلدینگ‌ها","شعب","ساختار سازمانی"]'::jsonb),
('identity','هویت و دسترسی','/modules/?code=identity',2,'modules:identity:read','["کاربران","نقش‌ها","گروه‌های کاربری","مجوزها","امنیت و نشست‌ها"]'::jsonb),
('master-data','داده‌های پایه','/modules/?code=master-data',3,'modules:master-data:read','["تعاریف پایه","کدها و شناسه‌ها","دسته‌بندی‌ها","واحدها","سوابق تغییر"]'::jsonb),
('customer-360','مشتری و پرونده 360','/modules/?code=customer-360',4,'modules:customer-360:read','["پرونده مشتری","مشخصات هویتی","تعاملات","سوابق خرید","نمای مالی"]'::jsonb),
('smart-calendar','تقویم هوشمند','/modules/?code=smart-calendar',5,'modules:smart-calendar:read','["تقویم کاری","تعطیلات","رویدادها","سررسیدها","برنامه‌ریزی"]'::jsonb),
('business-rules','قوانین کسب‌وکار','/modules/?code=business-rules',6,'modules:business-rules:read','["قواعد","شرایط","اقدامات","اولویت اجرا","نسخه قواعد"]'::jsonb),
('sla','مدیریت SLA','/modules/?code=sla',7,'modules:sla:read','["تعهدات خدمت","سطح سرویس","زمان پاسخ","زمان حل","نقض تعهد"]'::jsonb),
('accounting-finance','حسابداری و مالی','/modules/?code=accounting-finance',8,'modules:accounting-finance:read','["داشبورد مالی","هسته حسابداری","اسناد حسابداری","دوره‌های مالی","گزارش‌های مالی"]'::jsonb),
('treasury-bank','خزانه و بانک','/modules/?code=treasury-bank',9,'modules:treasury-bank:read','["حساب‌های بانکی","دریافت‌ها","پرداخت‌ها","مغایرت بانکی","تنخواه"]'::jsonb),
('wallet-ledger','کیف پول و دفترکل','/modules/?code=wallet-ledger',10,'modules:wallet-ledger:read','["کیف پول","موجودی","تراکنش‌ها","دفترکل","تطبیق و تسویه"]'::jsonb),
('credit-facilities','اعتبارات و تسهیلات','/modules/?code=credit-facilities',11,'modules:credit-facilities:read','["محصولات اعتباری","درخواست اعتبار","پرونده اعتباری","پرداخت تسهیلات","وصول"]'::jsonb)
)
insert into menu_items(menu_key,title,path,sort_order,permission,children,is_active,parent_id)
select menu_key,title,path,sort_order,permission,children,true,null
from seed
on conflict(menu_key) where menu_key is not null do update
set title=excluded.title,path=excluded.path,sort_order=excluded.sort_order,
    permission=excluded.permission,children=excluded.children,is_active=true,updated_at=now();

with seed(menu_key,title,path,sort_order,permission,children) as (values
('governance','حاکمیت و راهبری','/modules/?code=governance',1,'modules:governance:read','["داشبورد حاکمیت","شرکت‌ها","هلدینگ‌ها","شعب","ساختار سازمانی"]'::jsonb),
('identity','هویت و دسترسی','/modules/?code=identity',2,'modules:identity:read','["کاربران","نقش‌ها","گروه‌های کاربری","مجوزها","امنیت و نشست‌ها"]'::jsonb),
('master-data','داده‌های پایه','/modules/?code=master-data',3,'modules:master-data:read','["تعاریف پایه","کدها و شناسه‌ها","دسته‌بندی‌ها","واحدها","سوابق تغییر"]'::jsonb),
('customer-360','مشتری و پرونده 360','/modules/?code=customer-360',4,'modules:customer-360:read','["پرونده مشتری","مشخصات هویتی","تعاملات","سوابق خرید","نمای مالی"]'::jsonb),
('smart-calendar','تقویم هوشمند','/modules/?code=smart-calendar',5,'modules:smart-calendar:read','["تقویم کاری","تعطیلات","رویدادها","سررسیدها","برنامه‌ریزی"]'::jsonb),
('business-rules','قوانین کسب‌وکار','/modules/?code=business-rules',6,'modules:business-rules:read','["قواعد","شرایط","اقدامات","اولویت اجرا","نسخه قواعد"]'::jsonb),
('sla','مدیریت SLA','/modules/?code=sla',7,'modules:sla:read','["تعهدات خدمت","سطح سرویس","زمان پاسخ","زمان حل","نقض تعهد"]'::jsonb),
('accounting-finance','حسابداری و مالی','/modules/?code=accounting-finance',8,'modules:accounting-finance:read','["داشبورد مالی","هسته حسابداری","اسناد حسابداری","دوره‌های مالی","گزارش‌های مالی"]'::jsonb),
('treasury-bank','خزانه و بانک','/modules/?code=treasury-bank',9,'modules:treasury-bank:read','["حساب‌های بانکی","دریافت‌ها","پرداخت‌ها","مغایرت بانکی","تنخواه"]'::jsonb),
('wallet-ledger','کیف پول و دفترکل','/modules/?code=wallet-ledger',10,'modules:wallet-ledger:read','["کیف پول","موجودی","تراکنش‌ها","دفترکل","تطبیق و تسویه"]'::jsonb),
('credit-facilities','اعتبارات و تسهیلات','/modules/?code=credit-facilities',11,'modules:credit-facilities:read','["محصولات اعتباری","درخواست اعتبار","پرونده اعتباری","پرداخت تسهیلات","وصول"]'::jsonb)
),
parents as (
 select m.id,m.menu_key,m.path,m.permission,s.children
 from menu_items m join seed s on s.menu_key=m.menu_key
)
insert into menu_items(menu_key,parent_id,title,path,sort_order,permission,children,is_active)
select p.menu_key||':canonical:'||x.ord,p.id,x.title,
       p.path||'&tab=canonical-'||x.ord,x.ord,p.permission,'[]'::jsonb,true
from parents p
cross join lateral jsonb_array_elements_text(p.children) with ordinality x(title,ord)
on conflict(menu_key) where menu_key is not null do update
set parent_id=excluded.parent_id,title=excluded.title,path=excluded.path,
    sort_order=excluded.sort_order,permission=excluded.permission,is_active=true,updated_at=now();

insert into menu_item_panels(menu_item_id,panel_code,is_shared,sort_order,is_visible)
select m.id,p.code,true,m.sort_order,true
from menu_items m cross join menu_panels p
where m.menu_key in ('governance:canonical:1','identity:canonical:1','master-data:canonical:1','customer-360:canonical:1','smart-calendar:canonical:1','business-rules:canonical:1','sla:canonical:1','accounting-finance:canonical:1','treasury-bank:canonical:1','wallet-ledger:canonical:1','credit-facilities:canonical:1')
   or m.menu_key like any(array['governance:canonical:%','identity:canonical:%','master-data:canonical:%','customer-360:canonical:%','smart-calendar:canonical:%','business-rules:canonical:%','sla:canonical:%','accounting-finance:canonical:%','treasury-bank:canonical:%','wallet-ledger:canonical:%','credit-facilities:canonical:%'])
on conflict(menu_item_id,panel_code) do update
set is_shared=true,is_visible=true,sort_order=excluded.sort_order;

commit;
