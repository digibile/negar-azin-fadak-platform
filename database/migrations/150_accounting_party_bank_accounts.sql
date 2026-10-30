-- 150: bank accounts owned by external accounting parties.
-- accounting_bank_accounts remains reserved for the tenant's own treasury accounts.
begin;

alter table accounting_parties
  add constraint accounting_parties_tenant_id_unique unique(tenant_id,id);

create table if not exists accounting_party_bank_accounts(
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  party_id uuid not null,
  account_title text,
  bank_name text,
  branch_name text,
  account_no text,
  iban text not null,
  card_no text,
  status text not null default 'active' check(status in ('active','inactive','blocked')),
  verification_status text not null default 'pending'
    check(verification_status in ('pending','verified','rejected')),
  verification_method text,
  verification_note text,
  verified_by uuid references users(id) on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint accounting_party_bank_accounts_party_fk
    foreign key(tenant_id,party_id)
    references accounting_parties(tenant_id,id) on delete restrict,
  constraint accounting_party_bank_accounts_iban_format
    check(iban ~ '^IR[0-9]{24}$'),
  unique(tenant_id,iban)
);

create index if not exists accounting_party_bank_accounts_party_idx
  on accounting_party_bank_accounts(tenant_id,party_id,status,created_at desc);

create index if not exists accounting_party_bank_accounts_verification_idx
  on accounting_party_bank_accounts(tenant_id,verification_status,status,created_at desc);

commit;
 and is_valid_iranian_iban(iban)),
  unique(tenant_id,iban)
);

create index if not exists accounting_party_bank_accounts_party_idx
  on accounting_party_bank_accounts(tenant_id,party_id,status,created_at desc);

create index if not exists accounting_party_bank_accounts_verification_idx
  on accounting_party_bank_accounts(tenant_id,verification_status,status,created_at desc);

commit;
 then return false; end if;
  rearranged := substring(normalized from 5) || substring(normalized from 1 for 4);
  for i in 1..length(rearranged) loop
    ch := substring(rearranged from i for 1);
    if ch ~ '^[A-Z]  add constraint accounting_parties_tenant_id_unique unique(tenant_id,id);

create table if not exists accounting_party_bank_accounts(
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  party_id uuid not null,
  account_title text,
  bank_name text,
  branch_name text,
  account_no text,
  iban text not null,
  card_no text,
  status text not null default 'active' check(status in ('active','inactive','blocked')),
  verification_status text not null default 'pending'
    check(verification_status in ('pending','verified','rejected')),
  verification_method text,
  verification_note text,
  verified_by uuid references users(id) on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint accounting_party_bank_accounts_party_fk
    foreign key(tenant_id,party_id)
    references accounting_parties(tenant_id,id) on delete restrict,
  constraint accounting_party_bank_accounts_iban_format
    check(iban ~ '^IR[0-9]{24}$'),
  unique(tenant_id,iban)
);

create index if not exists accounting_party_bank_accounts_party_idx
  on accounting_party_bank_accounts(tenant_id,party_id,status,created_at desc);

create index if not exists accounting_party_bank_accounts_verification_idx
  on accounting_party_bank_accounts(tenant_id,verification_status,status,created_at desc);

commit;
 then
      expanded := expanded || (ascii(ch) - 55)::text;
    else
      expanded := expanded || ch;
    end if;
  end loop;
  for i in 1..length(expanded) loop
    remainder := (remainder * 10 + substring(expanded from i for 1)::integer) % 97;
  end loop;
  return remainder = 1;
end;
$;

alter table accounting_parties
  add constraint accounting_parties_tenant_id_unique unique(tenant_id,id);

create table if not exists accounting_party_bank_accounts(
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  party_id uuid not null,
  account_title text,
  bank_name text,
  branch_name text,
  account_no text,
  iban text not null,
  card_no text,
  status text not null default 'active' check(status in ('active','inactive','blocked')),
  verification_status text not null default 'pending'
    check(verification_status in ('pending','verified','rejected')),
  verification_method text,
  verification_note text,
  verified_by uuid references users(id) on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint accounting_party_bank_accounts_party_fk
    foreign key(tenant_id,party_id)
    references accounting_parties(tenant_id,id) on delete restrict,
  constraint accounting_party_bank_accounts_iban_format
    check(iban ~ '^IR[0-9]{24}$'),
  unique(tenant_id,iban)
);

create index if not exists accounting_party_bank_accounts_party_idx
  on accounting_party_bank_accounts(tenant_id,party_id,status,created_at desc);

create index if not exists accounting_party_bank_accounts_verification_idx
  on accounting_party_bank_accounts(tenant_id,verification_status,status,created_at desc);

commit;
