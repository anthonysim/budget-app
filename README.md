# budget-app

YNAB clone to manage personal finances. Zero-based envelope budgeting.

**Stack:** TanStack Start + Router, React, Tailwind v4 + shadcn/ui, Vitest. Supabase (Postgres + Auth) + Drizzle ORM. Hosted on Vercel.

## Prerequisites

- [Node.js](https://nodejs.org) 22+
- [pnpm](https://pnpm.io) 10+ (`npm i -g pnpm`)

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

Stop local Supabase with `pnpm supabase:stop`.

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

## Project layout

```
src/
  routes/        file-based routes (TanStack Router)
  components/ui/ shadcn/ui components (add more: pnpm dlx shadcn@latest add <name>)
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
