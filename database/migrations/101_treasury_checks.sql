begin;

create extension if not exists pgcrypto;

create table if not exists treasury_checks (
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null,
 check_type text not null check (check_type in ('received','payable')),
 check_no text not null,
 series_no text,
 bank_name text,
 branch_name text,
 account_no text,
 issuer_name text not null,
 beneficiary_name text,
 issue_date date,
 due_date date not null,
 amount numeric(20,2) not null check (amount>0),
 currency text not null default 'IRR',
 description text,
 status text not null default 'registered' check (status in ('registered','awaiting_collection','deposited','assigned','issued','in_transit','collected','returned','protested','refunded','cancelled','settled')),
 bank_account_id uuid,
 counterparty_reference text,
 created_by uuid,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 settled_at timestamptz,
 unique(tenant_id,check_type,check_no)
);

create index if not exists treasury_checks_tenant_due_idx on treasury_checks(tenant_id,due_date,status);
create index if not exists treasury_checks_tenant_type_idx on treasury_checks(tenant_id,check_type,status);

create table if not exists treasury_check_events (
 id bigserial primary key,
 tenant_id uuid not null,
 check_id uuid not null references treasury_checks(id) on delete cascade,
 from_status text,
 to_status text not null,
 event_type text not null,
 reason text,
 reference_no text,
 actor_user_id uuid,
 created_at timestamptz not null default now()
);

create index if not exists treasury_check_events_check_idx on treasury_check_events(check_id,created_at desc);

insert into platform_modules(code,title,is_active)
values ('08-check-documents','چک و اسناد خزانه',true)
on conflict(code) do update set title=excluded.title,is_active=true;

insert into module_actions(module_id,action_code,title,permission)
select m.id,v.action_code,v.title,v.permission
from platform_modules m
cross join (values
 ('read','مشاهده چک‌ها','modules:08-check-documents:read'),
 ('write','ثبت و ویرایش چک','modules:08-check-documents:write'),
 ('approve','تأیید چک','modules:08-check-documents:approve'),
 ('deposit','واگذاری چک','modules:08-check-documents:deposit'),
 ('collect','وصول چک','modules:08-check-documents:collect'),
 ('return','ثبت برگشت','modules:08-check-documents:return'),
 ('settle','تسویه چک','modules:08-check-documents:settle')
) v(action_code,title,permission)
where m.code='08-check-documents'
on conflict(module_id,action_code) do update set title=excluded.title,permission=excluded.permission;

commit;
