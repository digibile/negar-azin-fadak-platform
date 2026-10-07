begin;

update menu_items set permission='modules:09-commerce-stores:read',updated_at=now() where menu_key='09-commerce-stores';
update menu_items set permission='modules:10-domains:read',updated_at=now() where menu_key='10-domains';
update menu_items set permission='modules:11-merchants:read',updated_at=now() where menu_key='11-merchants';
update menu_items set permission='modules:12-sellers:read',updated_at=now() where menu_key='12-sellers';
update menu_items set permission='modules:13-payments-settlement:read',updated_at=now() where menu_key='13-payments-settlement';
update menu_items set permission='modules:14-form-builder:read',updated_at=now() where menu_key='14-form-builder';
update menu_items set permission='modules:15-menu-builder:read',updated_at=now() where menu_key='15-menu-builder';
update menu_items set permission='modules:16-page-builder:read',updated_at=now() where menu_key='16-page-builder';
update menu_items set permission='modules:17-frontend-management:read',updated_at=now() where menu_key='17-frontend-management';
update menu_items set permission='modules:18-notifications:read',updated_at=now() where menu_key='18-notifications';
update menu_items set permission='modules:19-documents-governance:read',updated_at=now() where menu_key='19-documents-governance';
update menu_items set permission='modules:20-system-settings:read',updated_at=now() where menu_key='20-system-settings';

commit;
