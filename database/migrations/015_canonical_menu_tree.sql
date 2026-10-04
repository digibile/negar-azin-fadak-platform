-- Canonical organization menu tree for the 8 cores and 45 modules.
with groups(code,title,sort_order) as (values
('core','هسته مرکزی کسب‌وکار',10),
('finance','مالی و خزانه',20),
('credit','اعتبار و تسهیلات',30),
('commerce','تجارت و پرداخت',40),
('communication','ارتباطات و مشتری',50),
('documents','اسناد و محتوا',60),
('organization','سازمان و عملیات',70),
('command','مرکز فرماندهی و پلتفرم',80)
),
upsert_groups as (
  insert into menu_items(title,path,sort_order,permission)
  select g.title,'/core/'||g.code,g.sort_order,null from groups g
  where not exists (select 1 from menu_items m where m.path='/core/'||g.code)
  returning id,path
),
all_groups as (
  select id,path from menu_items where path in (select '/core/'||code from groups)
),
modules(code,title,sort_order) as (values
('01-governance','حاکمیت و راهبری',1),
('02-identity','هویت و دسترسی',2),
('03-master-data','داده‌های پایه',3),
('04-customer-360','نمای ۳۶۰ مشتری',4),
('05-smart-calendar','تقویم هوشمند',5),
('06-business-rules','قواعد کسب‌وکار',6),
('07-sla','تعهدات خدمت',7),
('08-accounting-finance','مالی و حسابداری',8),
('09-treasury-bank','خزانه و بانک',9),
('10-wallet-ledger','کیف پول و دفترکل',10),
('11-credit-facilities','تسهیلات اعتباری',11),
('12-credit-scoring','امتیازدهی اعتباری',12),
('13-loans-contracts','قراردادهای وام',13),
('14-installments','اقساط',14),
('15-collections','وصول مطالبات',15),
('16-sales-trade','فروش و تجارت',16),
('17-marketplace','بازارگاه',17),
('18-delivery-logistics','تحویل و لجستیک',18),
('19-commission','کمیسیون',19),
('20-settlement','تسویه',20),
('21-payments','پرداخت‌ها',21),
('22-providers-integrations','تأمین‌کنندگان و اتصال‌ها',22),
('23-communications','ارتباطات',23),
('24-events-notifications','رویدادها و اعلان‌ها',24),
('25-crm','مدیریت ارتباط با مشتری',25),
('26-contact-center','مرکز تماس',26),
('27-tickets-support','تیکت و پشتیبانی',27),
('28-documents-office','اسناد و دبیرخانه',28),
('29-digital-binder','زونکن دیجیتال',29),
('30-web-domain','وب و دامنه',30),
('31-page-builder','صفحه‌ساز',31),
('32-form-builder','فرم‌ساز',32),
('33-content-management','مدیریت محتوا',33),
('34-negar-ai','نگار هوشمند',34),
('35-human-resources','منابع انسانی',35),
('36-projects-operations','پروژه و عملیات',36),
('37-reports-analytics','گزارش و تحلیل',37),
('38-command-center','مرکز فرماندهی',38),
('39-monitoring-events','پایش و رویدادها',39),
('40-audit-control','حسابرسی و کنترل',40),
('41-documentation','مستندسازی',41),
('42-api-integration','یکپارچه‌سازی API',42),
('43-infrastructure-data','زیرساخت و داده',43),
('44-mobile-app','اپلیکیشن همراه',44),
('45-quality-lifecycle','کیفیت و چرخه عمر',45)
),
mapped as (
  select m.code,m.title,m.sort_order,
    case
      when m.sort_order between 1 and 7 then '/core/core'
      when m.sort_order between 8 and 10 then '/core/finance'
      when m.sort_order between 11 and 15 then '/core/credit'
      when m.sort_order between 16 and 22 then '/core/commerce'
      when m.sort_order between 23 and 27 then '/core/communication'
      when m.sort_order between 28 and 34 then '/core/documents'
      when m.sort_order between 35 and 37 then '/core/organization'
      else '/core/command'
    end as parent_path
  from modules m
)
insert into menu_items(parent_id,title,path,sort_order,permission)
select g.id,x.title,'/modules/?code='||x.code,x.sort_order,'modules:'||x.code||':read'
from mapped x join all_groups g on g.path=x.parent_path
where not exists (select 1 from menu_items z where z.path='/modules/?code='||x.code);

insert into menu_items(title,path,sort_order,permission)
select * from (values
('مدیریت کاربران و دسترسی','/admin/users',900,'users:manage'),
('مدیریت قالب','/admin/templates',910,'templates:manage'),
('مدیریت منو','/admin/menus',920,'menus:manage'),
('مدیریت Frontend','/admin/frontend',930,'frontend:manage')
) v(title,path,sort_order,permission)
where not exists (select 1 from menu_items m where m.path=v.path);
