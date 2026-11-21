-- 164: map treasury statement accounts to the canonical accounting bank accounts.
begin;

alter table treasury_bank_accounts
 add column if not exists accounting_bank_account_id uuid
 references accounting_bank_accounts(id) on delete set null;

create unique index if not exists uq_treasury_bank_account_accounting_link
 on treasury_bank_accounts(tenant_id,accounting_bank_account_id)
 where accounting_bank_account_id is not null;

create index if not exists ix_treasury_bank_account_accounting_link
 on treasury_bank_accounts(tenant_id,accounting_bank_account_id)
 where accounting_bank_account_id is not null;

-- Auto-link only exact, unambiguous matches with the same currency.
-- Ambiguous or unmatched accounts remain unlinked for an explicit review.
with candidates as (
 select tb.id treasury_id, min(ab.id::text)::uuid accounting_id
 from treasury_bank_accounts tb
 join accounting_bank_accounts ab
   on ab.tenant_id=tb.tenant_id
  and upper(trim(ab.currency))=upper(trim(tb.currency))
  and (
    (nullif(trim(tb.account_number),'') is not null and nullif(trim(ab.account_no),'')=trim(tb.account_number))
    or
    (nullif(regexp_replace(upper(coalesce(tb.iban,'')),'[^A-Z0-9]','','g'),'') is not null
      and regexp_replace(upper(coalesce(ab.iban,'')),'[^A-Z0-9]','','g')=regexp_replace(upper(tb.iban),'[^A-Z0-9]','','g'))
  )
 where tb.accounting_bank_account_id is null
 group by tb.id
 having count(distinct ab.id)=1
)
update treasury_bank_accounts tb
set accounting_bank_account_id=c.accounting_id,updated_at=now()
from candidates c
where tb.id=c.treasury_id
  and not exists(
    select 1 from treasury_bank_accounts other
    where other.tenant_id=tb.tenant_id
      and other.accounting_bank_account_id=c.accounting_id
      and other.id<>tb.id
  );

commit;
