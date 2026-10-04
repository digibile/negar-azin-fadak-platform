-- Stage 19-27 operational indexes and integrity constraints
create index if not exists idx_commission_rules_rate on commission_rules(rate);
create index if not exists idx_settlements_party_updated on settlements(party_ref,updated_at desc);
create index if not exists idx_payments_method_updated on payments(payment_method,updated_at desc);
create index if not exists idx_service_providers_updated on service_providers(updated_at desc);
create index if not exists idx_messages_recipient_updated on messages(recipient,updated_at desc);
create index if not exists idx_notifications_recipient_type on notifications(recipient_ref,notification_type,updated_at desc);
create index if not exists idx_crm_leads_status_updated on crm_leads(status,updated_at desc);
create index if not exists idx_contact_interactions_contact_updated on contact_interactions(contact_ref,updated_at desc);
create index if not exists idx_support_tickets_priority_updated on support_tickets(priority,updated_at desc);

alter table commission_rules drop constraint if exists commission_rules_rate_range;
alter table commission_rules add constraint commission_rules_rate_range check (rate >= 0);
alter table settlements drop constraint if exists settlements_amount_nonnegative;
alter table settlements add constraint settlements_amount_nonnegative check (amount >= 0);
alter table payments drop constraint if exists payments_amount_nonnegative;
alter table payments add constraint payments_amount_nonnegative check (amount >= 0);
