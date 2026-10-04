create table if not exists module_permissions(
 module_id smallint not null references platform_modules(id) on delete cascade,
 permission text not null,
 primary key(module_id,permission)
);

insert into module_permissions(module_id,permission)
select id, 'modules:' || code || ':read' from platform_modules
on conflict do nothing;
