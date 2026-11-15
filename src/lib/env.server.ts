import { z } from 'zod'

const schema = z.object({
  SUPABASE_URL: z.url(),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  DATABASE_URL: z.string().min(1),
})

let cached: z.infer<typeof schema> | undefined

/** Validated server-only env. Throws a readable error if misconfigured. */
export function serverEnv() {
  cached ??= schema.parse(process.env)
  return cached
}
