-- 149: immutable, tenant-scoped cost-layer allocation ledger for posted financial issue lines.
-- This migration creates the controlled allocation foundation only. It does not select
-- FIFO/weighted-average policy, post inventory documents, or create accounting journals.
begin;

create unique index if not exists finance_cost_layers_tenant_id_product_uq
 on finance_cost_layers(tenant_id,id,product_id);

create table if not exists finance_cost_layer_allocations(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete restrict,
 product_id uuid not null,
 warehouse_id uuid not null,
 cost_layer_id uuid not null,
 issue_document_line_id uuid not null references finance_inventory_lines(id) on delete restrict,
 valuation_method text not null check(valuation_method in ('weighted_average','fifo','standard','actual')),
 quantity numeric(20,4) not null check(quantity>0),
 unit_cost numeric(20,4) not null check(unit_cost>=0),
 total_cost numeric(24,4) not null check(total_cost>=0),
 idempotency_key text not null check(length(trim(idempotency_key))>0),
 created_by uuid references users(id) on delete set null,
 created_at timestamptz not null default now(),
 unique(tenant_id,issue_document_line_id,cost_layer_id),
 unique(tenant_id,idempotency_key),
 foreign key(tenant_id,cost_layer_id,product_id)
  references finance_cost_layers(tenant_id,id,product_id) on delete restrict,
 foreign key(tenant_id,warehouse_id)
  references finance_warehouses(tenant_id,id) on delete restrict
);

create index if not exists finance_cost_layer_allocations_layer_idx
 on finance_cost_layer_allocations(tenant_id,cost_layer_id,created_at);
create index if not exists finance_cost_layer_allocations_issue_line_idx
 on finance_cost_layer_allocations(tenant_id,issue_document_line_id);
create index if not exists finance_cost_layer_allocations_product_warehouse_idx
 on finance_cost_layer_allocations(tenant_id,product_id,warehouse_id,created_at);

create or replace function validate_finance_cost_layer_allocation()
returns trigger language plpgsql as $$
declare
 v_layer record;
 v_issue record;
 v_layer_allocated numeric(20,4);
 v_issue_allocated numeric(20,4);
begin
 if tg_op <> 'INSERT' then
  raise exception 'Cost layer allocations are immutable; use a separately governed reversal workflow';
 end if;

 select cl.id,cl.tenant_id,cl.product_id,cl.method,cl.quantity,cl.unit_cost,
  source_doc.warehouse_id source_warehouse_id,
  source_doc.status source_document_status,source_doc.document_type source_document_type
 into v_layer
 from finance_cost_layers cl
 join finance_inventory_lines source_line on source_line.id=cl.inventory_document_line_id
 join finance_inventory_documents source_doc on source_doc.id=source_line.document_id
  and source_doc.tenant_id=cl.tenant_id
 where cl.tenant_id=new.tenant_id and cl.id=new.cost_layer_id
 for update of cl;

 if not found then
  raise exception 'Cost layer does not exist or has no source inventory document';
 end if;
 if v_layer.product_id<>new.product_id or v_layer.method<>new.valuation_method then
  raise exception 'Cost layer product or valuation method mismatch';
 end if;
 if v_layer.source_document_status<>'posted'
  or v_layer.source_document_type not in ('receipt','return_receipt','adjustment') then
  raise exception 'Cost layer source must be a posted inbound financial inventory document';
 end if;

 select issue_line.id,issue_line.product_id,issue_line.quantity,
  issue_doc.warehouse_id,issue_doc.status,issue_doc.document_type
 into v_issue
 from finance_inventory_lines issue_line
 join finance_inventory_documents issue_doc on issue_doc.id=issue_line.document_id
 where issue_line.id=new.issue_document_line_id
  and issue_doc.tenant_id=new.tenant_id
 for update of issue_line;

 if not found then
  raise exception 'Issue document line does not exist in this tenant';
 end if;
 if v_issue.product_id<>new.product_id
  or v_issue.warehouse_id<>new.warehouse_id
  or v_issue.warehouse_id<>v_layer.source_warehouse_id then
  raise exception 'Issue line, cost layer, product and warehouse must match';
 end if;
 if v_issue.status<>'posted' or v_issue.document_type<>'issue' then
  raise exception 'Allocations are allowed only for posted financial issue documents';
 end if;

 if new.unit_cost<>v_layer.unit_cost
  or new.total_cost<>round(new.quantity*v_layer.unit_cost,4) then
  raise exception 'Allocation cost must match the source cost layer';
 end if;

 select coalesce(sum(a.quantity),0) into v_layer_allocated
 from finance_cost_layer_allocations a
 where a.tenant_id=new.tenant_id and a.cost_layer_id=new.cost_layer_id;
 if v_layer_allocated+new.quantity>v_layer.quantity then
  raise exception 'Allocation exceeds remaining cost layer quantity';
 end if;

 select coalesce(sum(a.quantity),0) into v_issue_allocated
 from finance_cost_layer_allocations a
 where a.tenant_id=new.tenant_id and a.issue_document_line_id=new.issue_document_line_id;
 if v_issue_allocated+new.quantity>v_issue.quantity then
  raise exception 'Allocation exceeds posted issue line quantity';
 end if;

 return new;
end;
$$;

drop trigger if exists finance_cost_layer_allocations_validate on finance_cost_layer_allocations;
create trigger finance_cost_layer_allocations_validate
before insert or update or delete on finance_cost_layer_allocations
for each row execute function validate_finance_cost_layer_allocation();

commit;
