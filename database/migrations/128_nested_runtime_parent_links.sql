begin;

with mapping(child_code,parent_code) as (values
('21-purchasing-supply','09-commerce-stores'),('22-sales-revenue','09-commerce-stores'),('23-inventory-warehouse','09-commerce-stores'),
('24-production','02-organizations'),('25-costing','08-accounting-finance'),('26-treasury-bank','08-accounting-finance'),
('27-receivables','08-accounting-finance'),('28-payables','08-accounting-finance'),('29-wallet-ledger','13-payments-settlement'),
('30-projects-cost-centers','02-organizations'),('31-fixed-assets','08-accounting-finance'),('32-tax-e-invoicing','08-accounting-finance'),
('33-budget-financial-control','08-accounting-finance'),('34-financial-commitments','08-accounting-finance'),('35-credit-financing','08-accounting-finance'),
('36-loans','08-accounting-finance'),('37-collateral-guarantees','08-accounting-finance'),('38-collections','08-accounting-finance'),
('39-human-resources','02-organizations'),('40-ai-finance','08-accounting-finance'),('41-ai-documents-ocr','19-documents-governance'),
('42-audit-internal-control','19-documents-governance'),('43-communication-hub','18-notifications'),('44-marketing-content','04-customers-360'),
('45-search-analytics','01-dashboard'),('46-unified-applications','20-system-settings'),('47-contracts-legal','19-documents-governance'),
('48-shipping-delivery','09-commerce-stores'),('49-reconciliation','13-payments-settlement'),('50-release-health','20-system-settings')
)
update platform_modules c
set parent_id=p.id,updated_at=now()
from mapping x join platform_modules p on p.code=x.parent_code
where c.code=x.child_code;

commit;