begin;

insert into role_permissions(role,permission) values
  ('admin','modules:12-logistics-supply:read'),
  ('admin','modules:12-logistics-supply:write'),
  ('admin','modules:12-logistics-supply:dispatch'),
  ('admin','modules:12-logistics-supply:track'),
  ('admin','modules:12-logistics-supply:deliver'),
  ('manager','modules:12-logistics-supply:read'),
  ('manager','modules:12-logistics-supply:write'),
  ('manager','modules:12-logistics-supply:dispatch'),
  ('manager','modules:12-logistics-supply:track'),
  ('manager','modules:12-logistics-supply:deliver'),
  ('viewer','modules:12-logistics-supply:read'),
  ('viewer','modules:12-logistics-supply:track')
on conflict do nothing;

commit;
