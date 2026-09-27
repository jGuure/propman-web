# IL Software PropManagement — Web

Next.js frontend for [`ilsoftware-propman-api`](../ilsoftware-propman-api).

- **Phase 0**: company registration, tenant sign-in and account flows, users, organization settings, profile, and
  the platform admin area.
- **Phase 1**: portfolio dashboard, properties (table / cards), the **property explorer**, apartments list with
  filters, apartment drawer and page (status changes, history, rooms, photos), a wizard to add many apartments
  with live preview, and amenities settings.

- **Phase 2a**: residents and leases — a residents page (search by name/phone/ID, current / former / archived),
  resident pages with their lease history, a leases list, and on every apartment a **Tenancy** section: rent out
  (to an existing or a new resident), the current and next lease with household members and deposit, edit,
  record the move-out (settling a held deposit), cancel an upcoming lease, and switch between renting the whole
  apartment or room by room. The apartment status follows its leases; the building drawing shows the resident and
  "rented / bedrooms" for room-by-room apartments. API: `ilsoftware-propman-api/docs/phase2a-residents-leases.md`.
- **Phase 2b**: rent collection — a **Collect rent** page per month (expected / collected / outstanding / to check,
  one-tap *Paid* with EVC Plus, Zaad, eDahab, cash or bank, other amounts, *Not paid* for the month-end check), a
  rent account per lease (bills, payments, reverse a mistake), "Owes $x" / "Paid until …" on every lease card and a
  rent card on the dashboard. API: `ilsoftware-propman-api/README.md` ("Rent collection").
- **Somalia focus**: English and Somali (switcher in the header and on sign-in pages), all amounts in US dollars,
  and apartments that can be rented are shown as **Available** (the API status is still `VACANT`).

Names in the app: a **flat** is a building/block of a property, an **apartment** is a rentable unit (flat, shop,
office), and **rooms** describe an apartment. The API calls them `building`, `unit` and `room`.

### The property explorer (`/properties/[id]`)

- The flats are drawn as buildings side by side: floors from the top floor down to the basements, apartments as
  boxes colored by status (an orange dot means no rooms described yet). The status legend highlights one status;
  the search box finds an apartment.
- Clicking a flat or an apartment opens the side panel (a bottom sheet on phones), and the selection is in the
  URL (`?flat=…&apt=…`) with a breadcrumb *Properties › Property › Flat › Apartment*:
  - **property**: address, map and description (cut to two lines), flats with occupancy, shared amenities, photo thumbnails;
  - **flat**: status breakdown, add one/many apartments to it, its shared amenities (plus those inherited from
    the property), edit/archive;
  - **apartment**: status change, rent, bed/bath/size, rooms as small chips, own amenities (plus a count of those
    shared by the flat and property), photo thumbnails; archive sits in the ⋯ menu. An apartment without
    rooms offers "Same rooms as …" buttons (same type, same flat first, one per distinct layout) that copy a
    layout in one click; nothing is overwritten because the apartment is empty.
  The panels stay short: rooms and photos are managed in a window (*Manage*: add, edit, reorder rooms; upload,
  order, cover, delete photos).
- A set-up checklist (details, flats, apartments, rooms, amenities, photos) shows until the property is complete,
  each missing step one click away. A *List* toggle switches the drawing to the apartments table.

Stack: Next.js 16 (App Router, Turbopack), React 19, TypeScript, Ant Design 6, TanStack Query, dayjs,
browser-image-compression, Vitest.

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
"Invite user"; accountants and staff see the portfolio read-only), and the API enforces the same rules. Unit
status changes only offer what `GET /meta/enums` returns in `myStatusTransitions` for the user's role (staff:
maintenance only), so the transition rules live in one place, the API.

**Filters in the URL**: list pages (properties, units, property tabs) keep filters, sorting and paging in the
query string (`src/lib/url-state.ts`), so refresh, back/forward and shared links keep the view.

