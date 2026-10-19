-- 140: preserve product variant options in the durable local reference catalog.
-- Variants are source snapshots, not claims of owned physical inventory.
alter table catalog_reference_products
  add column if not exists variants jsonb not null default '[]'::jsonb;
