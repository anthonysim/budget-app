import { defineConfig } from 'drizzle-kit'

// Load .env.local for local dev; CI/prod provide DATABASE_URL directly.
try {
  process.loadEnvFile('.env.local')
} catch {
  // no .env.local, rely on the real environment
}

export default defineConfig({
  schema: './src/db/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
})
