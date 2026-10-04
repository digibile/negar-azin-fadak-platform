-- Remove legacy flat core entries after the canonical hierarchy is present.
delete from menu_items
where path in ('/organization','/finance','/credit','/commerce');

update menu_items
set title='مرکز مدیریت نگار آذین فدک'
where path='/';

