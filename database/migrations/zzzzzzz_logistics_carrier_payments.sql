begin;

create unique index if not exists accounting_receivable_payables_tenant_id_uq
  on accounting_receivable_payables(tenant_id,id);
create unique index if not exists accounting_bank_accounts_tenant_id_uq
  on accounting_bank_accounts(tenant_id,id);
create unique index if not exists accounting_cashboxes_tenant_id_uq
  on accounting_cashboxes(tenant_id,id);
create unique index if not exists accounting_documents_tenant_id_uq
  on accounting_documents(tenant_id,id);

create table if not exists logistics_carrier_payments(
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  carrier_invoice_id uuid not null,
  payable_id uuid not null,
  document_id uuid,
  bank_account_id uuid,
  cashbox_id uuid,
  amount numeric(20,2) not null check(amount>0),
  currency text not null,
  payment_date date not null,
  reference_no text,
  status text not null default 'draft' check(status in ('draft','posted','void')),
  created_by uuid references users(id) on delete set null,
  posted_by uuid references users(id) on delete set null,
  posted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((bank_account_id is not null)::int + (cashbox_id is not null)::int = 1),
  unique(tenant_id,id),
  constraint logistics_carrier_payment_invoice_fk
    foreign key(tenant_id,carrier_invoice_id)
    references logistics_carrier_invoices(tenant_id,id) on delete restrict,
  constraint logistics_carrier_payment_payable_fk
    foreign key(tenant_id,payable_id)
    references accounting_receivable_payables(tenant_id,id) on delete restrict,
  constraint logistics_carrier_payment_document_fk
    foreign key(tenant_id,document_id)
    references accounting_documents(tenant_id,id) on delete restrict,
  constraint logistics_carrier_payment_bank_fk
    foreign key(tenant_id,bank_account_id)
    references accounting_bank_accounts(tenant_id,id) on delete restrict,
  constraint logistics_carrier_payment_cashbox_fk
    foreign key(tenant_id,cashbox_id)
    references accounting_cashboxes(tenant_id,id) on delete restrict
);

create index if not exists logistics_carrier_payments_invoice_idx
  on logistics_carrier_payments(tenant_id,carrier_invoice_id,payment_date desc);
create index if not exists logistics_carrier_payments_payable_idx
  on logistics_carrier_payments(tenant_id,payable_id,status);

create unique index if not exists accounting_documents_carrier_payment_source_uq
  on accounting_documents(tenant_id,source_module,source_document_id)
  where source_module='logistics-carrier-payment' and source_document_id is not null;

commit;
