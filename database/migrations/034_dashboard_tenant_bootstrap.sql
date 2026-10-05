-- Bootstrap a real default tenant for the authenticated administrative surface.
-- This is platform configuration, not sample transaction data.
insert into tenants(code,name,status)
values('naf-iran','پلتفرم بیزینس نگار آذین فدک ایران','active')
on conflict(code) do update set name=excluded.name,status='active',updated_at=now();

insert into user_tenants(user_id,tenant_id,is_default)
select u.id,t.id,true
from users u cross join tenants t
where u.role='admin' and t.code='naf-iran'
on conflict(user_id,tenant_id) do update set is_default=true;
