-- 125: inspected marketplace returns can restock only accepted quantities.
begin;

create unique index if not exists marketplace_return_requests_tenant_id_uq
  on marketplace_return_requests(tenant_id,id);
create unique index if not exists inventory_documents_tenant_id_uq
  on inventory_documents(tenant_id,id);

alter table marketplace_return_requests
  add column if not exists received_quantity numeric(20,3) not null default 0 check(received_quantity>=0);
alter table marketplace_return_requests
  add column if not exists restock_quantity numeric(20,3) not null default 0 check(restock_quantity>=0 and restock_quantity<=received_quantity);
alter table marketplace_return_requests
  add column if not exists inspection_notes text,
  add column if not exists inspection_result text check(inspection_result in ('restocked','partial','non_restockable')),
  add column if not exists inspection_warehouse_id uuid,
  add column if not exists inventory_receipt_document_id uuid;

alter table marketplace_return_requests
  add constraint marketplace_return_inspection_warehouse_fk
    foreign key(tenant_id,inspection_warehouse_id)
    references inventory_warehouses(tenant_id,id) on delete restrict,
  add constraint marketplace_return_receipt_document_fk
    foreign key(tenant_id,inventory_receipt_document_id)
    references inventory_documents(tenant_id,id) on delete restrict;

create unique index if not exists marketplace_return_receipt_document_uq
  on marketplace_return_requests(tenant_id,inventory_receipt_document_id)
  where inventory_receipt_document_id is not null;

commit;
