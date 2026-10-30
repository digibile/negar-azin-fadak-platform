-- 154: normalized Iranian national-ID lookup for canonical party matching.
-- Non-unique by design: duplicate legacy identities must be detected and reviewed,
-- never hidden by a uniqueness constraint or silently merged.
begin;

create index if not exists accounting_parties_tenant_national_id_normalized_idx
on public.accounting_parties(
 tenant_id,
 (regexp_replace(
   translate(coalesce(national_id,''),'۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩','01234567890123456789'),
   '[^0-9]','','g'
 ))
)
where national_id is not null;

commit;
