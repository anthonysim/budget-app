import type { db } from '#/db'

// Type-only module. Server-fn files must not mention `typeof db` themselves: the bundler
// treats that as a reference, keeps the `db` import, and ships the Postgres driver to the browser.

export type Db = ReturnType<typeof db>

export type DbTransaction = Parameters<Parameters<Db['transaction']>[0]>[0]
