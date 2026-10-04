-- Auditable module record lifecycle
alter table module_records add column if not exists updated_by bigint;

create or replace function audit_module_record_change() returns trigger language plpgsql as $$
declare actor text;
begin
 actor:=coalesce((case when tg_op='DELETE' then old.updated_by else new.updated_by end),
                 (case when tg_op='DELETE' then old.created_by else new.created_by end))::text;
 insert into audit_events(event_type,actor_ref,entity_type,entity_id,payload)
 values(
   'module_record.'||lower(tg_op),
   actor,
   'module_record',
   case when tg_op='DELETE' then old.id else new.id end,
   jsonb_build_object(
     'module_id',case when tg_op='DELETE' then old.module_id else new.module_id end,
     'record_type',case when tg_op='DELETE' then old.record_type else new.record_type end,
     'before',case when tg_op='INSERT' then null else to_jsonb(old) end,
     'after',case when tg_op='DELETE' then null else to_jsonb(new) end
   )
 );
 return case when tg_op='DELETE' then old else new end;
end $$;

drop trigger if exists trg_module_records_audit on module_records;
create trigger trg_module_records_audit
after insert or update or delete on module_records
for each row execute function audit_module_record_change();
