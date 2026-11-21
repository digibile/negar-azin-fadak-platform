-- 167: flag statement running-balance inconsistencies for human review.
begin;

alter table treasury_bank_transactions
 add column if not exists balance_anomaly boolean not null default false,
 add column if not exists balance_anomaly_reason text;

create index if not exists ix_treasury_bank_transaction_balance_anomaly
 on treasury_bank_transactions(tenant_id,bank_account_id,balance_anomaly)
 where balance_anomaly=true;

commit;
