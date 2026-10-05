-- Platform update permission for management-panel controlled deployments
insert into role_permissions(role, permission)
select 'admin', 'platform:update'
where not exists (select 1 from role_permissions where role='admin' and permission='platform:update');

insert into role_permissions(role, permission)
select 'manager', 'platform:update'
where not exists (select 1 from role_permissions where role='manager' and permission='platform:update');
