import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { serverEnv } from '../lib/env.server'
import * as schema from './schema'

let _db: ReturnType<typeof create> | undefined

function create() {
  // prepare: false is required for Supavisor transaction-mode pooling.
  const client = postgres(serverEnv().DATABASE_URL, { prepare: false })
  return drizzle(client, { schema })
}

/** Lazy Drizzle client. Server only. */
export function db() {
  _db ??= create()
  return _db
}
