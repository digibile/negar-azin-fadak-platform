-- Tenant isolation for the persistent 45-module record runtime.
alter table module_records add column if not exists tenant_id uuid references tenants(id) on delete cascade;
create index if not exists idx_module_records_tenant_lookup on module_records(tenant_id,module_id,status,updated_at desc);
-- Legacy rows without an owner are intentionally not auto-assigned to a tenant.
-- They remain inaccessible through tenant-scoped APIs until explicitly migrated.
