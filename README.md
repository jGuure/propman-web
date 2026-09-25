# IL Software PropManagement — Web

Next.js frontend for [`ilsoftware-propman-api`](../ilsoftware-propman-api). Phase 0: company registration,
tenant sign-in and account flows, dashboard, users, organization settings, profile, and the platform admin area.

Stack: Next.js 16 (App Router, Turbopack), React 19, TypeScript, Ant Design 6, TanStack Query, dayjs, Vitest.

## Getting started

Prerequisites: Node.js 20.9+ and the API running (see the API README).

```bash
npm install
cp .env.example .env.local   # adjust if your API or ports differ
npm run dev
```

| Area | URL (default port 3000) |
|---|---|
| Root site: landing page, registration | http://localhost:3000 |
| A tenant, e.g. Demo Properties | http://demo.localhost:3000 |
| Platform admin | http://admin.localhost:3000 |

Browsers resolve `*.localhost` to your machine, so no `/etc/hosts` changes are needed. Use the dev seed logins
from the API README (e.g. `owner@demo.so / Password123` on `demo`, `admin@ilsoftware.so / Admin12345` on admin).

If port 3000 is taken, Next.js picks another port (e.g. 3001). The URLs in `.env.local` **and** the API's
`FRONTEND_TENANT_URL`, `FRONTEND_ROOT_URL` and `CORS_ORIGIN_PATTERNS` must then use that port too, otherwise the
browser blocks API calls and email links point to the wrong place.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / server (stop `npm run dev` first: both use `.next/`) |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript |
| `npm test` | Unit tests (Vitest) |

### Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8080/api/v1` | API base URL |
| `NEXT_PUBLIC_BASE_DOMAIN` | `localhost` | Tenants are `<slug>.<base domain>`, platform admin is `admin.<base domain>` (prod: `propman.so`) |
| `NEXT_PUBLIC_ROOT_URL` | `http://localhost:3000` | Root site |
| `NEXT_PUBLIC_TENANT_URL_TEMPLATE` | `http://{slug}.localhost:3000` | Tenant URL (`{slug}` is replaced) |
| `NEXT_PUBLIC_ADMIN_URL` | `http://admin.localhost:3000` | Platform admin |

`NEXT_PUBLIC_*` values are compiled into the bundle: rebuild after changing them.

## How it works

**One app, three hosts.** `src/proxy.ts` (Next.js 16's replacement for middleware) looks at the host and rewrites
the request so every area keeps clean URLs:

| Host | Browser URL | Route file |
|---|---|---|
| `localhost` | `/register` | `src/app/(site)/register` |
| `demo.localhost` | `/users` | `src/app/tenant/(app)/users` |
| `admin.localhost` | `/tenants` | `src/app/admin/(app)/tenants` |

For tenant hosts the proxy also passes the slug in the `x-propman-tenant` request header; the tenant layout reads
it and provides it to the pages. `/tenant/*` and `/admin/*` are not reachable directly from the root host.

**API client** (`src/lib/api/client.ts`): JSON in/out, adds `X-Tenant` and the bearer token, turns Problem Details
into `ApiError` (with `code` and field errors, which forms show next to the fields), and refreshes the access
token transparently — shortly before it expires or after a 401, with a single refresh shared by concurrent
requests. If the refresh token is rejected the session ends and the user goes back to the sign-in page.

**Sessions** are kept in `localStorage`, which is per origin: every tenant subdomain and the admin area have
separate sessions, matching the API's rule that a token only works on its own tenant. After registering on the
root site, the new owner is sent to `https://<slug>…/welcome#token=<refresh token>`; the fragment never reaches a
server, and the token is exchanged (and rotated) immediately.

**Permissions** come from `GET /auth/me`: the menu and actions follow them (e.g. only owners see
"Invite user"), and the API enforces the same rules.

## Layout

```
src/
  proxy.ts                  host-based routing
  app/
    (site)/                 root site: landing page, registration
    tenant/                 tenant subdomains
      (auth)/               login, forgot/reset password, accept invite, welcome
      (app)/                signed-in area: dashboard, users, settings/organization, profile
    admin/                  platform admin: login, tenants, tenant details
  components/               shared UI (AppShell, AuthCard, tags, tenant gate, user form)
  lib/
    api/                    client, errors, typed endpoints, types
    auth/                   session storage, tenant and platform session contexts
    config.ts, host.ts, forms.ts, format.ts, reference-data.ts, theme.ts
```

## Adding a page to the tenant app

1. Create `src/app/tenant/(app)/<name>/page.tsx` (client component). It is served at `/<name>` on every tenant host
   and is already behind sign-in.
2. Add endpoints to `src/lib/api/tenant-api.ts` and types to `src/lib/api/types.ts`.
3. Use TanStack Query (`useQuery` / `useMutation`) with `useTenant().api`; show errors with `errorMessage()` and
   `applyFieldErrors()`.
4. Add a menu entry in `src/app/tenant/(app)/layout.tsx`, guarded by a permission if needed.

## Not included yet

Somali translations (text is English and inline), an httpOnly-cookie session (tokens are in `localStorage`;
consider a backend-for-frontend before handling payments), and end-to-end browser tests.
