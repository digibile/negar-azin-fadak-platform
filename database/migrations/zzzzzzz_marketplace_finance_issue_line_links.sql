-- Explicit trace from a consumed marketplace reservation to one posted financial issue line.
-- This records provenance only; it never changes stock, cost layers or accounting entries.
begin;

create unique index if not exists marketplace_inventory_reservations_tenant_id_uq
 on marketplace_inventory_reservations(tenant_id,id);
create unique index if not exists finance_inventory_documents_tenant_id_id_uq
 on finance_inventory_documents(tenant_id,id);
create unique index if not exists finance_inventory_lines_id_document_id_uq
 on finance_inventory_lines(id,document_id);

create table if not exists marketplace_finance_issue_line_links(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete restrict,
 reservation_id uuid not null,
 issue_document_id uuid not null,
 issue_document_line_id uuid not null,
 linked_quantity numeric(20,4) not null check(linked_quantity>0),
 inventory_to_finance_factor numeric(20,6) not null check(inventory_to_finance_factor>0),
 created_by uuid references users(id) on delete set null,
 created_at timestamptz not null default now(),
 unique(tenant_id,reservation_id),
 unique(tenant_id,issue_document_line_id),
 foreign key(tenant_id,reservation_id)
  references marketplace_inventory_reservations(tenant_id,id) on delete restrict,
 foreign key(tenant_id,issue_document_id)
  references finance_inventory_documents(tenant_id,id) on delete restrict,
 foreign key(issue_document_line_id,issue_document_id)
  references finance_inventory_lines(id,document_id) on delete restrict
);
create index if not exists marketplace_finance_issue_line_links_document_idx
 on marketplace_finance_issue_line_links(tenant_id,issue_document_id);

create or replace function validate_marketplace_finance_issue_line_link()
returns trigger language plpgsql as $$
declare
 v record;
 v_expected numeric(20,4);
begin
 if tg_op<>'INSERT' then
  raise exception 'Marketplace financial issue line links are immutable; use a governed reversal workflow';
 end if;

 select r.id reservation_id,r.status reservation_status,r.quantity reservation_quantity,
  r.marketplace_order_id,r.supply_order_id,r.marketplace_product_id,r.inventory_product_id,
  r.warehouse_id operational_warehouse_id,
  o.order_no,
  mil.product_id mapped_marketplace_product_id,mil.inventory_product_id mapped_inventory_product_id,
  fpl.finance_product_id,fpl.quantity_factor,
  fwl.finance_warehouse_id,
  so.marketplace_order_id supply_marketplace_order_id,
  il.id issue_line_id,il.product_id issue_finance_product_id,il.quantity issue_quantity,
  d.id issue_document_id,d.tenant_id issue_tenant_id,d.warehouse_id issue_finance_warehouse_id,
  d.document_type,d.status issue_document_status,d.source_type,d.source_id
 into v
 from marketplace_inventory_reservations r
 join marketplace_orders o on o.id=r.marketplace_order_id and o.tenant_id=r.tenant_id
 join logistics_supply_orders so on so.id=r.supply_order_id and so.tenant_id=r.tenant_id
  and so.marketplace_order_id=r.marketplace_order_id
 join marketplace_inventory_product_links mil on mil.tenant_id=r.tenant_id
  and mil.product_id=r.marketplace_product_id and mil.inventory_product_id=r.inventory_product_id
 join marketplace_finance_product_links fpl on fpl.tenant_id=r.tenant_id
  and fpl.inventory_product_id=r.inventory_product_id and fpl.status='active'
 join marketplace_finance_warehouse_links fwl on fwl.tenant_id=r.tenant_id
  and fwl.inventory_warehouse_id=r.warehouse_id and fwl.status='active'
 join finance_inventory_lines il on il.id=new.issue_document_line_id
 join finance_inventory_documents d on d.id=il.document_id and d.tenant_id=r.tenant_id
 where r.tenant_id=new.tenant_id and r.id=new.reservation_id
  and d.id=new.issue_document_id
 for update of r,o,so,mil,fpl,fwl,il,d;

 if not found then
  raise exception 'Reservation, supply order, product/warehouse mapping or financial issue line is missing in this tenant';
 end if;
 if v.reservation_status<>'consumed' then
  raise exception 'Only consumed marketplace inventory reservations can be linked';
 end if;
 if v.document_type<>'issue' or v.issue_document_status<>'posted' then
  raise exception 'Financial issue document must be posted';
 end if;
 if v.source_type<>'marketplace_order' or v.source_id<>v.marketplace_order_id then
  raise exception 'Financial issue document source must explicitly identify the same marketplace order';
 end if;
 if v.finance_warehouse_id<>v.issue_finance_warehouse_id then
  raise exception 'Financial issue warehouse does not match the active operational warehouse mapping';
 end if;
 if v.finance_product_id<>v.issue_finance_product_id then
  raise exception 'Financial issue line product does not match the active inventory-to-finance product mapping';
 end if;

 v_expected:=round(v.reservation_quantity*v.quantity_factor,4);
 if abs(v.issue_quantity-v_expected)>0.0001 then
  raise exception 'Financial issue line quantity does not exactly match the consumed reservation after unit conversion';
 end if;

 new.linked_quantity:=v_expected;
 new.inventory_to_finance_factor:=v.quantity_factor;
 return new;
end;
$$;

drop trigger if exists marketplace_finance_issue_line_links_validate on marketplace_finance_issue_line_links;
create trigger marketplace_finance_issue_line_links_validate
before insert or update or delete on marketplace_finance_issue_line_links
for each row execute function validate_marketplace_finance_issue_line_link();

commit;
