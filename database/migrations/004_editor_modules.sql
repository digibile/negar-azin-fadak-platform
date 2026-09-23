alter table form_definitions add column if not exists module_key text not null default 'core';
alter table page_definitions add column if not exists module_key text not null default 'core';
create index if not exists idx_form_module on form_definitions(module_key);
create index if not exists idx_page_module on page_definitions(module_key);
