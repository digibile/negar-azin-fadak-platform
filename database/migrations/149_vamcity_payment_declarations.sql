-- VamCity PaymentDeclaration is intake evidence only. Approved declarations
-- create exactly one row in the central lendtech_repayments ledger.
create unique index if not exists uq_lendtech_contract_tenant_id on lendtech_contracts(tenant_ref,id);
create unique index if not exists uq_lendtech_repayment_tenant_id on lendtech_repayments(tenant_ref,id);

create table if not exists lendtech_payment_declarations (
 id uuid primary key default gen_random_uuid(),
 tenant_ref text not null,
 user_ref text not null,
 contract_id uuid not null,
 amount numeric(20,2) not null check (amount > 0),
 method text not null check (method in ('CardToCard','BankTransfer')),
 payment_ref text not null,
 paid_at timestamptz not null,
 note text,
 status text not null default 'pending' check (status in ('pending','approved','rejected')),
 review_note text,
 reviewed_by text,
 reviewed_at timestamptz,
 repayment_id uuid,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint fk_payment_declaration_contract_tenant foreign key(tenant_ref,contract_id) references lendtech_contracts(tenant_ref,id),
 constraint fk_payment_declaration_repayment_tenant foreign key(tenant_ref,repayment_id) references lendtech_repayments(tenant_ref,id),
 check ((status='approved' and repayment_id is not null and reviewed_at is not null)
     or status<>'approved')
);
create unique index if not exists uq_lendtech_payment_declaration_ref
 on lendtech_payment_declarations(tenant_ref,payment_ref)
 where status<>'rejected';
create unique index if not exists uq_lendtech_payment_declaration_repayment
 on lendtech_payment_declarations(repayment_id) where repayment_id is not null;
create index if not exists idx_lendtech_payment_declarations_customer
 on lendtech_payment_declarations(tenant_ref,user_ref,created_at desc);
create index if not exists idx_lendtech_payment_declarations_review
 on lendtech_payment_declarations(tenant_ref,status,created_at desc);

insert into role_permissions(role,permission)
select distinct rp.role,'modules:lendtech:repay'
from role_permissions rp where rp.role='admin'
on conflict do nothing;
