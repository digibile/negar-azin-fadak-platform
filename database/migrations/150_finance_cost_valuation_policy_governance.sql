-- 150: governed, versioned valuation policy per tenant/product/financial warehouse.
-- Policies are explicit; no defaults or sample rows are inserted.
begin;

create unique index if not exists finance_products_tenant_id_uq
 on finance_products(tenant_id,id);
create unique index if not exists finance_warehouses_tenant_id_id_uq
 on finance_warehouses(tenant_id,id);

create table if not exists finance_cost_valuation_policies(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete restrict,
 product_id uuid not null,
 warehouse_id uuid not null,
 valuation_method text not null check(valuation_method in ('weighted_average','fifo','standard','actual')),
 status text not null default 'draft' check(status in ('draft','active','retired')),
 effective_from timestamptz not null,
 effective_to timestamptz,
 reason text not null check(length(trim(reason))>0),
 created_by uuid references users(id) on delete set null,
 approved_by uuid references users(id) on delete set null,
 activated_at timestamptz,
 retired_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 foreign key(tenant_id,product_id) references finance_products(tenant_id,id) on delete restrict,
 foreign key(tenant_id,warehouse_id) references finance_warehouses(tenant_id,id) on delete restrict,
 check(effective_to is null or effective_to>effective_from),
 check((status='draft' and approved_by is null and activated_at is null and retired_at is null)
    or (status='active' and approved_by is not null and activated_at is not null and retired_at is null)
    or (status='retired' and approved_by is not null and activated_at is not null and retired_at is not null))
);

create unique index if not exists finance_cost_valuation_policies_one_active_uq
 on finance_cost_valuation_policies(tenant_id,product_id,warehouse_id) where status='active';
create index if not exists finance_cost_valuation_policies_lookup_idx
 on finance_cost_valuation_policies(tenant_id,product_id,warehouse_id,status,effective_from desc);
create index if not exists finance_cost_valuation_policies_history_idx
 on finance_cost_valuation_policies(tenant_id,created_at desc);

create or replace function guard_finance_cost_valuation_policy()
returns trigger language plpgsql as $$
begin
 if tg_op='DELETE' then
  raise exception 'Valuation policy history is immutable; retire a policy instead of deleting it';
 end if;
 if tg_op='UPDATE' and (new.id is distinct from old.id or new.created_at is distinct from old.created_at) then
  raise exception 'Valuation policy identity and creation timestamp are immutable';
 end if;
 if tg_op='INSERT' then
  if new.status<>'draft' or new.approved_by is not null or new.activated_at is not null or new.retired_at is not null then
   raise exception 'New valuation policies must begin as drafts';
  end if;
  new.updated_at:=now();
  return new;
 end if;

 if old.status='draft' and new.status='draft' then
  if new.approved_by is not null or new.activated_at is not null or new.retired_at is not null then
   raise exception 'Draft policies cannot contain approval metadata';
  end if;
  new.updated_at:=now();
  return new;
 end if;

 if old.status='draft' and new.status='active' then
  if new.tenant_id<>old.tenant_id or new.product_id<>old.product_id
   or new.warehouse_id<>old.warehouse_id or new.valuation_method<>old.valuation_method
   or new.effective_from<>old.effective_from or new.effective_to is distinct from old.effective_to
   or new.reason<>old.reason or new.created_by is distinct from old.created_by
   or new.approved_by is null or new.activated_at is null or new.retired_at is not null then
   raise exception 'Activation may only approve an unchanged draft policy';
  end if;
  new.updated_at:=now();
  return new;
 end if;

 if old.status='active' and new.status='retired' then
  if new.tenant_id<>old.tenant_id or new.product_id<>old.product_id
   or new.warehouse_id<>old.warehouse_id or new.valuation_method<>old.valuation_method
   or new.effective_from<>old.effective_from or new.effective_to is distinct from old.effective_to
   or new.reason<>old.reason or new.created_by is distinct from old.created_by
   or new.approved_by is distinct from old.approved_by
   or new.activated_at is distinct from old.activated_at or new.retired_at is null then
   raise exception 'Retirement may only close an active policy without rewriting its history';
  end if;
  new.updated_at:=now();
  return new;
 end if;

 raise exception 'Valuation policy transition is not allowed';
end;
$$;

drop trigger if exists finance_cost_valuation_policies_guard on finance_cost_valuation_policies;
create trigger finance_cost_valuation_policies_guard
before insert or update or delete on finance_cost_valuation_policies
for each row execute function guard_finance_cost_valuation_policy();

-- Extend the immutable allocation guard: an allocation is valid only when its
-- valuation method matches the currently effective approved policy for the same
-- tenant, product and financial warehouse.
create or replace function validate_finance_cost_layer_allocation()
returns trigger language plpgsql as $$
declare
 v_layer record;
 v_issue record;
 v_layer_allocated numeric(20,4);
 v_issue_allocated numeric(20,4);
 v_existing_method text;
 v_existing_method_count integer;
 v_policy_method text;
begin
 if tg_op <> 'INSERT' then
  raise exception 'Cost layer allocations are immutable; use a separately governed reversal workflow';
 end if;

 perform pg_advisory_xact_lock(hashtextextended(new.tenant_id::text||':'||new.product_id::text||':'||new.warehouse_id::text,0));

 select cl.id,cl.tenant_id,cl.product_id,cl.method,cl.quantity,cl.unit_cost,
  source_line.product_id source_product_id,
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
 if v_layer.product_id<>new.product_id or v_layer.source_product_id<>v_layer.product_id
  or v_layer.method<>new.valuation_method then
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

 select p.valuation_method into v_policy_method
 from finance_cost_valuation_policies p
 where p.tenant_id=new.tenant_id and p.product_id=new.product_id
  and p.warehouse_id=new.warehouse_id and p.status='active'
  and p.effective_from<=now() and (p.effective_to is null or p.effective_to>now())
 for share;
 if not found then
  raise exception 'No active valuation policy exists for this product and warehouse';
 end if;
 if v_policy_method<>new.valuation_method then
  raise exception 'Allocation valuation method does not match the active policy';
 end if;

 select count(distinct a.valuation_method)::int,min(a.valuation_method)
 into v_existing_method_count,v_existing_method
 from finance_cost_layer_allocations a
 where a.tenant_id=new.tenant_id and a.product_id=new.product_id and a.warehouse_id=new.warehouse_id;
 if v_existing_method_count>1 then
  raise exception 'Existing allocations contain mixed valuation methods for this product and warehouse';
 end if;
 if v_existing_method is not null and v_existing_method<>new.valuation_method then
  raise exception 'Valuation method must remain consistent for this product and warehouse';
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

commit;
