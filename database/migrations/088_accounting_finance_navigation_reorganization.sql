-- Reorganize the central admin catalog: financial/operational links live under menu 08.
-- Existing domain records are preserved; only their navigation parent/panel placement changes.
begin;

with root as (
  select id from menu_items where menu_key='accounting' limit 1
)
update menu_items m
set title='💰 حسابداری و مالی',
    path='/modules/?code=accounting-finance&tab=dashboard',
    sort_order=50,
    parent_id=null,
    is_active=true,
    updated_at=now()
from root
where m.id=root.id;

with root as (select id from menu_items where menu_key='accounting' limit 1)
update menu_items m
set parent_id=root.id,
    is_active=true,
    updated_at=now()
from root
where m.menu_key in (
  'financial-reports','treasury','checks','purchasing','credit','collections',
  'hr','payroll','attendance','documents','production','assets',
  'ai-finance','ai-documents','audit'
);

with root as (select id from menu_items where menu_key='accounting' limit 1)
update menu_items m
set path=case m.menu_key
  when 'accounting' then '/modules/?code=accounting-finance&tab=dashboard'
  when 'treasury' then '/modules/?code=accounting-finance&tab=treasury'
  when 'wallet-ledger' then '/modules/?code=accounting-finance&tab=wallet-ledger'
  when 'credit' then '/modules/?code=accounting-finance&tab=credit-facilities'
  when 'digital-file' then '/modules/?code=accounting-finance&tab=digital-binder'
  else m.path end,
  parent_id=case when m.menu_key in ('accounting','treasury','wallet-ledger','credit','digital-file') then root.id else m.parent_id end,
  updated_at=now()
from root
where m.menu_key in ('accounting','treasury','wallet-ledger','credit','digital-file');

with root as (select id from menu_items where menu_key='accounting' limit 1)
update menu_item_panels p
set is_visible=true,is_shared=true,sort_order=500+p.sort_order
from menu_items m, root
where p.menu_item_id=m.id and p.panel_code='admin' and m.parent_id=root.id;

with root as (select id from menu_items where menu_key='accounting' limit 1)
insert into menu_items(menu_key,parent_id,title,path,sort_order,permission,children,is_active)
select v.menu_key,root.id,v.title,v.path,v.sort_order,v.permission,'[]'::jsonb,true
from root cross join (values
 ('accounting-dashboard','داشبورد مالی','/modules/?code=accounting-finance&tab=dashboard',1,'modules:accounting-finance:read'),
 ('accounting-core','حسابداری','/modules/?code=accounting-finance&tab=accounting',2,'modules:accounting-finance:read'),
 ('accounting-ledgers','دفاتر حسابداری','/modules/?code=accounting-finance&tab=ledgers',3,'modules:accounting-finance:read'),
 ('accounting-chart','کدینگ حساب‌ها','/modules/?code=accounting-finance&tab=chart-of-accounts',4,'modules:accounting-finance:read'),
 ('accounting-receipts-payments','دریافت و پرداخت','/modules/?code=accounting-finance&tab=receipts-payments',5,'modules:accounting-finance:read'),
 ('accounting-treasury','خزانه و بانک','/modules/?code=accounting-finance&tab=treasury',6,'modules:accounting-finance:read'),
 ('accounting-receivables','اسناد دریافتنی','/modules/?code=accounting-finance&tab=receivables',7,'modules:accounting-finance:read'),
 ('accounting-payables','اسناد پرداختنی','/modules/?code=accounting-finance&tab=payables',8,'modules:accounting-finance:read'),
 ('accounting-parties','طرف حساب‌ها','/modules/?code=accounting-finance&tab=parties',9,'modules:accounting-finance:read'),
 ('accounting-centers','مراکز مالی','/modules/?code=accounting-finance&tab=financial-centers',10,'modules:accounting-finance:read'),
 ('accounting-periods','دوره‌های مالی','/modules/?code=accounting-finance&tab=fiscal-periods',11,'modules:accounting-finance:read'),
 ('accounting-assets','دارایی‌های ثابت','/modules/?code=accounting-finance&tab=fixed-assets',12,'modules:accounting-finance:read'),
 ('accounting-purchase-cost','خرید و هزینه','/modules/?code=accounting-finance&tab=purchases-expenses',13,'modules:accounting-finance:read'),
 ('accounting-sales-income','فروش و درآمد','/modules/?code=accounting-finance&tab=sales-income',14,'modules:accounting-finance:read'),
 ('accounting-tax','مالیات','/modules/?code=accounting-finance&tab=tax',15,'modules:accounting-finance:read'),
 ('accounting-budget','بودجه و کنترل مالی','/modules/?code=accounting-finance&tab=budget-control',16,'modules:accounting-finance:read'),
 ('accounting-commitments','تعهدات مالی','/modules/?code=accounting-finance&tab=commitments',17,'modules:accounting-finance:read'),
 ('accounting-wallet','کیف پول و دفترکل','/modules/?code=accounting-finance&tab=wallet-ledger',18,'modules:accounting-finance:read'),
 ('accounting-documents','زونکن دیجیتال و مدیریت اسناد','/modules/?code=accounting-finance&tab=digital-binder',19,'modules:accounting-finance:read'),
 ('accounting-reports','گزارش‌های مالی','/modules/?code=accounting-finance&tab=financial-reports',20,'modules:accounting-finance:read'),
 ('accounting-control','کنترل و حسابرسی','/modules/?code=accounting-finance&tab=financial-control',21,'modules:accounting-finance:read'),
 ('accounting-settings','تنظیمات مالی','/modules/?code=accounting-finance&tab=financial-settings',22,'modules:accounting-finance:read'),
 ('accounting-procurement','تأمین و خرید','/modules/?code=accounting-finance&tab=procurement',23,'modules:accounting-finance:read'),
 ('accounting-credit','اعتبارات و تسهیلات','/modules/?code=accounting-finance&tab=credit-facilities',24,'modules:accounting-finance:read'),
 ('accounting-collections','وصول مطالبات','/modules/?code=accounting-finance&tab=collections',25,'modules:accounting-finance:read'),
 ('accounting-hr','منابع انسانی و حضور و غیاب مالی','/modules/?code=accounting-finance&tab=hr-attendance',26,'modules:accounting-finance:read'),
 ('accounting-production','تولید','/modules/?code=accounting-finance&tab=production',27,'modules:accounting-finance:read'),
 ('accounting-ai-finance','AI مالی و حسابداری','/modules/?code=accounting-finance&tab=ai-finance',28,'modules:accounting-finance:read'),
 ('accounting-ai-documents','AI اسناد و OCR','/modules/?code=accounting-finance&tab=ai-documents-ocr',29,'modules:accounting-finance:read'),
 ('accounting-audit','حسابرسی و کنترل داخلی','/modules/?code=accounting-finance&tab=internal-audit',30,'modules:accounting-finance:read')
) v(menu_key,title,path,sort_order,permission)
on conflict(menu_key) where menu_key is not null do update
set parent_id=excluded.parent_id,title=excluded.title,path=excluded.path,sort_order=excluded.sort_order,
    permission=excluded.permission,is_active=true,updated_at=now();

with root as (select id from menu_items where menu_key='accounting' limit 1)
insert into menu_item_panels(menu_item_id,panel_code,is_shared,sort_order,is_visible)
select m.id,'admin',true,800+m.sort_order,true
from menu_items m, root
where m.parent_id=root.id
on conflict(menu_item_id,panel_code) do update
set is_shared=true,is_visible=true,sort_order=excluded.sort_order;

commit;
