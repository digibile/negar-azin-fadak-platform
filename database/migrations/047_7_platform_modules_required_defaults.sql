-- Compatibility defaults for operational menu module registrations.
-- Existing rows keep their values; only INSERTs that omit these required fields use defaults.
alter table platform_modules
  alter column core set default 'business',
  alter column sort_order set default 0;
