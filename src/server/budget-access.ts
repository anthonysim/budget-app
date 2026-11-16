import { and, eq } from 'drizzle-orm'
import { db } from '#/db'
import { budgetMembers } from '#/db/schema'
import { hasRole } from '#/lib/roles'
import type { BudgetRole } from '#/lib/roles'
import { requireUser } from '#/server/require-user'

/**
 * Authorization gate for every budget-scoped server function.
 * The Drizzle connection bypasses RLS, so this check IS the access control on the server;
 * RLS is only a backstop for direct supabase-js access.
 * Throws "Not found" for non-members so budget ids can't be probed.
 */
export async function requireBudgetRole(
  budgetId: string,
  min: BudgetRole = 'viewer',
) {
  const user = await requireUser()
  const [row] = await db()
    .select({ role: budgetMembers.role })
    .from(budgetMembers)
    .where(
      and(
        eq(budgetMembers.budgetId, budgetId),
        eq(budgetMembers.userId, user.id),
      ),
    )
    .limit(1)
  if (!row) throw new Error('Not found')
  if (!hasRole(row.role, min)) throw new Error('Forbidden')
  return { user, role: row.role }
}
