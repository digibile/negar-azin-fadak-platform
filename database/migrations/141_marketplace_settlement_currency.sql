-- Preserve currency boundaries in seller settlements and their accounting entries.
alter table seller_settlements add column if not exists currency text not null default 'IRR';
alter table ledger_entries add column if not exists currency text not null default 'IRR';

with settlement_currency as (
 select si.settlement_id,
        count(distinct coalesce(nullif(upper(trim(o.currency)),''),'IRR')) as currency_count,
        min(coalesce(nullif(upper(trim(o.currency)),''),'IRR')) as single_currency
 from seller_settlement_items si
 join marketplace_orders o on o.id=si.order_id
 group by si.settlement_id
)
update seller_settlements ss
set currency=case when sc.currency_count>1 then 'MIXED' else sc.single_currency end
from settlement_currency sc
where ss.id=sc.settlement_id;

update ledger_entries e
set currency=coalesce(nullif(upper(trim(o.currency)),''),'IRR')
from marketplace_payments p
join marketplace_orders o on o.id=p.order_id
where e.source_type='marketplace_payment' and e.source_id=p.id;

update ledger_entries e
set currency=coalesce(nullif(upper(trim(o.currency)),''),'IRR')
from marketplace_refunds r
join marketplace_orders o on o.id=r.order_id
where e.source_type='marketplace_refund' and e.source_id=r.id;

update ledger_entries e
set currency=coalesce(nullif(upper(trim(ss.currency)),''),'IRR')
from seller_settlements ss
where e.source_type='seller_settlement' and e.source_id=ss.id;

alter table seller_settlements drop constraint if exists uq_seller_settlement_period;
create unique index if not exists uq_seller_settlement_period_currency
 on seller_settlements(tenant_id,seller_id,period_start,period_end,currency);
