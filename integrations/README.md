# Imported source catalogue

This directory preserves selected source assets from sibling repositories for consolidation into the canonical TypeScript/Next.js + Express/PostgreSQL platform.

## Import status
- Files are copied as traceable source references. They are not compiled or mounted as a second production backend.
- Canonical runtime remains `apps/web`, `apps/api`, and the existing PostgreSQL migrations.
- No source repository was modified or deleted.
- No production database or server was changed.
- Secrets, environment files, production dumps and personal data must never be copied here.

## MASTER-MOTHER-NEGARAZINFAKA
Copied:
- Navigation permission filtering based on validated tenant and server-side permissions.
- OTP lifecycle: digest-only persistence, delivery throttling and verification rate limits.
- Tenant-scope guard, EF query isolation filter and save interceptor.

Port targets:
- `apps/api/src/dynamic-menu.ts`
- `apps/api/src/identity.ts`
- `apps/api/src/tenant-context.ts`
- authorization and tenant-isolation tests.

Preserve current API contracts and database schema. Do not add a parallel ASP.NET production backend.

## digibail
Copied:
- Safe contract template engine, service layer, module registration and engine tests.
- Engine supports bounded variable substitution, conditional expressions and installment tables; it does not execute arbitrary code.

Port target: existing loan/contract domain and contract workspace. Add tests before exposing contract generation.

## tejarhstore
Copied:
- Product, category, brand, order and cart domain entities.
- Cart service, Zarinpal payment adapter and EF persistence context.

Port targets: existing marketplace catalog/order/checkout and payment-provider abstraction. Do not create a second product/order schema.

## vamcity
Copied SQL Server-to-MariaDB migration reference guide only. It is not an instruction to run a migration; confirm canonical DB and data mapping before any migration.

## negarazin-accounting
Original ZIP retained at `source-archives/negarazin-accounting-files-3.zip`. Its contents have not yet been extracted or validated. Treat as untrusted input until isolated extraction, malware/secrets scan and inventory. No executable code is wired into the app.

## Next integration gate
1. Extract and inspect the accounting archive in an isolated workspace.
2. Port useful C# domain logic into existing TypeScript boundaries with tests and migrations.
3. Compare accounting entities and reports against current accounting, ledger, wallet-ledger and accounting-finance modules before adding anything.
4. Run unit, integration, migration and production-build tests.
5. Deploy only through the manual Sookar.ir workflow after verification.
