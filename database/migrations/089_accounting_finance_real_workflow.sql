-- 089: production-grade accounting and finance foundation.
-- Extends menu 08 without removing legacy accounting capabilities.
-- Models real accounting workflows: master data, vouchers, approvals, period locks,
-- treasury/checks, receivables/payables, assets, tax, budgets, commitments and reconciliation.
begin;

-- ---------------------------------------------------------------------------
-- 1) Accounting master data and posting controls
-- ---------------------------------------------------------------------------
alter table ledger_accounts add column if not exists account_level integer;
alter table ledger_accounts add column if not exists account_nature text;
alter table ledger_accounts add column if not exists normal_balance text;
alter table ledger_accounts add column if not exists is_postable boolean not null default true;
alter table ledger_accounts add column if not exists is_control_account boolean not null default false;
alter table ledger_accounts add column if not exists is_active boolean not null default true;
alter table ledger_accounts add column if not exists description text not null default '';
alter table ledger_accounts add column if not exists analytic_required boolean not null default false;

update ledger_accounts
set account_nature=coalesce(account_nature,
  case
    when account_type in ('asset','cash','bank','receivable') then 'asset'
    when account_type in ('liability','payable','debt') then 'liability'
    when account_type in ('equity','capital') then 'equity'
    when account_type in ('revenue','income') then 'revenue'
    when account_type in ('expense','cost') then 'expense'
    else 'general'
  end),
  normal_balance=coalesce(normal_balance,
  case
    when account_type in ('asset','cash','bank','receivable','expense','cost') then 'debit'
    else 'credit'
  end)
where account_nature is null or normal_balance is null;

alter table accounting_documents add column if not exists source_module text not null default 'manual';
alter table accounting_documents add column if not exists source_document_id uuid;
alter table accounting_documents add column if not exists is_automatic boolean not null default false;
alter table accounting_documents add column if not exists reversal_of_id uuid references accounting_documents(id) on delete set null;
alter table accounting_documents add column if not exists posted_by uuid references users(id) on delete set null;
alter table accounting_documents add column if not exists posting_message text;

create index if not exists accounting_documents_source_idx
  on accounting_documents(tenant_id,source_module,source_document_id);

-- ---------------------------------------------------------------------------
-- 2) Numbering and approval rules
-- ---------------------------------------------------------------------------
create table if not exists accounting_numbering_rules(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete cascade,
 book_id uuid not null references accounting_books(id) on delete cascade,
 document_type text not null,
 prefix text not null default '',
 next_number bigint not null default 1 check(next_number>0),
 padding integer not null default 6 check(padding between 1 and 12),
 fiscal_reset boolean not null default true,
 is_active boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(tenant_id,book_id,document_type)
);

create table if not exists accounting_document_approvals(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete cascade,
 document_id uuid not null references accounting_documents(id) on delete cascade,
 step_no integer not null check(step_no>0),
 approver_role text,
 approver_user_id uuid references users(id) on delete set null,
 status text not null default 'pending' check(status in ('pending','approved','rejected','skipped')),
 note text not null default '',
 acted_at timestamptz,
 created_at timestamptz not null default now(),
 unique(document_id,step_no)
);
create index if not exists accounting_document_approvals_queue
 on accounting_document_approvals(tenant_id,status,step_no);

-- ---------------------------------------------------------------------------
-- 3) Parties, banks and cash
-- ---------------------------------------------------------------------------
create table if not exists accounting_parties(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete cascade,
 party_code text not null,
 party_type text not null default 'customer'
   check(party_type in ('customer','supplier','employee','agent','bank','other')),
 title text not null,
 national_id text,
 economic_code text,
 tax_id text,
 phone text,
 email text,
 address text,
 default_account_id uuid references ledger_accounts(id) on delete set null,
 credit_limit numeric(20,2) not null default 0,
 payment_term_days integer not null default 0 check(payment_term_days>=0),
 status text not null default 'active' check(status in ('active','inactive')),
 metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(tenant_id,party_code)
);

