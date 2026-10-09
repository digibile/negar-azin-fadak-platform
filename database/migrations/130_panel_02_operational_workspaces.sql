begin;

alter table module_field_definitions
  add column if not exists record_type text not null default 'default';

-- Replace generic placeholder fields with purpose-built schemas for the three
-- operational modules exposed by panel 02. Each submenu has its own record type.
delete from module_field_definitions d
using platform_modules m
where d.module_id=m.id
  and m.code in ('39-human-resources','30-projects-cost-centers','24-production');

insert into module_field_definitions(module_id,field_key,title,field_type,required,sort_order,options,record_type)
select m.id,f.field_key,f.title,f.field_type,f.required,f.sort_order,f.options::jsonb,f.record_type
from (values
('employees','personnel_no','کد پرسنلی','text',true,10,'{}','employees'),
('employees','full_name','نام و نام خانوادگی','text',true,20,'{}','employees'),
('employees','department','واحد سازمانی','text',true,30,'{}','employees'),
('employees','job_title','عنوان شغلی','text',false,40,'{}','employees'),
('employees','employment_type','نوع همکاری','select',true,50,'{"options":["تمام‌وقت","پاره‌وقت","قراردادی","پیمانکاری"]}','employees'),
('employees','hire_date','تاریخ شروع همکاری','date',false,60,'{}','employees'),
('employees','manager_name','مدیر مستقیم','text',false,70,'{}','employees'),
('employees','work_email','ایمیل سازمانی','text',false,80,'{}','employees'),

('payroll','payroll_period','دوره حقوق','text',true,10,'{}','payroll'),
('payroll','personnel_no','کد پرسنلی','text',true,20,'{}','payroll'),
('payroll','employee_name','نام کارمند','text',true,30,'{}','payroll'),
('payroll','base_salary','حقوق پایه','number',true,40,'{}','payroll'),
('payroll','allowances','مزایا','number',false,50,'{}','payroll'),
('payroll','deductions','کسورات','number',false,60,'{}','payroll'),
('payroll','net_salary','خالص پرداختی','number',true,70,'{}','payroll'),
('payroll','payment_date','تاریخ پرداخت','date',false,80,'{}','payroll'),
('payroll','payroll_status','وضعیت پرداخت','select',true,90,'{"options":["پیش‌نویس","در انتظار تأیید","تأییدشده","پرداخت‌شده","متوقف"]}','payroll'),

('attendance','personnel_no','کد پرسنلی','text',true,10,'{}','attendance'),
('attendance','employee_name','نام کارمند','text',true,20,'{}','attendance'),
('attendance','attendance_date','تاریخ حضور','date',true,30,'{}','attendance'),
('attendance','shift_name','شیفت کاری','select',true,40,'{"options":["صبح","عصر","شب","شناور"]}','attendance'),
('attendance','check_in','ساعت ورود','text',false,50,'{}','attendance'),
('attendance','check_out','ساعت خروج','text',false,60,'{}','attendance'),
('attendance','overtime_minutes','اضافه‌کاری (دقیقه)','number',false,70,'{}','attendance'),
('attendance','attendance_status','وضعیت حضور','select',true,80,'{"options":["حاضر","غایب","مرخصی","مأموریت","دورکاری"]}','attendance'),

('projects','project_no','کد پروژه','text',true,10,'{}','projects'),
('projects','name','عنوان پروژه','text',true,20,'{}','projects'),
('projects','sponsor','کارفرما / حامی','text',false,30,'{}','projects'),
('projects','owner','مسئول پروژه','text',true,40,'{}','projects'),
('projects','start_date','تاریخ شروع','date',false,50,'{}','projects'),
('projects','due_date','تاریخ پایان برنامه‌ای','date',false,60,'{}','projects'),
('projects','budget','بودجه مصوب','number',false,70,'{}','projects'),
('projects','progress','پیشرفت (درصد)','number',false,80,'{}','projects'),
('projects','cost_center','مرکز هزینه','text',false,90,'{}','projects'),
('projects','project_status','وضعیت پروژه','select',true,100,'{"options":["پیشنهادی","برنامه‌ریزی","در حال اجرا","متوقف","تکمیل‌شده","لغوشده"]}','projects'),

('production','work_order_no','شماره دستور تولید','text',true,10,'{}','production'),
('production','product_code','کد محصول','text',true,20,'{}','production'),
('production','product_name','نام محصول','text',true,30,'{}','production'),
('production','production_line','خط تولید','text',false,40,'{}','production'),
('production','planned_quantity','مقدار برنامه‌ریزی‌شده','number',true,50,'{}','production'),
('production','produced_quantity','مقدار تولیدشده','number',false,60,'{}','production'),
('production','start_date','شروع تولید','date',false,70,'{}','production'),
('production','due_date','موعد تکمیل','date',false,80,'{}','production'),
('production','quality_status','وضعیت کنترل کیفیت','select',true,90,'{"options":["در انتظار بررسی","تأیید","رد","نیازمند اصلاح"]}','production'),

('maintenance','asset_code','کد دارایی / دستگاه','text',true,10,'{}','maintenance'),
('maintenance','asset_name','نام دستگاه','text',true,20,'{}','maintenance'),
('maintenance','maintenance_type','نوع تعمیر و نگهداری','select',true,30,'{"options":["پیشگیرانه","اصلاحی","بازرسی","اضطراری"]}','maintenance'),
('maintenance','scheduled_date','تاریخ برنامه‌ریزی','date',true,40,'{}','maintenance'),
('maintenance','technician','مسئول فنی','text',false,50,'{}','maintenance'),
('maintenance','downtime_hours','مدت توقف (ساعت)','number',false,60,'{}','maintenance'),
('maintenance','maintenance_cost','هزینه تعمیر','number',false,70,'{}','maintenance'),
('maintenance','maintenance_status','وضعیت کار','select',true,80,'{"options":["برنامه‌ریزی‌شده","در حال انجام","در انتظار قطعه","تکمیل‌شده","لغوشده"]}','maintenance')
) as f(module_code,field_key,title,field_type,required,sort_order,options,record_type)
join platform_modules m on m.code=f.module_code
on conflict(module_id,field_key) do update set
  title=excluded.title,
  field_type=excluded.field_type,
  required=excluded.required,
  sort_order=excluded.sort_order,
  options=excluded.options,
  record_type=excluded.record_type;

create index if not exists idx_module_field_definitions_module_record_type
  on module_field_definitions(module_id,record_type,sort_order);

commit;
