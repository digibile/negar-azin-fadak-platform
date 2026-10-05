-- Provide a safe default ID for operational menu module registrations.
-- Existing canonical IDs are preserved; new module rows receive the next smallint ID.
create sequence if not exists platform_modules_id_seq as smallint;

select setval(
  'platform_modules_id_seq',
  greatest(coalesce((select max(id) from platform_modules),0)::bigint,0),
  true
);

alter table platform_modules
  alter column id set default nextval('platform_modules_id_seq');
