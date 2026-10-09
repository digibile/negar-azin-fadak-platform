alter table users add column if not exists national_id text;

create unique index if not exists users_national_id_unique
  on users (national_id)
  where national_id is not null and national_id <> '';

alter table users add constraint users_national_id_format
  check (national_id is null or national_id = '' or national_id ~ '^[0-9]{10}$') not valid;
