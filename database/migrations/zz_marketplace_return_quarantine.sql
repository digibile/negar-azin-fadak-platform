-- Track non-restockable returned goods outside saleable inventory.
begin;

create unique index if not exists inventory_warehouses_tenant_id_uq
 on inventory_warehouses(tenant_id,id);

create table if not exists marketplace_return_quarantine(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null,
 return_request_id uuid not null,
 warehouse_id uuid not null,
 quarantine_quantity numeric(20,3) not null check(quarantine_quantity>0),
 status text not null default 'quarantined' check(status in ('quarantined','supplier_handover','disposed')),
 reason text,
 disposition_notes text,
 supplier_name text,
 supplier_reference text,
 created_by uuid,
 resolved_by uuid,
 created_at timestamptz not null default now(),
 resolved_at timestamptz,
 unique(tenant_id,return_request_id),
 foreign key(tenant_id,return_request_id)
   references marketplace_return_requests(tenant_id,id) on delete restrict,
 foreign key(tenant_id,warehouse_id)
   references inventory_warehouses(tenant_id,id) on delete restrict
);

create index if not exists marketplace_return_quarantine_tenant_status_idx
 on marketplace_return_quarantine(tenant_id,status,created_at desc);

commit;
