-- 163: connect marketplace seller settlement obligations and bank payments to the existing accounting subledger.
begin;

alter table sellers
 add column if not exists accounting_party_id uuid references accounting_parties(id) on delete set null;

insert into accounting_parties(tenant_id,party_code,party_type,title,status,metadata)
select s.tenant_id,'MKT-SELLER-'||replace(s.id::text,'-',''),'supplier',coalesce(nullif(trim(s.legal_name),''),s.display_name),'active',
       jsonb_build_object('sourceModule','marketplace','sourceType','seller','sourceId',s.id)
from sellers s
where not exists (
 select 1 from accounting_parties p
 where p.tenant_id=s.tenant_id and p.party_code='MKT-SELLER-'||replace(s.id::text,'-','')
)
on conflict(tenant_id,party_code) do nothing;

update sellers s
set accounting_party_id=p.id
from accounting_parties p
where p.tenant_id=s.tenant_id
 and p.party_code='MKT-SELLER-'||replace(s.id::text,'-','')
 and s.accounting_party_id is null;

create index if not exists ix_sellers_accounting_party
 on sellers(tenant_id,accounting_party_id);

alter table seller_settlements
 add column if not exists payable_id uuid references accounting_receivable_payables(id) on delete restrict;

alter table seller_settlements drop constraint if exists seller_settlements_status_check;
alter table seller_settlements add constraint seller_settlements_status_check
 check(status in ('pending','approved','partially_paid','paid','reversed'));

create unique index if not exists uq_seller_settlement_payable
 on seller_settlements(tenant_id,payable_id) where payable_id is not null;

-- Approved legacy settlements have not been paid yet; preserve their approval and
-- establish the corresponding supplier payable without fabricating a bank payment.
with legacy_payables as (
 insert into accounting_receivable_payables(
  tenant_id,party_id,direction,reference_no,issue_date,original_amount,currency,
  description,metadata
 )
 select ss.tenant_id,s.accounting_party_id,'payable',ss.settlement_no,
        ss.created_at::date,ss.net_amount,coalesce(nullif(upper(trim(ss.currency)),''),'IRR'),
        'بدهی تسویه فروشنده '||ss.settlement_no,
        jsonb_build_object('sourceModule','marketplace','sourceType','seller_settlement','sourceId',ss.id,'settlementNo',ss.settlement_no)
 from seller_settlements ss
 join sellers s on s.id=ss.seller_id and s.tenant_id=ss.tenant_id
 where ss.status='approved' and ss.payable_id is null
   and s.accounting_party_id is not null
   and ss.net_amount>0
 returning id,tenant_id,metadata
)
update seller_settlements ss
set payable_id=lp.id
from legacy_payables lp
where ss.tenant_id=lp.tenant_id
 and ss.id=(lp.metadata->>'sourceId')::uuid;

commit;
