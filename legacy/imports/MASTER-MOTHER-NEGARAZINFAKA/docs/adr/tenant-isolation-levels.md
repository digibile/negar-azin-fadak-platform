# Tenant isolation stops at the organization

**Status:** Known gap, deliberately not implemented yet
**Affects:** `NegarAzinFadakDbContext` global query filter, `TenantScopeInterceptor`

## What the filter does today

`TenantIsolationFilter` resolves the **organization only**. Every `ITenantScoped` entity carries a single
indexed `OrganizationId` shadow column, the global query filter admits a row when that column equals the
caller's organization, and an unresolved session sees every tenant. This covers `User`,
`UserRoleAssignment`, `IdentityDocument`, `DigitalFolder`, `UserEvent`, and the `OrganizationalUnit`
hierarchy (`Organization`, `Company`, `Brand`, `Branch`, `Store`).

`TenantScopeInterceptor` stamps the column from the session that writes, falling back to the aggregate's
own organization for unscoped background work. A write whose aggregate names a foreign organization is
therefore attributed to the writer, not to the organization it claims — quarantined rather than escalated.

## The gap

`TenantScope` carries five coordinates, and `TenantScope.Includes` defines the narrowing rules: at every
level the caller actually holds, the row must sit in that same level. Nothing implements them.

Consequently a session scoped to a company, brand, branch or store still reads **the whole organization**.
A branch manager sees every company; a store terminal sees the entire organization. `WithCompany`,
`WithBranch` and `WithStore` exist on the scope and have **zero call sites outside tests**.

A second consequence, in the other direction: once a narrowed session is issued, a row written earlier by
an organization-level session carries no company coordinate, so a company-scoped caller would not see it.
Narrowing the filter is therefore a behaviour change that must land together with a decision about
organization-level data, not on its own.

## Why it is not fixed yet

The filter is a global query filter on every tenant-owned table, with no call-site opt-in: a change here
alters every read in the system silently. It is a schema change as well, adding four indexed columns per
tenant table, and the repository has no EF migrations yet, so there is no baseline to diff against.

Today no production code issues a narrowed session, so the gap costs nothing observable. That makes it a
scheduled item rather than an emergency.

## What to do when this is picked up

1. Decide whether the levels are enforced as extra predicates on one `TenantScope` column, or as separate
   shadow columns. Separate columns are indexable and translatable; a member access on the converted
   `TenantScope` value object is not translatable at all, so do not filter through `entity.Scope.*`.
2. Decide how organization-level data is attributed, so shared parent records stay readable.
3. Generate the first EF migrations for SQLite and PostgreSQL **before** changing the schema, so the
   column addition is reviewable as a diff.
4. Add a test per level asserting that a narrowed caller cannot read a sibling at that level, alongside
   the existing organization-level isolation tests.
