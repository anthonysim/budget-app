# budget-app

YNAB clone to manage personal finances. Zero-based envelope budgeting.

**Stack:** TanStack Start + Router, React, Tailwind v4 + shadcn/ui, Vitest. Supabase (Postgres + Auth) + Drizzle ORM. Hosted on Vercel.

## Prerequisites

- [Node.js](https://nodejs.org) 22+
- [pnpm](https://pnpm.io) 10+ (`npm i -g pnpm`)
- [Docker Desktop](https://www.docker.com/products/docker-desktop) (runs local Supabase; must be open before `pnpm supabase:start`)

## Getting started

```bash
# 1. clone
git clone https://github.com/anthonysim/budget-app.git
cd budget-app

# 2. install deps
pnpm install

# 3. env vars (defaults point at local Supabase)
cp .env.example .env.local

# 4. start local Supabase (needs Docker running)
pnpm supabase:start

# 5. apply DB migrations
pnpm db:migrate

# 6. start dev server
pnpm dev
```

App runs at http://localhost:3000. Check DB wiring: http://localhost:3000/api/health should return `{"ok":true,"db":"up"}`.

### Local Supabase

`pnpm supabase:start` runs a private copy of Supabase on your machine using Docker containers: a Postgres database (port 54322), the auth server, and the API gateway (port 54321). The app talks to it the same way it talks to hosted Supabase; only the URL and keys differ (see `.env.example`).

- No Supabase account needed. Free, works offline, safe to wipe and rebuild.
- First start downloads Docker images (a few minutes). Later starts take seconds.
- Data persists in a Docker volume between `supabase:stop` and `supabase:start`.
- Fully separate from any hosted/production project. Nothing syncs between them.
- Stop it with `pnpm supabase:stop` to free RAM. Reset the DB with `pnpm exec supabase db reset`, then `pnpm db:migrate`.

### Auth

Email + password and magic-link sign in via Supabase Auth. Routes: `/login`, `/signup`, `/auth/callback`; everything under `src/routes/_authed/` requires a session (`/budget` for now). Server functions that touch user data must call `requireUser()` from `src/server/require-user.ts`.

Local emails (magic links, confirmations) are not really sent. Open the inbox at http://127.0.0.1:54324.

Hosted Supabase: in the dashboard under Authentication > URL Configuration, set the Site URL to your Vercel domain and add `https://<your-domain>/auth/callback` to Redirect URLs.

### Database workflow

Schema lives in `src/db/schema/*.ts` (Drizzle). After changing it:

```bash
pnpm db:generate   # writes SQL migration to drizzle/
pnpm db:migrate    # applies it
```

Hosted Supabase: set `DATABASE_URL` to the Supavisor **transaction pooler** URL (port 6543). The Drizzle client already uses `prepare: false` for that.

## Scripts

| Command                         | What it does                            |
| ------------------------------- | --------------------------------------- |
| `pnpm dev`                      | Dev server on port 3000                 |
| `pnpm build`                    | Production build (output in `.output/`) |
| `pnpm preview`                  | Serve the production build locally      |
| `pnpm typecheck`                | TypeScript check                        |
| `pnpm lint`                     | ESLint                                  |
| `pnpm check`                    | Prettier check                          |
| `pnpm format`                   | Prettier write + ESLint fix             |
| `pnpm test`                     | Run Vitest once                         |
| `pnpm test:watch`               | Vitest watch mode                       |
| `pnpm db:generate`              | Generate SQL migration from schema      |
| `pnpm db:migrate`               | Apply migrations                        |
| `pnpm supabase:start` / `:stop` | Local Supabase (Docker)                 |

Before opening a PR, run: `pnpm build && pnpm typecheck && pnpm lint && pnpm check && pnpm test` (same as CI).

## Budget math

Pure functions in `src/domain/budget-math.ts` (unit tested in `budget-math.test.ts`); all amounts are integer milliunits.

- **Available** = carried-in + assigned + activity. Positive Available rolls to next month; negative resets to 0.
- **Overspending** is "credit" up to what was spent on credit accounts that month, the rest is "cash". Only cash overspending reduces Ready to Assign, starting the next month. Credit overspending becomes card debt (credit card payment categories, a later PR).
- **Ready to Assign** (month) = income through that month - assigned through that month - cash overspending of earlier months.
- **Targets** (`src/domain/targets.ts`): needed for spending (weekly, monthly, yearly or once; _set aside_ each cycle or _refill up to_), have a balance (optionally by a date), or fund every month (also used for monthly debt payments). The monthly need spreads a shortfall over the months left, rounded up. _Underfunded_ = needed this month minus assigned.
- **Auto-assign** quick actions: Underfunded, Assigned/Spent last month, Average assigned/spent (3 months), Reset. Each is one undoable step.
- Assigned cells accept expressions relative to the current value: `+50`, `-20`, `*2`, `/2`, `100+25`.

## Scheduled transactions and the cron job

Scheduled transactions are entered as real (uncleared) transactions when they come due:

- **Lazily**: whenever a budget is opened, anything due up to yesterday (UTC) is entered.
- **Daily cron** (`vercel.json`, 08:00 UTC): `GET /api/cron/scheduled` enters everything due today for all budgets.
  It requires `Authorization: Bearer $CRON_SECRET`; Vercel sends this automatically when the `CRON_SECRET`
  env var is set. Generate a long random value, add it under Settings > Environment Variables (Production),
  and never commit it. Without it the endpoint returns 503.

## Reports

Reports page: Net worth and Age of Money tiles, spending breakdown (by category, category group or payee), income vs expense by month, net worth over time, and Age of Money over time. One filter row (date range presets or custom, account, spending dimension) scopes everything; the URL holds the filters. Every chart has a Table view.

- Math is pure and tested in `src/domain/reports.ts`. Age of Money is FIFO: each spend uses the oldest unspent dollars; the figure is the dollar-weighted average age of the last 10 spends (cash movements in on-budget asset accounts; transfers between them are ignored except card payments).
- Charts are small hand-written SVG components in `src/components/reports/` (no chart library). Colors are the validated blue/orange pair defined as `--viz-*` tokens in `src/styles.css` (light and dark).
- Starting balances are not counted as income.

## Importing transactions

Account page > **Import** accepts CSV, OFX and QFX. Files are parsed in the browser (`src/lib/import/`); only parsed rows are sent.

- CSV: a column mapping step (date column and format, payee, memo, one signed amount column or separate outflow/inflow columns, optional sign flip). The mapping is remembered per account.
- Duplicates are skipped using a per-account import id (the bank's id for OFX, otherwise amount + date + occurrence).
- A bank row that matches a transaction you entered by hand (same amount, date within 10 days) is matched to it instead of duplicated.
- New transactions arrive **cleared but unapproved**; approve them one by one, in bulk, or with **Approve all**.
- **Payee rules** (sidebar): rename a bank payee (contains, starts with, exactly) and set a default category. First matching rule wins.

## Adding shadcn/ui components

```bash
pnpm dlx shadcn@latest add <name>
```

After adding, check that new files import `cn` from `#/lib/utils`. shadcn has wrongly generated `import { cn } from 'cn'` (an unrelated npm package) here before; if you see that, rewrite the import and `pnpm remove cn`.

## Project layout

```
src/
  routes/        file-based routes (TanStack Router)
  components/ui/ shadcn/ui components (add more: pnpm dlx shadcn@latest add <name>)
  components/layout/ app shell: sidebar, top bar, user menu
  db/            Drizzle client + schema
  server/        server functions (from PR 3)
  lib/           helpers (money.ts, env.server.ts, supabase/ clients)
supabase/        local Supabase config
drizzle/         generated SQL migrations
  styles.css     Tailwind + theme tokens
```

Money is stored as integer **milliunits** ($1.00 = 1000). Never use floats for amounts. See `src/lib/money.ts`.

## Deploy (Vercel)

1. Import the repo at [vercel.com/new](https://vercel.com/new).
2. Keep detected **TanStack Start** framework settings (`vercel.json` pins it).
3. Add env vars from `.env.example` under **Settings > Environment Variables** (once needed).
4. Deploy. Every PR gets a preview URL.

Variables prefixed `VITE_` ship to the browser. Keep secrets unprefixed (server-only).

## Learn more

- [TanStack Start](https://tanstack.com/start) · [Router](https://tanstack.com/router) · [Query](https://tanstack.com/query)
- [shadcn/ui](https://ui.shadcn.com) · [Tailwind CSS](https://tailwindcss.com)
