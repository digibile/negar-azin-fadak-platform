begin;
update menu_items set permission=null,updated_at=now()
where menu_key in ('10-domains','11-merchants','12-sellers','13-payments-settlement','14-form-builder','15-menu-builder','16-page-builder','17-frontend-management','18-notifications','19-documents-governance','20-system-settings');
update menu_items set permission='modules:command-center:read',updated_at=now() where menu_key='01-dashboard';
update menu_items set permission='modules:governance:read',updated_at=now() where menu_key='02-organizations';
update menu_items set permission='modules:identity:read',updated_at=now() where menu_key='03-users-access';
update menu_items set permission='modules:customer-360:read',updated_at=now() where menu_key='04-customers-360';
update menu_items set permission='modules:smart-calendar:read',updated_at=now() where menu_key='05-smart-calendar';
update menu_items set permission='modules:business-rules:read',updated_at=now() where menu_key='06-business-rules';
update menu_items set permission='modules:sla:read',updated_at=now() where menu_key='07-sla';
update menu_items set permission='modules:accounting-finance:read',updated_at=now() where menu_key='08-accounting-finance';
commit;