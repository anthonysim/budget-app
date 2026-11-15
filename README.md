# budget-app

YNAB clone to manage personal finances. Zero-based envelope budgeting.

**Stack:** TanStack Start + Router, React, Tailwind v4 + shadcn/ui, Vitest. Supabase (Postgres + Auth) and Drizzle land in upcoming PRs. Hosted on Vercel.

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

# 3. (optional for now) env vars
cp .env.example .env.local

# 4. start dev server
pnpm dev
```

App runs at http://localhost:3000.

> Env vars are not required yet. Supabase keys are needed starting with the Supabase PR.

## Scripts

| Command           | What it does                            |
| ----------------- | --------------------------------------- |
| `pnpm dev`        | Dev server on port 3000                 |
| `pnpm build`      | Production build (output in `.output/`) |
| `pnpm preview`    | Serve the production build locally      |
| `pnpm typecheck`  | TypeScript check                        |
| `pnpm lint`       | ESLint                                  |
| `pnpm check`      | Prettier check                          |
| `pnpm format`     | Prettier write + ESLint fix             |
| `pnpm test`       | Run Vitest once                         |
| `pnpm test:watch` | Vitest watch mode                       |

Before opening a PR, run: `pnpm build && pnpm typecheck && pnpm lint && pnpm check && pnpm test` (same as CI).

## Project layout

```
src/
  routes/        file-based routes (TanStack Router)
  components/ui/ shadcn/ui components (add more: pnpm dlx shadcn@latest add <name>)
  lib/           shared helpers (money.ts = milliunit math)
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
