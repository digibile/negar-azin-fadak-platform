-- New lendtech contracts must begin as drafts.
-- Existing contract statuses are intentionally preserved; this changes only the default.
alter table lendtech_contracts
  alter column status set default 'draft';
