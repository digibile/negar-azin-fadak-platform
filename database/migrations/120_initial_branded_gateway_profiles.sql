-- 120: initial branded gateway profiles
-- Profiles are configuration-only. No real provider credentials are stored here.
insert into payment_gateway_profiles(
 tenant_id,code,title,brand_code,brand_title,gateway_type,provider_code,
 currency_scope,enabled,public_enabled,internal_only,verification_required,
 merchant_review_timeout_seconds,auto_reverse_on_timeout,config_reference,metadata
)
select t.id,'sookar-pay','Sookar Pay','sookar','سوکار','proprietary',null,
 '["IRR","IRT","USD","EUR","AED","TRY"]'::jsonb,false,true,false,true,900,true,null,
 '{"role":"branded_gateway","provider_credentials":"external_secret_reference"}'::jsonb
from tenants t
where not exists(select 1 from payment_gateway_profiles p where p.tenant_id=t.id and p.code='sookar-pay');

insert into payment_gateway_profiles(
 tenant_id,code,title,brand_code,brand_title,gateway_type,provider_code,
 currency_scope,enabled,public_enabled,internal_only,verification_required,
 merchant_review_timeout_seconds,auto_reverse_on_timeout,config_reference,metadata
)
select t.id,'vamcity-pay','VamCity Pay','vamcity','وام‌سیتی','proprietary',null,
 '["IRR","IRT","USD","EUR","AED","TRY"]'::jsonb,false,true,false,true,900,true,null,
 '{"role":"branded_gateway","provider_credentials":"external_secret_reference"}'::jsonb
from tenants t
where not exists(select 1 from payment_gateway_profiles p where p.tenant_id=t.id and p.code='vamcity-pay');
