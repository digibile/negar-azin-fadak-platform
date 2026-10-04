-- Persistent domain storage for all 45 modules
create table if not exists org_units (id bigserial primary key,code text not null unique,name text not null,description text,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index if not exists idx_org_units_updated_at on org_units(updated_at desc);

create table if not exists identities (id bigserial primary key,email text not null unique,full_name text not null,external_ref text,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index if not exists idx_identities_updated_at on identities(updated_at desc);

create table if not exists master_data_entries (id bigserial primary key,data_type text not null,code text not null,name text not null,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index if not exists idx_master_data_entries_updated_at on master_data_entries(updated_at desc);

create table if not exists customer_profiles (id bigserial primary key,identity_id bigint,customer_code text not null unique,display_name text not null,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index if not exists idx_customer_profiles_updated_at on customer_profiles(updated_at desc);

create table if not exists calendar_events (id bigserial primary key,title text not null,start_at timestamptz not null,end_at timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index if not exists idx_calendar_events_updated_at on calendar_events(updated_at desc);

create table if not exists business_rules (id bigserial primary key,code text not null unique,name text not null,definition jsonb not null default '{}'::jsonb,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index if not exists idx_business_rules_updated_at on business_rules(updated_at desc);

create table if not exists sla_policies (id bigserial primary key,code text not null unique,name text not null,response_minutes integer not null default 0,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index if not exists idx_sla_policies_updated_at on sla_policies(updated_at desc);

create table if not exists financial_accounts (id bigserial primary key,code text not null unique,name text not null,account_type text not null,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index if not exists idx_financial_accounts_updated_at on financial_accounts(updated_at desc);

create table if not exists bank_accounts (id bigserial primary key,bank_name text not null,account_number text not null,iban text,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index if not exists idx_bank_accounts_updated_at on bank_accounts(updated_at desc);

create table if not exists wallets (id bigserial primary key,owner_ref text not null,currency text not null default 'IRR',balance numeric(20,2) not null default 0,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index if not exists idx_wallets_updated_at on wallets(updated_at desc);

create table if not exists credit_facilities (id bigserial primary key,code text not null unique,name text not null,limit_amount numeric(20,2) not null default 0,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index if not exists idx_credit_facilities_updated_at on credit_facilities(updated_at desc);

create table if not exists credit_scorecards (id bigserial primary key,subject_ref text not null,score numeric(10,2),decision text,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index if not exists idx_credit_scorecards_updated_at on credit_scorecards(updated_at desc);

create table if not exists loan_contracts (id bigserial primary key,contract_no text not null unique,borrower_ref text not null,principal numeric(20,2) not null,rate numeric(8,4),created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index if not exists idx_loan_contracts_updated_at on loan_contracts(updated_at desc);

create table if not exists installment_plans (id bigserial primary key,contract_ref text not null,installment_count integer not null,period_months integer not null,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index if not exists idx_installment_plans_updated_at on installment_plans(updated_at desc);

create table if not exists collection_cases (id bigserial primary key,case_no text not null unique,subject_ref text not null,amount_due numeric(20,2) not null default 0,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index if not exists idx_collection_cases_updated_at on collection_cases(updated_at desc);

create table if not exists sales_orders (id bigserial primary key,order_no text not null unique,customer_ref text,amount numeric(20,2) not null default 0,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index if not exists idx_sales_orders_updated_at on sales_orders(updated_at desc);

create table if not exists marketplace_listings (id bigserial primary key,listing_no text not null unique,title text not null,price numeric(20,2) not null default 0,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index if not exists idx_marketplace_listings_updated_at on marketplace_listings(updated_at desc);

create table if not exists delivery_orders (id bigserial primary key,order_no text not null unique,recipient_ref text,delivery_date date,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index if not exists idx_delivery_orders_updated_at on delivery_orders(updated_at desc);

create table if not exists commission_rules (id bigserial primary key,code text not null unique,name text not null,rate numeric(8,4) not null default 0,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index if not exists idx_commission_rules_updated_at on commission_rules(updated_at desc);

create table if not exists settlements (id bigserial primary key,settlement_no text not null unique,party_ref text not null,amount numeric(20,2) not null,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index if not exists idx_settlements_updated_at on settlements(updated_at desc);

create table if not exists payments (id bigserial primary key,payment_no text not null unique,amount numeric(20,2) not null,payment_method text not null,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index if not exists idx_payments_updated_at on payments(updated_at desc);

create table if not exists service_providers (id bigserial primary key,code text not null unique,name text not null,base_url text,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index if not exists idx_service_providers_updated_at on service_providers(updated_at desc);

create table if not exists messages (id bigserial primary key,recipient text not null,subject text not null,body text not null,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index if not exists idx_messages_updated_at on messages(updated_at desc);

create table if not exists notifications (id bigserial primary key,recipient_ref text,notification_type text not null,title text not null,body text,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index if not exists idx_notifications_updated_at on notifications(updated_at desc);

create table if not exists crm_leads (id bigserial primary key,lead_no text not null unique,name text not null,phone text,status text not null default 'new',created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index if not exists idx_crm_leads_updated_at on crm_leads(updated_at desc);

create table if not exists contact_interactions (id bigserial primary key,contact_ref text not null,channel text not null,summary text,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index if not exists idx_contact_interactions_updated_at on contact_interactions(updated_at desc);

create table if not exists support_tickets (id bigserial primary key,ticket_no text not null unique,subject text not null,priority text not null default 'normal',created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index if not exists idx_support_tickets_updated_at on support_tickets(updated_at desc);

create table if not exists office_documents (id bigserial primary key,document_no text not null unique,title text not null,document_type text not null,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index if not exists idx_office_documents_updated_at on office_documents(updated_at desc);

create table if not exists digital_binders (id bigserial primary key,binder_no text not null unique,title text not null,owner_ref text,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index if not exists idx_digital_binders_updated_at on digital_binders(updated_at desc);

create table if not exists web_domains (id bigserial primary key,domain text not null unique,provider text,status text not null default 'active',created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index if not exists idx_web_domains_updated_at on web_domains(updated_at desc);

create table if not exists managed_pages (id bigserial primary key,slug text not null unique,title text not null,definition jsonb not null default '{}'::jsonb,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index if not exists idx_managed_pages_updated_at on managed_pages(updated_at desc);

create table if not exists managed_forms (id bigserial primary key,slug text not null unique,name text not null,schema jsonb not null default '{}'::jsonb,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index if not exists idx_managed_forms_updated_at on managed_forms(updated_at desc);

create table if not exists content_entries (id bigserial primary key,slug text not null unique,title text not null,body text,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index if not exists idx_content_entries_updated_at on content_entries(updated_at desc);

create table if not exists ai_requests (id bigserial primary key,request_no text not null unique,request_type text not null,input jsonb not null default '{}'::jsonb,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index if not exists idx_ai_requests_updated_at on ai_requests(updated_at desc);

create table if not exists employees (id bigserial primary key,personnel_no text not null unique,full_name text not null,department text,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index if not exists idx_employees_updated_at on employees(updated_at desc);

create table if not exists projects (id bigserial primary key,project_no text not null unique,name text not null,status text not null default 'active',created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index if not exists idx_projects_updated_at on projects(updated_at desc);

create table if not exists report_definitions (id bigserial primary key,code text not null unique,name text not null,definition jsonb not null default '{}'::jsonb,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index if not exists idx_report_definitions_updated_at on report_definitions(updated_at desc);

create table if not exists command_actions (id bigserial primary key,command_no text not null unique,action_type text not null,payload jsonb not null default '{}'::jsonb,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index if not exists idx_command_actions_updated_at on command_actions(updated_at desc);

create table if not exists monitoring_events (id bigserial primary key,event_type text not null,severity text not null,message text not null,occurred_at timestamptz not null default now(),created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index if not exists idx_monitoring_events_updated_at on monitoring_events(updated_at desc);

create table if not exists audit_events (id bigserial primary key,event_type text not null,actor_ref text,entity_type text,entity_id bigint,payload jsonb not null default '{}'::jsonb,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index if not exists idx_audit_events_updated_at on audit_events(updated_at desc);

create table if not exists documents (id bigserial primary key,document_no text not null unique,title text not null,content text,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index if not exists idx_documents_updated_at on documents(updated_at desc);

create table if not exists api_clients (id bigserial primary key,client_id text not null unique,name text not null,scopes jsonb not null default '[]'::jsonb,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index if not exists idx_api_clients_updated_at on api_clients(updated_at desc);

create table if not exists data_sources (id bigserial primary key,code text not null unique,name text not null,source_type text not null,config jsonb not null default '{}'::jsonb,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index if not exists idx_data_sources_updated_at on data_sources(updated_at desc);

create table if not exists mobile_devices (id bigserial primary key,device_id text not null unique,owner_ref text,platform text not null,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index if not exists idx_mobile_devices_updated_at on mobile_devices(updated_at desc);

create table if not exists quality_checks (id bigserial primary key,check_no text not null unique,title text not null,score numeric(10,2),created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index if not exists idx_quality_checks_updated_at on quality_checks(updated_at desc);

create table if not exists module_records(
 id bigserial primary key,
 module_id smallint not null references platform_modules(id) on delete cascade,
 record_type text not null,
 title text not null,
 status text not null default 'active',
 data jsonb not null default '{}'::jsonb,
 created_by bigint,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists idx_module_records_lookup on module_records(module_id,status,updated_at desc);
