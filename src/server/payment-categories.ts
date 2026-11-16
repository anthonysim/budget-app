import { and, eq, sql } from 'drizzle-orm'
import type { db } from '#/db'
import { categories, categoryGroups } from '#/db/schema'

type Executor = Pick<ReturnType<typeof db>, 'select' | 'insert'>

export const CC_GROUP_NAME = 'Credit Card Payments'
export const CC_GROUP_KIND = 'credit_card_payments'

/**
 * Server-only. Makes sure a credit card has its payment category (inside the system
 * "Credit Card Payments" group, created on first use). Returns the category id.
 */
export async function ensurePaymentCategory(
  tx: Executor,
  budgetId: string,
  accountId: string,
  accountName: string,
): Promise<string> {
  const [existing] = await tx
    .select({ id: categories.id })
    .from(categories)
    .where(
      and(
        eq(categories.budgetId, budgetId),
        eq(categories.linkedAccountId, accountId),
        eq(categories.systemKind, 'cc_payment'),
      ),
    )
    .limit(1)
  if (existing) return existing.id

  let [group] = await tx
    .select({ id: categoryGroups.id })
    .from(categoryGroups)
    .where(
      and(
        eq(categoryGroups.budgetId, budgetId),
        eq(categoryGroups.systemKind, CC_GROUP_KIND),
      ),
    )
    .limit(1)
  if (!group) {
    ;[group] = await tx
      .insert(categoryGroups)
      .values({
        budgetId,
        name: CC_GROUP_NAME,
        sort: 1000,
        system: true,
        systemKind: CC_GROUP_KIND,
      })
      .returning({ id: categoryGroups.id })
  }
  if (!group) throw new Error('Failed to create the Credit Card Payments group')

  const [{ next } = { next: 0 }] = await tx
    .select({ next: sql<number>`coalesce(max(${categories.sort}), -1) + 1` })
    .from(categories)
    .where(eq(categories.groupId, group.id))

  const [created] = await tx
    .insert(categories)
    .values({
      budgetId,
      groupId: group.id,
      name: accountName,
      sort: next,
      systemKind: 'cc_payment',
      linkedAccountId: accountId,
    })
    .returning({ id: categories.id })
  if (!created) throw new Error('Failed to create the payment category')
  return created.id
}

/** payment category id for a card, or null */
export async function findPaymentCategoryId(
  tx: Pick<ReturnType<typeof db>, 'select'>,
  budgetId: string,
  accountId: string,
): Promise<string | null> {
  const [row] = await tx
    .select({ id: categories.id })
    .from(categories)
    .where(
      and(
        eq(categories.budgetId, budgetId),
        eq(categories.linkedAccountId, accountId),
        eq(categories.systemKind, 'cc_payment'),
      ),
    )
    .limit(1)
  return row?.id ?? null
}
