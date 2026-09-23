# Negar Azin Fadak Platform

Project rules:

- Persian RTL enterprise platform
- No ERP terminology
- Production code only
- No fake API
- PostgreSQL only
- Real authentication
- Real RBAC
- Real migrations

Architecture:

apps/api:
- Node.js backend
- PostgreSQL
- Authentication
- Permission engine

apps/web:
- Next.js
- RTL UI
- Admin center
- Builder interfaces

Never:
- commit secrets
- add node_modules
- use mock business data
