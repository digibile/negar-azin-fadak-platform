-- Seller ledger party-dimension preflight.
-- READ ONLY: run before any historical party_id backfill.
-- Reports source ownership, seller mapping readiness and ambiguous relationships.

with source_owner as (
 select le.tenant_id,le.id ledger_entry_id,le.source_type,le.source_id,le.status ledger_status,
        'marketplace_payment'::text source_kind,
        mp.id source_record_id,o.id order_id,o.seller_id
 from ledger_entries le
 left join marketplace_payments mp
   on le.source_type='marketplace_payment' and mp.id=le.source_id and mp.tenant_id=le.tenant_id
 left join marketplace_orders o on o.id=mp.order_id and o.tenant_id=mp.tenant_id
 where le.source_type='marketplace_payment'

 union all

 select le.tenant_id,le.id,le.source_type,le.source_id,le.status,
        'marketplace_refund'::text,
        mr.id,o.id,o.seller_id
 from ledger_entries le
 left join marketplace_refunds mr
   on le.source_type='marketplace_refund' and mr.id=le.source_id and mr.tenant_id=le.tenant_id
 left join marketplace_orders o on o.id=mr.order_id and o.tenant_id=mr.tenant_id
 where le.source_type='marketplace_refund'

 union all

 select le.tenant_id,le.id,le.source_type,le.source_id,le.status,
        'seller_settlement'::text,
        ss.id,null::uuid,ss.seller_id
 from ledger_entries le
 left join seller_settlements ss
   on le.source_type='seller_settlement' and ss.id=le.source_id and ss.tenant_id=le.tenant_id
 where le.source_type='seller_settlement'
),
line_counts as (
 select tenant_id,ledger_entry_id,count(*)::int line_count,
        count(*) filter(where party_id is not null)::int already_dimensioned_count
 from ledger_lines
 group by tenant_id,ledger_entry_id
)
select so.tenant_id,so.source_type,so.source_id,so.ledger_entry_id,so.ledger_status,
       so.source_record_id,so.order_id,so.seller_id,
       s.accounting_party_id,ap.party_type,ap.status party_status,
       coalesce(lc.line_count,0) line_count,
       coalesce(lc.already_dimensioned_count,0) already_dimensioned_count,
       case
        when so.source_record_id is null then 'source_record_missing_or_tenant_mismatch'
        when so.seller_id is null then 'seller_relationship_missing_or_ambiguous'
        when s.id is null then 'seller_missing_or_tenant_mismatch'
        when s.accounting_party_id is null then 'seller_party_mapping_missing'
        when ap.id is null then 'party_missing_or_tenant_mismatch'
        when ap.status<>'active' or ap.party_type<>'supplier' then 'party_inactive_or_wrong_type'
        when coalesce(lc.line_count,0)=0 then 'ledger_lines_missing'
        else 'candidate_requires_account_line_classification'
       end readiness_status
from source_owner so
left join sellers s on s.id=so.seller_id and s.tenant_id=so.tenant_id
left join accounting_parties ap
 on ap.id=s.accounting_party_id and ap.tenant_id=s.tenant_id
left join line_counts lc on lc.tenant_id=so.tenant_id and lc.ledger_entry_id=so.ledger_entry_id
order by so.tenant_id,so.source_type,so.source_id;

-- Aggregate counts by tenant and source type, including duplicate source references.
select le.tenant_id,le.source_type,count(*)::int ledger_entry_count,
       count(distinct le.source_id)::int distinct_source_count,
       count(*) filter(where le.source_id is null)::int null_source_count,
       count(*) filter(where dup.source_id is not null)::int duplicate_source_reference_count
from ledger_entries le
left join (
 select tenant_id,source_type,source_id
 from ledger_entries
 where source_id is not null
 group by tenant_id,source_type,source_id
 having count(*)>1
) dup on dup.tenant_id=le.tenant_id and dup.source_type=le.source_type and dup.source_id=le.source_id
where le.source_type in ('marketplace_payment','marketplace_refund','seller_settlement')
group by le.tenant_id,le.source_type
order by le.tenant_id,le.source_type;

-- Line-level candidates only. This does not assume every line in an entry belongs
-- to the seller: account role classification must be reviewed before backfill.
select le.tenant_id,le.source_type,le.source_id,le.id ledger_entry_id,
       ll.id ledger_line_id,ll.account_id,la.code account_code,la.account_type,
       ll.debit,ll.credit,ll.party_id
from ledger_entries le
join ledger_lines ll on ll.entry_id=le.id
left join ledger_accounts la on la.id=ll.account_id and la.tenant_id=le.tenant_id
where le.source_type in ('marketplace_payment','marketplace_refund','seller_settlement')
order by le.tenant_id,le.source_type,le.source_id,ll.id;
