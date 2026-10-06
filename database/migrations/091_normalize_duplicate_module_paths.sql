-- Normalize duplicate canonical module paths without deleting legacy navigation records.
-- The canonical entry keeps the clean /modules/?code=... route; legacy entries retain
-- their records but receive a deterministic legacy query marker.
begin;

with ranked as (
  select id,path,menu_key,
         row_number() over (
           partition by path
           order by (menu_key is null) desc, id
         ) as rn
  from menu_items
  where is_active=true
    and path like '/modules/?code=%'
),
dupes as (
  select id,
         path || case when position('?' in path)>0 then '&' else '?' end ||
         'legacy=' || replace(coalesce(menu_key,'legacy'),'&','_') as new_path
  from ranked
  where rn>1
)
update menu_items m
set path=d.new_path,updated_at=now()
from dupes d
where m.id=d.id;

commit;
