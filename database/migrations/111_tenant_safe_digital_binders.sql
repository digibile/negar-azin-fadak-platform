-- 111: tenant-safe digital binders
alter table digital_binders add column if not exists tenant_id uuid references tenants(id) on delete cascade;
create index if not exists idx_digital_binders_tenant on digital_binders(tenant_id,updated_at desc);

update digital_binders set tenant_id=(select id from tenants where status='active' order by created_at limit 1) where tenant_id is null and exists(select 1 from tenants where status='active');