**Image uploads**: every image goes through `src/lib/compressImage.ts` before upload (logo, property and unit
photos, and future modules): resized to 1600 px (logos 512 px), re-encoded to WebP at quality 0.8 in a web worker
(which also drops EXIF data such as GPS location), and rejected in the browser if still over 1 MB. The API's
1 MB limit (`ilsoftware.storage.max-file-size`) remains the source of truth.

**Errors**: API errors carry a stable `code`. In English the server's message is shown; in Somali the translation
of the code (`errors.<CODE>` in the dictionaries). Forms show field errors next to the fields (the API sends those
in English).

**Languages** (`src/i18n/`): `en.ts` is the reference dictionary and `so.ts` must have the same keys (TypeScript
and `i18n.test.ts` check keys and `{placeholders}`). Components use `const { t, tn } = useT()`:
`t("explorer.addFlat")`, `t("apartments.formEdit", { number })`, `tn("count.apartments", 3)` for plurals; labels of
statuses, types, roles and floors come from `useLabels()` (`src/lib/labels.ts`). Code outside React (formatters,
error messages) uses `translate(getCurrentLang(), key)`. The choice is stored in the `propman_lang` cookie (shared
by all subdomains in production) and read by the root layout, so the first render is already in the right language.
Dates use a Somali dayjs locale; Ant Design's own texts (date pickers, pagination) stay English because antd has no
Somali locale. The platform admin area is English only. Names your team types (properties, amenities, rooms) are
shown as entered. **The Somali texts are a first draft: have a native speaker review `so.ts`.**

**Currency**: the platform works in US dollars only. `formatMoney()` always formats USD, forms show a `$` prefix
and send `currency: "USD"`, and the organization currency is fixed to USD.

## Layout

```
src/
  proxy.ts                  host-based routing
  app/
    (site)/                 root site: landing page, registration
    tenant/                 tenant subdomains
      (auth)/               login, forgot/reset password, accept invite, welcome
      (app)/                signed-in area: dashboard, properties (+ [id], [id]/bulk), units (+ [id]),
                            residents (+ [id]), leases, users, settings/organization, settings/amenities, profile
    admin/                  platform admin: login, tenants, tenant details
  components/               shared UI (AppShell, AuthCard, tags, tenant gate, user form)
    payments/               rent collection: payment window, rent account drawer, account line
    leases/                 residents and leases: tenancy section, lease card, rent-out form, move-out, resident form
    portfolio/              property/flat/apartment forms, apartments table, apartment drawer + details,
                            rooms editor, photo gallery, amenity editor, status modal
      explorer/             property explorer: building drawing, side panel, set-up checklist
  i18n/                     en.ts / so.ts dictionaries, useT(), LanguageSwitcher
  lib/
    api/                    client, errors, typed endpoints, types
    auth/                   session storage, tenant and platform session contexts
    config.ts, host.ts, forms.ts, format.ts, reference-data.ts, theme.ts
    compressImage.ts        shared image compression for all uploads
    labels.ts               useLabels() (translated types/statuses/floors), status colors; Somali city suggestions
    portfolio-hooks.ts      enums, amenities and portfolio permissions
    url-state.ts            filters and paging in the query string
```

## Adding a page to the tenant app

1. Create `src/app/tenant/(app)/<name>/page.tsx` (client component). It is served at `/<name>` on every tenant host
   and is already behind sign-in.
2. Add endpoints to `src/lib/api/tenant-api.ts` and types to `src/lib/api/types.ts`.
3. Use TanStack Query (`useQuery` / `useMutation`) with `useTenant().api`; show errors with `errorMessage()` and
   `applyFieldErrors()`.
4. Add a menu entry in `src/app/tenant/(app)/layout.tsx`, guarded by a permission if needed.

## Not included yet

Photo reordering is done with arrow buttons (no drag and drop yet). An httpOnly-cookie session (tokens are in `localStorage`;
consider a backend-for-frontend before handling payments), and end-to-end browser tests.
