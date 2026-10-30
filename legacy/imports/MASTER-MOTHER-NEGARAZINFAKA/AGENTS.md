# AGENTS.md — NEGARAZINFAKA

Enterprise business operating platform of **Negar Azin Fadak Company**.

This file is the contract every automated and human agent must follow when touching this repository.

---

## 1. What this repository is (verified state)

NEGARAZINFAKA is organised as a modular monolith first, with explicit seams for later service extraction.

Backend: **ASP.NET Core 10 / C# 14 / EF Core 10**, targeting **PostgreSQL** in production and
**SQLite** for local runs and integration tests.

Frontend: **Next.js (App Router) + React + TypeScript + Tailwind**, Persian-first and RTL-first.

Central rule: **the platform is built around a central identity.** Every business module references the
central `User`/`IdentityProfile`. A module must never create a competing user table for a person that
already exists in the central registry.

---

## 2. Hard rules (violating these is a defect, not a preference)

1. **Never rebuild from scratch.** Extend what exists. Delete nothing that works.
2. **Never create parallel identity systems.** Customers, merchants, representatives, employees and
   internal users all point at the central `User` via profile/role relationships.
3. **Never trust raw OCR.** OCR output is always `PendingVerification`. It becomes master identity data
   only after normalisation → validation → cross-check → user confirmation → verification.
4. **Never expose private documents.** No document bytes in the web root, no public URLs, no static file
   middleware over private storage. Access goes through authorized, audited, expiring endpoints.
5. **Never bypass authorization or tenant isolation.** Every query is tenant-scoped; every identity
   endpoint enforces RBAC + permission + ownership checks.
6. **Never hard-code business configuration.** Tenants, roles, permissions, document types, OCR
   providers, notification channels, credit plans and prices live in data/configuration, not in `if`
   statements.
7. **Never hard-code external providers.** OCR, SMS, storage, AI and identity-verification vendors sit
   behind interfaces (`IOcrProvider`, `ISmsSender`, `IDocumentStorage`, `IIdentityVerificationProvider`,
   `IAiProvider`).
8. **Never claim work that was not verified.** "Implemented" means files changed and the build/tests
   actually ran. "Tested" means the command ran and its real output was observed.
9. **Never commit secrets.** No passwords, tokens, API keys or connection strings. `.env*` is ignored
   except `.env.example`; use `IOptions` + environment/user-secrets.
10. **Never fake production data.** Mock/fake data is allowed only in test and in explicitly marked
    front-end preview fixtures, behind an interface, and never inside business rules.

---

## 3. Repository layout

```
src/
  NegarAzinFadak.Core/            Shared kernel: primitives, results, tenancy, auditing, clock,
                                  paging, messaging, persistence abstractions. No infra deps.
  NegarAzinFadak.Organization.Domain/  Organization → Company → Brand → Branch → Store
  NegarAzinFadak.Identity.Domain/      Central identity: users, profiles, documents, folders, OTP
  NegarAzinFadak.Application/          Use cases + provider abstractions (OCR, SMS, storage, AI, ...)
  NegarAzinFadak.Infrastructure/       EF Core, security, storage, outbox, background processing
  NegarAzinFadak.Api/                  HTTP host: auth, RBAC, versioning, health, OpenAPI
tests/
  NegarAzinFadak.Core.Tests/
  NegarAzinFadak.Organization.Domain.Tests/
  NegarAzinFadak.Identity.Domain.Tests/
  NegarAzinFadak.Application.Tests/
  NegarAzinFadak.Api.Tests/
web/                            Next.js admin + mobile registration client
docs/                           Architecture decision records and module documentation
```

Dependency direction is strictly inward: `Api → Infrastructure → Application → Domain → Core`.
`Core` references nothing but `Microsoft.Extensions.Logging.Abstractions`.

---

## 4. Build, test, run

```bash
dotnet build NEGARAZINFAKA.sln -c Debug          # must stay green
dotnet test  NEGARAZINFAKA.sln -c Debug          # must stay green
dotnet run --project src/NegarAzinFadak.Api      # API on the configured URL (http://localhost:5000)
cd web && npm install && npm run dev              # admin UI (http://localhost:3000)
```

Local development uses SQLite; production uses PostgreSQL. Both providers are referenced and both
migration sets must be generated for schema-affecting changes.

## 5. Definition of done for any change

1. Build passes with warnings-as-errors enabled.
2. New domain logic has unit tests. New use cases have tests for the failure paths that matter
   (duplicate identity, unverified document reuse, tenant boundary, expired document).
3. Anything that reads or writes identity/document data emits audit records.
4. Anything that reads tenant data filters by tenant, and that behaviour is covered by a test.
5. No secrets, no dead code, no commented-out blocks, no `TODO` left in committed code.
6. Commit message follows conventional commits: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`.

## 6. Git discipline

* Inspect `git status` before starting and before committing.
* Stage only intended files. Never `git add -A` on a dirty tree you did not create.
* Do not amend, rebase or force-push shared history.
* Never rewrite history to hide a mistake.

## 7. Style

* C#: file-scoped namespaces, `Guard` for invariants, `Result` for expected business outcomes,
  XML docs on public surface, no comments unless they explain *why*.
* Naming: `NegarAzinFadak.*` namespaces; aggregates named in the ubiquitous language; no `I` suffix
  on domain types; `I` prefix only on abstractions.
* Frontend: feature-based folders, typed API client, no `any` in feature code, RTL-safe logical CSS
  properties only.

## 8. Error handling conventions

Domain/API failures are values (`Error.Code`, `Error.Type`) and map to transport status codes in one
place. Never throw for an expected business outcome. Never leak stack traces or sensitive identity
data in error messages or logs.
