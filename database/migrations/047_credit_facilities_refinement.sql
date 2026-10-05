-- Menu 11: credit facilities operational refinement.
-- Uses the existing tenant-safe module runtime and PostgreSQL record storage.
-- No demo records are inserted.

insert into module_field_definitions(module_id,field_key,title,field_type,required,sort_order,options)
select m.id,v.field_key,v.title,v.field_type,v.required,v.sort_order,v.options::jsonb
from platform_modules m
cross join (values
 ('credit-code','کد محصول اعتباری','text',true,10,'{}'),
 ('credit-title','عنوان محصول اعتباری','text',true,20,'{}'),
 ('credit-type','نوع اعتبار','select',true,30,'{"options":["خرید","نقدی","اقساطی","اعتبار فروشگاهی","سایر"]}'),
 ('credit-limit','سقف اعتبار','number',true,40,'{}'),
 ('credit-rate','نرخ/کارمزد','number',false,50,'{}'),
 ('credit-term','مدت اعتبار (ماه)','number',false,60,'{}'),
 ('credit-status','وضعیت محصول','select',true,70,'{"options":["پیش‌نویس","فعال","متوقف","بسته"]}'),
 ('credit-notes','ضوابط و توضیحات','textarea',false,80,'{}')
) v(field_key,title,field_type,required,sort_order,options)
where m.id=11
on conflict(module_id,field_key) do update set
 title=excluded.title,
 field_type=excluded.field_type,
 required=excluded.required,
 sort_order=excluded.sort_order,
 options=excluded.options;

insert into module_actions(module_id,action_code,title,permission)
values
 (11,'read','مشاهده','modules:11-credit-facilities:read'),
 (11,'write','ثبت و ویرایش','modules:11-credit-facilities:write'),
 (11,'delete','حذف','modules:11-credit-facilities:delete')
on conflict(module_id,action_code) do update set title=excluded.title,permission=excluded.permission;

update platform_modules
set title='محصولات اعتباری',is_active=true
where id=11;
