# MASTER-MOTHER-NEGARAZINFAKA

Enterprise business operating platform of Negar Azin Fadak Company.

The backend is an ASP.NET Core 10 modular monolith over PostgreSQL in production and SQLite for local
development and integration tests. `AGENTS.md` is the contract every change must satisfy; this file only
covers how to get it running.

## Prerequisites

- .NET SDK 10
- The EF Core CLI, pinned in `.config/dotnet-tools.json`:

```bash
dotnet tool restore
```

## Build, test, run

```bash
dotnet build NEGARAZINFAKA.slnx -c Debug    # must stay green
dotnet test  NEGARAZINFAKA.slnx -c Debug    # must stay green
dotnet run --project src/NegarAzinFadak.Api  # API on http://localhost:5000
```

## Required configuration

The API validates its configuration at startup and refuses to start when something is missing, rather
than failing later on the first request. In `Development` the database provider, connection string and
migration switch are already set in `appsettings.Development.json`, so a local run only needs the two
secret keys below.

`Security:Secrets:MasterKey` and `Security:Secrets:DigestKey` protect stored secrets and OTP digests.
`Authentication:Jwt:SigningKey` signs and validates access tokens, and must decode to at least 32 bytes.
They must be base64-encoded 16, 24 or 32 byte keys. The platform will not invent them: a generated key
would silently make every protected value and OTP digest unreadable after a restart, which would surface
to real users as unexplained "wrong code" errors. Generate a pair once and keep them:

```bash
openssl rand -base64 32   # Security:Secrets:MasterKey
openssl rand -base64 32   # Security:Secrets:DigestKey
openssl rand -base64 32   # Authentication:Jwt:SigningKey
```

Supply them without committing them, for example:

```bash
dotnet user-secrets --project src/NegarAzinFadak.Api set "Security:Secrets:MasterKey" "<key>"
dotnet user-secrets --project src/NegarAzinFadak.Api set "Security:Secrets:DigestKey" "<key>"
dotnet user-secrets --project src/NegarAzinFadak.Api set "Authentication:Jwt:SigningKey" "<key>"
```

or per run through the environment, where `:` becomes `__`:

```bash
Security__Secrets__MasterKey="<key>" Security__Secrets__DigestKey="<key>" \
  dotnet run --project src/NegarAzinFadak.Api
```

`Database:ConnectionString` works the same way: set it to a PostgreSQL connection string and
`Database:Provider` to `PostgreSql` in any environment other than `Development`.

## SMS delivery

`Sms:Provider` selects how one-time codes are delivered. There is **no default**: a host that has not
chosen a provider refuses to start, so a missing setting can never be mistaken for a working one.

| Provider | Environment | Behaviour |
| --- | --- | --- |
| `Development` | `Development` only | Writes messages to a local inbox file. |
| a real gateway | any | Not yet implemented. |

### Enabling the development SMS sink locally

`appsettings.Development.json` already opts in, so a local run needs no extra configuration. To enable it
explicitly, or to change where messages land:

```json
{
  "Sms": {
    "Provider": "Development",
    "Development": {
      "InboxPath": "App_Data/sms-inbox"
    }
  }
}
```

Read a delivered code from the inbox file:

```bash
cat src/NegarAzinFadak.Api/App_Data/sms-inbox
```

### Why the sink is hard to switch on by accident

The sink receives real one-time codes, so it is guarded three times over:

1. **Selection.** `Sms:Provider` defaults to `Unconfigured`, and an unconfigured host fails to start.
2. **Registration.** Naming `Development` outside the Development environment throws while the container is
   built, before the host can serve a request.
3. **Construction.** The sink's own constructor refuses to be created unless the environment is
   `Development`, so even a composition root that resolved the type directly would fail.

A test covers each guard, including `Production` and `Staging`.

### Codes and logs

The message body exists only to carry a code, and it is **never written to a log**. A log is shipped to an
aggregator, retained for months and readable by far more people than the developer entitled to the code, so
the sink writes the body to the inbox file and nowhere else. Log entries record only that a code was
produced, never its value:

```
Development SMS sink recorded a message for +98*******1234 at /path/inbox. The message body is withheld from logs; code: present (6 characters, value withheld).
```

`OtpLogRedaction` is the shared safety net for the cases where a value reaches a log by accident, such as an
interpolated exception or a future provider logging the message it was handed. It replaces every run of four
or more digits with `***`. Over-redacting a number in a log line costs a little readability; under-redacting
a one-time code costs an account.

The inbox directory (`App_Data/`) is excluded from version control and the file is created owner-only where
the platform supports it.

## Migrations

The schema lives in a migration set per provider, each in its own assembly so the two histories never
collide: `src/NegarAzinFadak.Migrations.Sqlite` and `src/NegarAzinFadak.Migrations.PostgreSQL`. Both sets
are generated from the same model, so a schema-affecting change needs a migration added to both.

```bash
# SQLite (local)
dotnet tool run dotnet-ef migrations add <Name> \
  --project src/NegarAzinFadak.Migrations.Sqlite \
  --startup-project src/NegarAzinFadak.Migrations.Sqlite \
  --output-dir Migrations

# PostgreSQL (production)
dotnet tool run dotnet-ef migrations add <Name> \
  --project src/NegarAzinFadak.Migrations.PostgreSQL \
  --startup-project src/NegarAzinFadak.Migrations.PostgreSQL \
  --output-dir Migrations
```

`Database:MigrateOnStartup` applies pending migrations at startup. It is on in `Development` and off
everywhere else, so that a schema change stays an explicit, reviewable deployment step.

## Endpoints

| Endpoint | Purpose |
| --- | --- |
| `GET /health/live` | Liveness. Never touches the database, so a database outage cannot cause a restart loop. |
| `GET /health/ready` | Readiness. Verifies the database is reachable and the schema is applied. |
| `GET /api/v1/ping` | Versioned route prefix. |
| `GET /api/v1/me` | The caller's resolved identity, tenant scope, roles and permissions. Requires a token. |
| `GET /api/v1/me/permissions` | Requires the `platform.access.administer` permission, to show the gate failing closed. |
| `GET /openapi/v1.json` | OpenAPI document for the current version. |

Every response carries an `X-Correlation-Id` header, echoed from the caller when it is a safe value and
generated otherwise. It is the identifier that ties a caller's report to the platform's logs and audit
records.

Expected business outcomes are returned as RFC 7807 problem responses carrying stable, machine-readable
`errors[].code` values. Clients should branch on `code`, never on the human-readable `description`, which
changes and is withheld for server-side failures.
