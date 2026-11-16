import { and, eq, sql } from 'drizzle-orm'
import type { db } from '#/db'
import { payees } from '#/db/schema'

type Executor = Pick<ReturnType<typeof db>, 'select' | 'insert'>

/** Server-only helper: payee id for a name (case-insensitive), creating it if needed. */
export async function findOrCreatePayee(
  tx: Executor,
  budgetId: string,
  rawName: string,
): Promise<string | null> {
  const name = rawName.trim()
  if (name === '') return null
  await tx.insert(payees).values({ budgetId, name }).onConflictDoNothing()
  const [row] = await tx
    .select({ id: payees.id })
    .from(payees)
    .where(
      and(
        eq(payees.budgetId, budgetId),
        sql`lower(${payees.name}) = lower(${name})`,
      ),
    )
    .limit(1)
  return row?.id ?? null
}
