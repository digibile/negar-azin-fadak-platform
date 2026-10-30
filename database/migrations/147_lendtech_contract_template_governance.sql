-- 147: contract template governance and borrower signature lifecycle on the canonical lendtech engine.
create unique index if not exists uq_lendtech_applications_tenant_id
  on lendtech_applications(tenant_ref,id);
create unique index if not exists uq_lendtech_contracts_tenant_id
  on lendtech_contracts(tenant_ref,id);

create table if not exists lendtech_contract_templates (
  id uuid primary key default gen_random_uuid(),
  tenant_ref text not null,
  group_key uuid not null,
  version integer not null default 1 check(version>0),
  title text not null,
  template_type text not null default 'Company' check(template_type in ('Company','Bank','Financier','Guarantee','Other')),
  issuer_party text not null default '',
  parties jsonb not null default '[]'::jsonb,
  description text not null default '',
  usage_conditions text not null default '',
  counter_party_ref text,
  restricted boolean not null default false,
  header_html text not null default '',
  body_html text not null default '',
  footer_html text not null default '',
  status text not null default 'draft' check(status in ('draft','approved','published','archived')),
  change_note text not null default '',
  valid_from date,
  valid_to date,
  created_by text,
  approved_by text,
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  published_at timestamptz,
  unique(tenant_ref,group_key,version),
  unique(tenant_ref,id)
);
create index if not exists idx_lendtech_contract_templates_group
  on lendtech_contract_templates(tenant_ref,group_key,status,version desc);

create table if not exists lendtech_contract_variable_defs (
  id uuid primary key default gen_random_uuid(),
  tenant_ref text not null,
  key text not null,
  label text not null,
  data_type text not null default 'text' check(data_type in ('text','date','number','money')),
  source text not null default 'system' check(source in ('applicant','loan','party','system','document','custom')),
  path text not null default '',
  required boolean not null default false,
  format text not null default '',
  sensitivity text not null default 'Normal' check(sensitivity in ('Normal','Sensitive')),
  default_value text not null default '',
  validation text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tenant_ref,key),
  unique(tenant_ref,id)
);

create table if not exists lendtech_product_contract_templates (
  id uuid primary key default gen_random_uuid(),
  tenant_ref text not null,
  product_code text not null,
  group_key uuid not null,
  stage text not null default 'signature' check(stage in ('approval','signature','disbursement')),
  required boolean not null default true,
  condition text not null default '',
  requires_review boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tenant_ref,product_code,group_key,stage)
);
create index if not exists idx_lendtech_product_contracts
  on lendtech_product_contract_templates(tenant_ref,product_code,stage,sort_order);

create table if not exists lendtech_contract_documents (
  id uuid primary key default gen_random_uuid(),
  tenant_ref text not null,
  application_id uuid not null,
  contract_id uuid not null,
  template_id uuid not null,
  group_key uuid not null,
  template_version integer not null,
  document_no text not null,
  title text not null,
  stage text not null default 'signature' check(stage in ('approval','signature','disbursement')),
  status text not null default 'draft' check(status in ('draft','presented','signed','rejected','expired')),
  requires_review boolean not null default true,
  html text not null,
  body_hash text not null,
  values_json jsonb not null default '{}'::jsonb,
  previous_id uuid,
  created_by text,
  created_at timestamptz not null default now(),
  reviewed_by text,
  reviewed_at timestamptz,
  presented_at timestamptz,
  expires_at timestamptz,
  signed_at timestamptz,
  signed_ip inet,
  signed_ua text not null default '',
  signature_method text not null default '',
  rejection_note text not null default '',
  unique(tenant_ref,id),
  unique(tenant_ref,document_no),
  foreign key(tenant_ref,application_id) references lendtech_applications(tenant_ref,id) on delete cascade,
  foreign key(tenant_ref,contract_id) references lendtech_contracts(tenant_ref,id) on delete cascade,
  foreign key(tenant_ref,template_id) references lendtech_contract_templates(tenant_ref,id) on delete restrict,
  foreign key(tenant_ref,previous_id) references lendtech_contract_documents(tenant_ref,id) on delete set null
);
create index if not exists idx_lendtech_contract_documents_owner
  on lendtech_contract_documents(tenant_ref,application_id,created_at desc);
create index if not exists idx_lendtech_contract_documents_status
  on lendtech_contract_documents(tenant_ref,status,created_at desc);

create table if not exists lendtech_contract_events (
  id bigserial primary key,
  tenant_ref text not null,
  document_id uuid not null,
  actor_ref text,
  action text not null,
  note text not null default '',
  ip inet,
  created_at timestamptz not null default now(),
  foreign key(tenant_ref,document_id) references lendtech_contract_documents(tenant_ref,id) on delete cascade
);
create index if not exists idx_lendtech_contract_events_document
  on lendtech_contract_events(tenant_ref,document_id,created_at);

insert into role_permissions(role,permission) values
 ('admin','modules:lendtech:contract:manage'),
 ('admin','modules:lendtech:contract:read'),
 ('manager','modules:lendtech:contract:manage'),
 ('manager','modules:lendtech:contract:read')
on conflict do nothing;
