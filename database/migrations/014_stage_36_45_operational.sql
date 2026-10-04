-- Stage 36-45 operational indexes and integrity constraints
create index if not exists idx_employees_department_updated on employees(department,updated_at desc);
create index if not exists idx_projects_status_updated on projects(status,updated_at desc);
create index if not exists idx_report_definitions_updated on report_definitions(updated_at desc);
create index if not exists idx_command_actions_type_updated on command_actions(action_type,updated_at desc);
create index if not exists idx_monitoring_events_severity_time on monitoring_events(severity,occurred_at desc);
create index if not exists idx_audit_events_entity_time on audit_events(entity_type,entity_id,created_at desc);
create index if not exists idx_documents_updated on documents(updated_at desc);
create index if not exists idx_api_clients_updated on api_clients(updated_at desc);
create index if not exists idx_data_sources_type_updated on data_sources(source_type,updated_at desc);
create index if not exists idx_mobile_devices_platform_updated on mobile_devices(platform,updated_at desc);
create index if not exists idx_quality_checks_score on quality_checks(score);

alter table command_actions drop constraint if exists command_actions_action_type_nonempty;
alter table command_actions add constraint command_actions_action_type_nonempty check (length(trim(action_type)) > 0);
alter table monitoring_events drop constraint if exists monitoring_events_severity_nonempty;
alter table monitoring_events add constraint monitoring_events_severity_nonempty check (length(trim(severity)) > 0);
alter table documents drop constraint if exists documents_title_nonempty;
alter table documents add constraint documents_title_nonempty check (length(trim(title)) > 0);
alter table api_clients drop constraint if exists api_clients_name_nonempty;
alter table api_clients add constraint api_clients_name_nonempty check (length(trim(name)) > 0);
alter table data_sources drop constraint if exists data_sources_source_type_nonempty;
alter table data_sources add constraint data_sources_source_type_nonempty check (length(trim(source_type)) > 0);
alter table quality_checks drop constraint if exists quality_checks_score_range;
alter table quality_checks add constraint quality_checks_score_range check (score is null or score >= 0);