create table if not exists accounting_bank_accounts(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete cascade,
 code text not null,
 bank_name text not null,
 branch_name text,
 account_no text,
 iban text,
 card_no text,
 currency text not null default 'IRR',
 ledger_account_id uuid references ledger_accounts(id) on delete set null,
 opening_balance numeric(20,2) not null default 0,
 current_balance numeric(20,2) not null default 0,
 status text not null default 'active' check(status in ('active','inactive')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(tenant_id,code)
);

create table if not exists accounting_cashboxes(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete cascade,
 code text not null,
 title text not null,
 cashier_user_id uuid references users(id) on delete set null,
 ledger_account_id uuid references ledger_accounts(id) on delete set null,
 opening_balance numeric(20,2) not null default 0,
 current_balance numeric(20,2) not null default 0,
 max_balance numeric(20,2),
 status text not null default 'active' check(status in ('active','inactive')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(tenant_id,code)
);

-- ---------------------------------------------------------------------------
-- 4) Receivables, payables and checks
-- ---------------------------------------------------------------------------
create table if not exists accounting_receivable_payables(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete cascade,
 party_id uuid not null references accounting_parties(id) on delete restrict,
 document_id uuid references accounting_documents(id) on delete set null,
 direction text not null check(direction in ('receivable','payable')),
 reference_no text,
 issue_date date not null,
 due_date date,
 original_amount numeric(20,2) not null check(original_amount>0),
 settled_amount numeric(20,2) not null default 0 check(settled_amount>=0),
 currency text not null default 'IRR',
 status text not null default 'open' check(status in ('open','partially_settled','settled','cancelled','overdue')),
 description text not null default '',
 metadata jsonb not null default '{}'::jsonb,
 created_by uuid references users(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check(settled_amount<=original_amount)
);
create index if not exists accounting_rp_due_idx
 on accounting_receivable_payables(tenant_id,direction,status,due_date);

create table if not exists accounting_checks(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete cascade,
 party_id uuid references accounting_parties(id) on delete set null,
 rp_id uuid references accounting_receivable_payables(id) on delete set null,
 check_no text not null,
 direction text not null check(direction in ('received','issued')),
 bank_name text,
 branch_name text,
 issue_date date,
 due_date date,
 amount numeric(20,2) not null check(amount>0),
 status text not null default 'in_hand'
   check(status in ('in_hand','deposited','cleared','returned','endorsed','cancelled','issued','paid')),
 deposit_date date,
 clearance_date date,
 return_reason text,
 guarantee boolean not null default false,
 notes text not null default '',
 created_by uuid references users(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(tenant_id,direction,check_no)
);
create index if not exists accounting_checks_due_idx
 on accounting_checks(tenant_id,direction,status,due_date);

-- ---------------------------------------------------------------------------
-- 5) Fixed assets
-- ---------------------------------------------------------------------------
create table if not exists accounting_assets(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete cascade,
 asset_code text not null,
 title text not null,
 asset_group text,
 acquisition_date date not null,
 acquisition_cost numeric(20,2) not null check(acquisition_cost>=0),
 residual_value numeric(20,2) not null default 0 check(residual_value>=0),
 useful_life_months integer not null check(useful_life_months>0),
 depreciation_method text not null default 'straight_line'
   check(depreciation_method in ('straight_line','declining_balance','units_of_production')),
 accumulated_depreciation numeric(20,2) not null default 0,
 book_value numeric(20,2) not null default 0,
 location text,
 custodian_user_id uuid references users(id) on delete set null,
 status text not null default 'active'
   check(status in ('active','disposed','transferred','impaired')),
 ledger_account_id uuid references ledger_accounts(id) on delete set null,
 accumulated_depreciation_account_id uuid references ledger_accounts(id) on delete set null,
 expense_account_id uuid references ledger_accounts(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(tenant_id,asset_code),
 check(residual_value<=acquisition_cost)
);

create table if not exists accounting_asset_events(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete cascade,
 asset_id uuid not null references accounting_assets(id) on delete cascade,
 event_type text not null
   check(event_type in ('acquire','depreciate','transfer','revalue','impair','dispose')),
 event_date date not null,
 amount numeric(20,2) not null default 0,
 from_location text,
 to_location text,
 document_id uuid references accounting_documents(id) on delete set null,
 note text not null default '',
 created_by uuid references users(id) on delete set null,
 created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 6) Tax, budget and commitments
-- ---------------------------------------------------------------------------
create table if not exists accounting_tax_documents(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete cascade,
 document_id uuid references accounting_documents(id) on delete set null,
 party_id uuid references accounting_parties(id) on delete set null,
 tax_type text not null check(tax_type in ('vat','withholding','payroll','quarterly_sales','invoice')),
 tax_period text not null,
 taxable_amount numeric(20,2) not null default 0,
 tax_amount numeric(20,2) not null default 0,
 tax_number text,
 status text not null default 'draft'
   check(status in ('draft','ready','submitted','accepted','rejected')),
 submitted_at timestamptz,
 response_data jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists accounting_tax_period_idx
 on accounting_tax_documents(tenant_id,tax_type,tax_period,status);

create table if not exists accounting_budgets(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete cascade,
 fiscal_period_id uuid references accounting_fiscal_periods(id) on delete restrict,
 code text not null,
 title text not null,
 dimension_type text not null default 'cost_center',
 dimension_id uuid,
 planned_amount numeric(20,2) not null default 0,
 consumed_amount numeric(20,2) not null default 0,
 status text not null default 'draft' check(status in ('draft','approved','closed')),
 created_by uuid references users(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(tenant_id,code)
);

create table if not exists accounting_commitments(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete cascade,
 party_id uuid references accounting_parties(id) on delete set null,
 commitment_type text not null
   check(commitment_type in ('purchase','sale','payment','receipt','contract','loan')),
 reference_no text,
 due_date date,
 amount numeric(20,2) not null check(amount>=0),
 settled_amount numeric(20,2) not null default 0 check(settled_amount>=0),
 status text not null default 'open'
   check(status in ('open','partially_settled','settled','cancelled','overdue')),
 source_module text not null default 'manual',
 source_id uuid,
 description text not null default '',
 created_by uuid references users(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check(settled_amount<=amount)
);

-- ---------------------------------------------------------------------------
-- 7) Bank reconciliation and month/year-end control
-- ---------------------------------------------------------------------------
create table if not exists accounting_bank_reconciliations(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete cascade,
 bank_account_id uuid not null references accounting_bank_accounts(id) on delete restrict,
 statement_date date not null,
 statement_balance numeric(20,2) not null,
 book_balance numeric(20,2) not null,
 difference numeric(20,2) generated always as (statement_balance-book_balance) stored,
 status text not null default 'draft' check(status in ('draft','in_review','reconciled','approved')),
 reconciled_by uuid references users(id) on delete set null,
 reconciled_at timestamptz,
 notes text not null default '',
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table if not exists accounting_period_closures(
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references tenants(id) on delete cascade,
 period_id uuid not null references accounting_fiscal_periods(id) on delete restrict,
 stage text not null
   check(stage in ('precheck','subledgers','reconciliation','adjustments','closing','locked')),
 status text not null default 'pending'
   check(status in ('pending','passed','failed','approved')),
 checks jsonb not null default '{}'::jsonb,
 executed_by uuid references users(id) on delete set null,
 executed_at timestamptz,
 created_at timestamptz not null default now(),
 unique(period_id,stage)
);

-- ---------------------------------------------------------------------------
-- 8) Hard accounting invariants at database level
-- ---------------------------------------------------------------------------
create or replace function accounting_document_post_guard()
returns trigger
language plpgsql
as $$
declare
  d numeric(20,2);
  c numeric(20,2);
  pstatus text;
begin
  if new.status='posted' and (tg_op='INSERT' or old.status<>'posted') then
    if new.period_id is not null then
      select status into pstatus from accounting_fiscal_periods
      where id=new.period_id and tenant_id=new.tenant_id;
      if pstatus is distinct from 'open' then
        raise exception 'ACCOUNTING_PERIOD_NOT_OPEN';
      end if;
    end if;

    select coalesce(sum(debit),0),coalesce(sum(credit),0)
      into d,c
    from accounting_document_lines where document_id=new.id;

    if d=0 or c=0 or abs(d-c)>0.005 then
      raise exception 'ACCOUNTING_DOCUMENT_NOT_BALANCED';
    end if;
  end if;

  if old.status='posted' and new.status<>'void' then
    raise exception 'POSTED_DOCUMENT_CAN_ONLY_BE_VOIDED';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_accounting_document_post_guard on accounting_documents;
create trigger trg_accounting_document_post_guard
before insert or update of status on accounting_documents
for each row execute function accounting_document_post_guard();

-- ---------------------------------------------------------------------------
-- 9) Finalize Menu 08: preserve the old accounting children and add detailed
--    accountant-facing navigation beneath the 30 existing 08 sections.
-- ---------------------------------------------------------------------------
with data(menu_key,children) as (
 values
 ('accounting-dashboard','["داشبورد مالی","داشبورد حسابداری","وضعیت اسناد","مانده حساب‌ها","بدهکاران","بستانکاران","نقدینگی","هشدارهای مالی","KPI مالی"]'::jsonb),
 ('accounting-core','["دفاتر حسابداری","کدینگ حساب‌ها","ساختار حساب‌ها","حساب‌های والد و فرزند","گروه حساب","حساب کل","حساب معین","حساب تفصیلی","حساب شناور","تفصیلی‌ها","ماهیت حساب","حساب‌های رسمی","حساب‌های داخلی","حساب‌های ترکیبی","نگاشت حساب‌ها","حسابداری بین‌شرکتی"]'::jsonb),
 ('accounting-ledgers','["دفتر روزنامه","دفتر کل","دفتر معین","دفتر تفصیلی","تراز آزمایشی","گردش حساب","مانده حساب","صورت‌های مالی","گزارش‌های حسابداری","گزارش‌ساز"]'::jsonb),
 ('accounting-chart','["کدینگ حساب‌ها","درخت حساب‌ها","گروه حساب","حساب کل","حساب معین","حساب تفصیلی","حساب شناور","ماهیت حساب","نگاشت حساب‌ها","استاندارد کدینگ","کنترل کدینگ"]'::jsonb),
 ('accounting-receipts-payments','["دریافت","پرداخت","رسید دریافت","رسید پرداخت","صندوق","بانک","تنخواه","تسویه","سند خودکار","گزارش دریافت و پرداخت"]'::jsonb),
 ('accounting-treasury','["داشبورد خزانه","صندوق","حساب بانکی","کارتخوان","درگاه","انتقال بین حساب‌ها","تنخواه","مغایرت بانکی","پیش‌بینی نقدینگی","گزارش خزانه"]'::jsonb),
 ('accounting-receivables','["حساب‌های دریافتنی","چک دریافتی","نزد صندوق","نزد بانک","واگذاری","وصول","برگشت","واخواست","سفته","ضمانت‌نامه","سررسیدها"]'::jsonb),
 ('accounting-payables','["حساب‌های پرداختنی","چک پرداختی","صادره","در جریان","پرداخت","برگشتی","ابطالی","استرداد","تعهدات پرداخت","سررسید پرداخت"]'::jsonb),
 ('accounting-parties','["اشخاص","مشتریان","تأمین‌کنندگان","کارکنان","نمایندگان","بانک‌ها","شعب","پروژه‌ها","گردش","بدهکار","بستانکار","تسویه","صورتحساب طرف حساب"]'::jsonb),
 ('accounting-centers','["مرکز هزینه","مرکز درآمد","مرکز سود","مرکز والد","مسئول مرکز","ساختار مراکز","تخصیص هزینه","گزارش عملکرد مراکز"]'::jsonb),
 ('accounting-periods','["دوره جاری","ایجاد دوره","افتتاح","کنترل","بستن","قفل دوره","افتتاحیه","اختتامیه","انتقال مانده","تاریخچه دوره"]'::jsonb),
 ('accounting-assets','["دارایی‌ها","اموال","خودروها","تجهیزات","ثبت دارایی","انتقال","واگذاری","استهلاک","تجدید ارزیابی","کاهش ارزش","تاریخچه دارایی","گزارش دارایی‌ها"]'::jsonb),
 ('accounting-purchase-cost','["درخواست خرید","استعلام","سفارش خرید","فاکتور خرید","برگشت خرید","هزینه‌ها","پیش‌پرداخت","تأمین‌کنندگان","ارزیابی تأمین‌کنندگان","قرارداد تأمین","بهای تمام‌شده"]'::jsonb),
 ('accounting-sales-income','["داشبورد فروش","پیش‌فاکتور","سفارش فروش","فاکتور فروش","برگشت فروش","تخفیف","پورسانت","اهداف","قیمت‌گذاری","دریافت از مشتری","درآمد","گزارش فروش"]'::jsonb),
 ('accounting-tax','["پرونده مالیاتی","ارزش افزوده","معاملات","صورتحساب","اظهارنامه","مالیات حقوق","مالیات تکلیفی","معاملات فصلی","سامانه‌های مالیاتی","گزارش مالیاتی"]'::jsonb),
 ('accounting-budget','["بودجه سازمان","بودجه شرکت","بودجه شعب","بودجه مراکز هزینه","برنامه بودجه","کنترل بودجه","مصرف بودجه","انحراف بودجه","گزارش بودجه"]'::jsonb),
 ('accounting-commitments','["تعهدات خرید","تعهدات فروش","تعهدات پرداخت","تعهدات دریافت","تعهدات قرارداد","سررسید تعهدات","وضعیت تعهدات","گزارش تعهدات"]'::jsonb),
 ('accounting-wallet','["کیف پول","موجودی","شارژ","برداشت","انتقال","تراکنش‌ها","دفترکل","گردش دفترکل","تطبیق","تراکنش ناموفق","برگشت","تسویه","مغایرت","تاریخچه"]'::jsonb),
 ('accounting-documents','["اسناد مالی","زونکن","زونکن دیجیتال","ورود سند","بارگذاری سند","OCR","استخراج اطلاعات","ارتباط اسناد","نسخه‌ها","گردش تأیید","جستجو","امنیت","دسترسی","امضا","ممیزی","آرشیو"]'::jsonb),
 ('accounting-reports','["تراز آزمایشی","ترازنامه","سود و زیان","جریان وجوه نقد","گردش حساب","مطالبات","بدهی‌ها","نقدینگی","بانک","صندوق","چک","درآمد","هزینه","گزارش شعب","گزارش شرکت‌ها","گزارش تلفیقی","گزارش مدیریتی","گزارش سفارشی","گزارش‌ساز"]'::jsonb),
 ('accounting-control','["Audit Trail","کنترل تراز","کنترل دوره","کنترل کدینگ","کنترل اسناد","تغییرات اسناد","کنترل تراکنش‌ها","کنترل دسترسی","تراکنش‌های مشکوک","کشف ناهنجاری","کشف تقلب","مغایرت‌ها","گزارش حسابرسی"]'::jsonb),
 ('accounting-settings','["تنظیمات حسابداری","تنظیمات خزانه","تنظیمات بانک","تنظیمات چک","تنظیمات کدینگ","تنظیمات اسناد","شماره‌گذاری","سطوح تأیید","دسترسی","قوانین اتوماتیک","حساب‌های پیش‌فرض","دوره پیش‌فرض","ارز و واحد پول"]'::jsonb),
 ('accounting-procurement','["برنامه تأمین","سفارش تأمین","تأمین‌کنندگان","ارزیابی تأمین‌کنندگان","حمل","ناوگان","ارسال","تحویل","رهگیری","گزارش لجستیک"]'::jsonb),
 ('accounting-credit','["داشبورد اعتبارات","انواع تسهیلات","طرح‌ها","درخواست وام","پرونده اعتباری","بررسی کارشناسی","اعتبارسنجی","قرارداد","پرداخت","اقساط","وصول","گزارش اعتبارات"]'::jsonb),
 ('accounting-collections','["مطالبات مشتریان","بدهکاران","سررسید","برنامه وصول","پیگیری","اقساط معوق","اخطار","پرونده حقوقی","تسویه","گزارش وصول"]'::jsonb),
 ('accounting-hr','["کارکنان","پرونده پرسنلی","قرارداد کارکنان","حقوق و دستمزد","دوره حقوق","محاسبه حقوق","فیش حقوقی","مزایا","کسورات","بیمه","مالیات حقوق","پرداخت حقوق","سند حقوق","ورود و خروج","شیفت","اضافه‌کاری","تأخیر","مرخصی","مأموریت","گزارش حضور و غیاب"]'::jsonb),
 ('accounting-production','["محصولات تولیدی","مواد اولیه","فرمول ساخت","سفارش تولید","برنامه تولید","خطوط تولید","مصرف مواد","تولید نهایی","ضایعات","بهای تمام‌شده","گزارش تولید"]'::jsonb),
 ('accounting-ai-finance','["داشبورد AI مالی","دستیار حسابدار","تحلیل حساب‌ها","پیشنهاد کدینگ","پیشنهاد سند","تطبیق اسناد","کشف مغایرت","کشف تقلب","تحلیل مالی","پیش‌بینی درآمد","پیش‌بینی هزینه","پیش‌بینی نقدینگی","تحلیل سودآوری"]'::jsonb),
 ('accounting-ai-documents','["OCR فاکتور","OCR اسناد","خواندن سند","استخراج اطلاعات","تشخیص نوع سند","استخراج اطلاعات هویتی","پیشنهاد ثبت مالی","تطبیق سند با تراکنش","کنترل کیفیت OCR","صف پردازش OCR"]'::jsonb),
 ('accounting-audit','["حسابرسی مالی","کنترل داخلی","کنترل اسناد","کنترل تراکنش‌ها","کنترل دسترسی","لاگ تغییرات","کشف ناهنجاری","کشف تقلب","موارد مشکوک","پرونده حسابرسی","اقدامات اصلاحی","گزارش حسابرسی"]'::jsonb)
)
update menu_items m
set children=d.children,updated_at=now()
from data d
where m.menu_key=d.menu_key;

commit;
