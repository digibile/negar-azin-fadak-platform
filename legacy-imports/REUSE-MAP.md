# Legacy repository reuse and consolidation map

This document records the first-pass integration decisions for the preserved source snapshots. A preserved snapshot is not an active runtime, and a UI preview is not evidence of a working business process.

## Canonical platform rules

- The active application and shared domain model live in this repository.
- The canonical organization/tenant boundary is retained. Every registry and relationship must be tenant-scoped.
- `accounting_parties` is the shared party identity. Operational registries remain in their own tables and link to it through nullable `party_id` until reconciled.
- Identity matching uses normalized national ID within the same tenant. Name-only matching is prohibited. Ambiguous matches are rejected; manual links require evidence, explicit confirmation, and an audit event.
- The database-backed `menu_items` tree is the only runtime menu source. Frontend arrays and source-project menu configurations are reference material, not additional menu engines.
- Existing platform API routes, permission checks, CSRF handling, audit events, and migrations are the integration boundary. Legacy credentials, environment files, and deployment workflows must not be copied into active runtime configuration.

## Source-by-source decisions

| Source snapshot | Reusable areas | Existing canonical destination | Do not merge blindly |
|---|---|---|---|
| `digibail` | OTP/CAPTCHA and security-flow references; contract and lending-domain rules; legacy loan-product and customer data schemas | IAM/security, LendTech, document governance, central audit | `digibail_prod` is not the central database. Raw legacy database imports are archival staging, not normalized production migration. Kavenegar delivery requires real credentials; OCR currently has an explicit unavailable-provider response. |
| `sarajon` | C# tenancy, security, OCR, operations and virtual-card source for domain review | Central IAM, tenancy, OCR worker, operations and payments | Do not run its install scripts or create a parallel identity/menu/database stack. Review and port domain logic only after API and model mapping. |
| `vamcity` | Loan application rules, SQL Server inventory, migration manifest, backup inspection and reconciliation tooling | LendTech contract/application/repayment workflows, with a separate VamCity portal boundary where required | SQL Server-to-MariaDB scripts are not PostgreSQL migrations. Keep the original VamCity data source and backups intact until a table-by-table mapping, row-count reconciliation, FK validation and rollback plan are approved. |
| `negarazin-accounting` archive | Visual references, page composition ideas, table/form patterns, theme concepts and Persian UI copy | Existing Accounting/Finance, Customer 360, Sales, Purchasing, Marketplace, Identity and Documents workspaces | Its README explicitly describes a UI-only preview with mock/static data and no real backend, database, authorization or business logic. Its mock API client and approximate date formatter must not enter production. |

## Shared concepts and consolidation status

| Shared concept | Canonical implementation | Current state |
|---|---|---|
| Organization and tenant scope | Central tenant context and tenant-scoped database keys | Existing platform foundation; legacy implementations remain reference-only |
| User identity, roles and permissions | Central IAM workspace and identity API | Unified workspace; no parallel legacy security workspace |
| Navigation | Database menu tree served by `/api/dashboard/menu-tree` | Admin dashboard and sidebar read the backend tree; legacy hardcoded menu registry removed |
| Customer/party identity | `accounting_parties` plus `ensureCanonicalParty` | Shared resolver used by Sales, Purchasing, payment merchants and marketplace sellers |
| Customer and supplier registries | `sales_partners`, `purchase_suppliers` | Separate operational records linked to canonical party; no destructive row merge |
| Payment merchants and marketplace sellers | `payment_merchants`, `sellers` | Separate operational records linked to canonical party |
| Legacy party reconciliation | Accounting Finance > registry reconciliation | Exact normalized national-ID match or evidence-backed manual review; ambiguous identity matches fail closed |
| Finance and accounting | Accounting Finance workspace and central ledger/treasury APIs | Existing destination retained; no frontend financial calculation introduced |
| Lending and repayments | Central LendTech modules and repayment workflow | Legacy rules are inputs for mapping, not a second live loan engine |
| Documents and OCR | Central document governance and Persian OCR worker | Legacy OCR code requires provider/accuracy review before reuse |
| Storefront and marketplace | Sookar marketplace and shared catalog/cart APIs | Keep public storefront separate from admin product/catalog management |

## Accounting preview: reuse boundary

The accounting archive includes a React/Vite UI with shared-looking components such as `DataTable`, `PageHeader`, `EntityListPage`, form controls, navigation and theme tokens. However, the accompanying API client simulates latency and CRUD against local arrays; the preview's date helper labels itself approximate and demo-only. The central platform already uses Next.js, its own shared token package, a same-origin API client and live module workspaces. Therefore:

1. Reuse the preview as a visual/interaction reference.
2. Port only a component or pattern when the central platform has a demonstrated gap.
3. Rebuild it against the canonical API and current permission model.
4. Never copy mock records, fake CRUD, demo date calculations or the preview's hardcoded navigation into runtime code.

## Verification and release boundary

- Source snapshots are preserved under `legacy-imports/repositories/`; the accounting ZIP is preserved under `legacy-imports/_archives/`.
- Snapshot file count at the current integration head: 345 files across the four imported source trees.
- Integration work is on the review branch and PR #124. It is not merged.
- CI build/test results are separate from production deployment. Production deployment remains approval-gated.
- No live production database has been rewritten by this consolidation work.
