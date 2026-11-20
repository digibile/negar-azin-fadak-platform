-- Preserve the exact financial product and converted quantity used at supplier handover.
begin;

create unique index if not exists finance_products_tenant_id_uq
 on finance_products(tenant_id,id);

alter table marketplace_return_quarantine
 add column if not exists finance_product_id uuid,
 add column if not exists finance_quantity numeric(20,4);

do $migration$
begin
 if not exists(select 1 from pg_constraint where conname='marketplace_return_quarantine_finance_product_fk') then
  alter table marketplace_return_quarantine
   add constraint marketplace_return_quarantine_finance_product_fk
   foreign key(tenant_id,finance_product_id)
   references finance_products(tenant_id,id) on delete restrict;
 end if;
 if not exists(select 1 from pg_constraint where conname='marketplace_return_quarantine_finance_quantity_check') then
  alter table marketplace_return_quarantine
   add constraint marketplace_return_quarantine_finance_quantity_check
   check(finance_quantity is null or finance_quantity>0);
 end if;
end;
$migration$;

create index if not exists marketplace_return_quarantine_purchase_product_idx
 on marketplace_return_quarantine(tenant_id,source_purchase_id,finance_product_id,status);

commit;
