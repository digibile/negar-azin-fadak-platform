create unique index if not exists uq_notification_outbox_delivery
 on notification_outbox(notification_id,channel)
 where notification_id is not null;

create index if not exists idx_notification_outbox_claim
 on notification_outbox(status,available_at,created_at);

create index if not exists idx_platform_notifications_delivery
 on platform_notifications(tenant_id,status,created_at desc);

alter table notification_outbox
 add column if not exists locked_at timestamptz;

alter table notification_outbox
 add column if not exists locked_by text;
