-- Stage 28-35 operational indexes and integrity constraints
create index if not exists idx_office_documents_type_updated on office_documents(document_type,updated_at desc);
create index if not exists idx_digital_binders_owner_updated on digital_binders(owner_ref,updated_at desc);
create index if not exists idx_web_domains_status_updated on web_domains(status,updated_at desc);
create index if not exists idx_managed_pages_updated on managed_pages(updated_at desc);
create index if not exists idx_managed_forms_updated on managed_forms(updated_at desc);
create index if not exists idx_content_entries_updated on content_entries(updated_at desc);
create index if not exists idx_ai_requests_type_updated on ai_requests(request_type,updated_at desc);
create index if not exists idx_employees_department_updated on employees(department,updated_at desc);
create index if not exists idx_projects_status_updated on projects(status,updated_at desc);
create index if not exists idx_report_definitions_updated on report_definitions(updated_at desc);
alter table office_documents drop constraint if exists office_documents_document_type_nonempty;
alter table office_documents add constraint office_documents_document_type_nonempty check (length(trim(document_type)) > 0);
alter table web_domains drop constraint if exists web_domains_domain_nonempty;
alter table web_domains add constraint web_domains_domain_nonempty check (length(trim(domain)) > 0);
alter table employees drop constraint if exists employees_personnel_nonempty;
alter table employees add constraint employees_personnel_nonempty check (length(trim(personnel_no)) > 0);
alter table projects drop constraint if exists projects_status_nonempty;
alter table projects add constraint projects_status_nonempty check (length(trim(status)) > 0);
