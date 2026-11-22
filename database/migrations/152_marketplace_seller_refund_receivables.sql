-- 152: controlled seller refund receivable reclassification.
-- Existing sellers remain unmapped; no historical balances or journals are rewritten.
begin;

alter table sellers add column if not exists refund_receivable_account_id uuid;
create unique index if not exists uq_ledger_accounts_tenant_id_id
 on ledger_accounts(tenant_id,id);

do $$
begin
 if not exists(select 1 from pg_constraint where conname='sellers_refund_receivable_account_tenant_fk') then
  alter table sellers add constraint sellers_refund_receivable_account_tenant_fk
   foreign key(tenant_id,refund_receivable_account_id)
   references ledger_accounts(tenant_id,id) on delete restrict;
 end if;
end $$;

alter table accounting_receivable_payables
 add column if not exists source_module text,
 add column if not exists source_document_id uuid;

create unique index if not exists uq_accounting_rp_source
 on accounting_receivable_payables(tenant_id,source_module,source_document_id)
 where source_module is not null and source_document_id is not null;

create index if not exists idx_accounting_rp_party_direction_status
 on accounting_receivable_payables(tenant_id,party_id,direction,status,due_date);

do $$
begin
 if not exists(select 1 from pg_constraint where conname='accounting_rp_party_tenant_fk') then
  alter table accounting_receivable_payables add constraint accounting_rp_party_tenant_fk
   foreign key(tenant_id,party_id)
   references accounting_parties(tenant_id,id) on delete restrict;
 end if;
end $$;

commit;
