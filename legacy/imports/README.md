# Imported source snapshots

This directory contains namespaced, physical source snapshots copied from the Digibile repositories. The source repositories are also preserved as Git submodules under `legacy/source-repositories/`.

## Snapshot status (2026-10-30)

| Source repository | Files copied into this directory | Status |
|---|---:|---|
| `tejarhstore` | 46 | Complete text/source snapshot except sensitive appsettings configuration |
| `vamcity` | 39 | Partial snapshot; automation scripts/workflows and excluded assets/configuration remain in source submodule |
| `digibail` | 29 | Partial snapshot; additional backend, frontend, database, and documentation files remain in source submodule |
| `uminex` | 2 | Complete |
| `aqayevam` | 1 | Complete |
| `sitnela` | 1 | Complete |
| `MASTER-MOTHER-NEGARAZINFAKA` | 0 | Source preserved as submodule; physical snapshot not yet copied |
| `sarajon` | 0 | Source preserved as submodule; physical snapshot not yet copied |
| `negarazin-accounting` | 0 | Source preserved as submodule; repository contains a ZIP archive not yet inspected |

## Safety exclusions

Do not copy environment files, credentials, private keys, database backups/dumps, local database files, archives, build outputs, dependencies, or large binary/media artifacts into this repository. SQL schema and migration source files require review before they are used; importing source code does not authorize running migrations or changing live data.

The original `tejarhstore` appsettings file was excluded because it contains a hard-coded JWT signing key and a database password placeholder. The accounting ZIP is not expanded or committed until its contents have been inspected for backups and secrets.

## Important

These are source-preservation imports, not a production integration. They remain isolated under `legacy/imports/<repository>/` to avoid overwriting the central application. No source snapshot has been declared build-tested or production-ready. Feature-by-feature integration requires dependency, schema, tenancy, authentication, authorization, and duplicate-capability review.
