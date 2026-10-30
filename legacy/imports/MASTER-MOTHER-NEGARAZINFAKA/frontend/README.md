# پلتفرم بیزینس نگار آذین فدک — وب‌کلاینت

The official Persian, right-to-left web client for the Negar Azin Fadak business operating platform. It is a
React 19 + TypeScript + Vite application that talks to the platform's real API and contains no fixture data
and no fabricated business endpoints.

## Run it

```bash
npm install
npm run dev -- --host 0.0.0.0 --port 5173
```

The API must be running. From the repository root:

```bash
dotnet run --project src/NegarAzinFadak.Api/NegarAzinFadak.Api.csproj --urls http://0.0.0.0:5000
```

Then open `http://localhost:5173`.

```bash
npm run build      # typecheck (tsc --noEmit) then production bundle into dist/
npm run preview    # serve the built bundle
npm run typecheck  # typecheck only
npm test           # vitest: capability classification, live contract, route rendering
npm run capture    # re-record real API responses into test/platform-responses.json
```

`npm test` needs no running API: `test/platform-responses.json` is a recording of what the platform actually
returned, so the contract tests assert against reality rather than against a hand-written mock. Re-record it
with `npm run capture` whenever the API surface changes, and read the diff before committing it — a new route
in that file means the backend changed.

## How it reaches the API

The client calls the API on **its own origin**. Anything under `/api`, `/health` and `/openapi` is proxied
to the API host in development, and in production the two are served behind one reverse proxy. The reason is
not convenience: a cross-origin client would require the platform to allow an arbitrary origin, and this
client has no reason to ask for that.

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_API_BASE_URL` | empty (same origin) | Absolute API origin. Set only when the API is on a different host, which then requires that host to allow this origin. |
| `VITE_DEV_API_PROXY` | `http://127.0.0.1:5000` | Development only: where the dev server proxies the platform paths. |
| `VITE_DEV_PORT` | `5173` | Development only: the dev-server port. |
| `VITE_DEV_ALLOWED_HOSTS` | localhost + forwarded-port domains | Comma-separated `Host` values the dev server answers to. |

Copy `.env.example` to `.env.local` to override. `VITE_`-prefixed values are inlined into the bundle, so
none of them may carry a credential. **No token, key or password is committed in this repository, and none
is defaulted in code.**

### Why `VITE_DEV_ALLOWED_HOSTS` exists

Vite answers `403` to a `Host` it does not recognise, on purpose: it stops a DNS-rebinding page from
reaching the dev server through a browser on the same network. A forwarded remote-development port breaks
that assumption, because the browser sends the forwarding domain as `Host`. The default list admits those
domains; set the variable to a single hostname to narrow it back down.

## What the screens show

The client renders only what the platform actually exposes. A module with no endpoint is a **named gap**,
not a table of invented rows: `FeatureGap` states the exact routes and permissions the module will need and
lists what is live in that area today. Invented rows are worse than an empty screen, because they stop being
distinguishable from real records the moment they leave the browser.

| Screen | Source |
| --- | --- |
| `/` | Public home, live `ping` / `live` / `ready` probes |
| `/modules` | The navigation model with each module's status |
| `/status` | Direct probe of every public platform endpoint |
| `/login` | Token entry. The platform exposes no token-issuing endpoint, so there is no username/password form: the field accepts an already-issued platform token and the client proves it by calling `GET /api/v1/me`. A rejected token is discarded. |
| `/management/dashboard` | `ping`, health, `me`, `me/permissions`, organization units, `roles`, `permissions`, tenant configuration, `audit` |
| `/management/operations` | Write forms for the operations the platform really exposes (tenant lifecycle, units, roles, permission grants and publishes, tenant configuration) |
| `/management/users` | `identity.user.read`; named gap until a user list route exists |
| `/management/customers`, `/management/sellers`, `/management/marketplace`, `/management/*-portal` | Named gaps: no catalogue, order, payment or seller/customer entity route exists, and the screens say so with the exact contracts they would need |
| `/management/landtech` | Named gap; no landtech route exists |

`src/features/catalog/modules.tsx` is the single navigation model. It drives the home grid, the sidebar and
each gap's route list, so a module cannot appear in one place and be missing from another. `availability` is
**not** a hand-set flag: it is computed by matching each declared read and write against the contract the
platform serves at runtime, so a module turns `partial` or `connected` the moment its routes ship, and can
never claim to be connected while its endpoints are absent. Health probes are held separately from the
versioned document, because `/health/live` and `/health/ready` are not published in it.

### The six request states

Every panel that calls the platform renders one of these, through `RequestBoundary` and the `failure` value
returned by `usePlatformCall`. A screen that silently shows nothing is a bug.

| State | When |
| --- | --- |
| `loading` | The request is in flight. |
| `ready` | The request succeeded, with or without rows. |
| `empty` | The request succeeded and the platform genuinely has no records. Distinct from `ready`. |
| `unauthorized` | `401`: no token, or a token the platform rejected. The session is cleared. |
| `forbidden` | `403`: a valid token without the required permission. The missing permission is named. |
| `error` / `offline` | `5xx` and a problem body, versus the platform being unreachable at all. |

## Conventions

* **Feature-based folders.** `src/features/<area>/`, with `src/lib` for the API client, session, formatting
  and hooks, and `src/components` for surfaces shared across features.
* **Typed API client.** `src/lib/http/platform.ts` is the only module that knows a wire shape.
  `src/lib/http/client.ts` owns transport: it attaches the bearer token, reads the RFC 7807 problem body and
  clears the session on a `401`. Feature code branches on `error.code`, never on a description, which the
  platform changes and withholds for server-side failures.
* **Failures are values.** `ApiError` carries the status, the problem body and the `X-Correlation-Id`, and
  `TransportError` distinguishes "the platform said no" from "the platform was not reachable".
* **Session scope.** A token lives in `sessionStorage` for the tab only. It is never written to a file and
  never bundled.
* **RTL.** `<html lang="fa" dir="rtl">`, and every stylesheet uses logical properties
  (`margin-inline-start`, `inset-inline-end`, `border-block-end`). No physical side property appears, so the
  layout has no mirrored variant to drift out of sync.
* **No `any` in feature code**, and `strict`, `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`
  are on.

## Branding

The product is **پلتفرم بیزینس نگار آذین فدک**; the management surface is **مرکز مدیریت نگار آذین فدک**. Both
live in `src/lib/brand.ts`. No superseded product name and no legacy branding appears anywhere in this
client.
