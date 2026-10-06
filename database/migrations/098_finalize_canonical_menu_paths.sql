-- Finalize canonical navigation paths after all legacy and canonical menu migrations.
-- Preserve every legacy row while ensuring each canonical module route is unique.
begin;

with canonical(code) as (
  values
    ('governance'),('identity'),('master-data'),('customer-360'),('smart-calendar'),
    ('business-rules'),('sla'),('accounting-finance'),('treasury-bank'),('wallet-ledger'),
    ('credit-facilities'),('12-credit-applications'),('13-loan-contracts'),
    ('14-installment-schedules'),('15-installment-collections'),('16-collateral-guarantees'),
    ('17-digital-binder'),('18-identity-verification'),('19-credit-scoring'),
    ('20-credit-decisions'),('21-credit-committee'),('22-credit-disbursement'),
    ('23-loan-settlement'),('24-loan-ledger'),('25-loan-refunds'),('26-loan-closure'),
    ('27-loan-delinquency'),('28-collection-workflow'),('29-loan-restructuring'),
    ('30-loan-relief'),('31-loan-legal-cases'),('32-form-builder'),('33-menu-builder'),
    ('34-page-builder'),('35-page-block-editor'),('36-page-templates'),
    ('37-frontend-sections'),('38-navigation-rules'),('39-frontend-notifications'),
    ('40-notification-templates'),('41-documentation'),('42-document-approvals'),
    ('43-document-versions'),('44-document-search'),('45-document-retention'),
    ('46-document-distribution'),('47-document-access-log'),('48-document-audit-reports'),
    ('49-document-compliance'),('50-document-governance')
),
ranked as (
  select m.id,m.menu_key,m.path,
         row_number() over (
           partition by m.path
           order by
             case when m.menu_key in (select code from canonical) then 0 else 1 end,
             m.id
         ) as rn
  from menu_items m
  where m.is_active=true
    and m.path in (select '/modules/?code='||code from canonical)
),
legacy as (
  select id,
         path || '&legacy=' ||
         regexp_replace(coalesce(menu_key,'legacy'),'[^A-Za-z0-9_-]+','_','g') as new_path
  from ranked
  where rn>1
)
update menu_items m
set path=legacy.new_path,
    updated_at=now()
from legacy
where m.id=legacy.id;

commit;
