-- Backfill imported source links created before the sync registry was introduced.
insert into catalog_source_links(tenant_id,product_id,source_name,source_product_id,source_sku,source_url,source_currency)
select p.tenant_id,p.id,
       coalesce(p.attributes->>'sourceName','دیجی‌کالا'),
       p.attributes->>'sourceProductId',
       p.sku,
       p.attributes->>'sourceUrl',
       coalesce(p.currency,'IRR')
from products p
where coalesce(p.attributes->>'sourceType','')='reference-import'
  and coalesce(p.attributes->>'sourceProductId','') <> ''
on conflict (tenant_id,source_name,source_product_id) do nothing;
