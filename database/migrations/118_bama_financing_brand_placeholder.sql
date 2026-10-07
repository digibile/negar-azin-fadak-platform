-- 118: reserve a first-class BAMA financing brand without inventing commercial terms
insert into financing_brands(tenant_id,code,title,status,card_enabled,wallet_enabled,metadata)
select t.id,'bama','باما','draft',false,true,'{"commercialTermsRequired":true,"note":"شرایط واقعی، تأمین‌کننده، نرخ، مدت و زمان تأیید باید توسط مدیریت ثبت شود."}'::jsonb
from tenants t
where t.status='active'
on conflict(tenant_id,code) do update
set title=excluded.title,metadata=excluded.metadata,updated_at=now();
