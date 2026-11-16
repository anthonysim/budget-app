import { and, asc, eq, sql } from 'drizzle-orm'
import { db } from '#/db'
import {
  categories,
  categoryGroups,
  subtransactions,
  transactions,
} from '#/db/schema'

// Server-only query helpers (no createServerFn here; see accounts-query.ts for why).

export interface CategoryRow {
  id: string
  name: string
  hidden: boolean
  note: string | null
  /** Transactions using this category (drives the delete/reassign prompt). */
  transactionCount: number
}

export interface CategoryGroupRow {
  id: string
  name: string
  hidden: boolean
  categories: Array<CategoryRow>
}

/** User-visible groups (system groups excluded) with their categories, in sort order. */
export async function queryCategoryGroups(
  budgetId: string,
  options: { includeCreditCardPayments?: boolean } = {},
): Promise<Array<CategoryGroupRow>> {
  const [groups, cats, usage, splitUsage] = await Promise.all([
    db()
      .select({
        id: categoryGroups.id,
        name: categoryGroups.name,
        hidden: categoryGroups.hidden,
        system: categoryGroups.system,
        systemKind: categoryGroups.systemKind,
      })
      .from(categoryGroups)
      .where(eq(categoryGroups.budgetId, budgetId))
      .orderBy(asc(categoryGroups.sort), asc(categoryGroups.createdAt)),
    db()
      .select({
        id: categories.id,
        groupId: categories.groupId,
        name: categories.name,
        hidden: categories.hidden,
        note: categories.note,
      })
      .from(categories)
      .where(eq(categories.budgetId, budgetId))
      .orderBy(asc(categories.sort), asc(categories.createdAt)),
    db()
      .select({
        categoryId: transactions.categoryId,
        count: sql<number>`count(*)::int`,
      })
      .from(transactions)
      .where(eq(transactions.budgetId, budgetId))
      .groupBy(transactions.categoryId),
    db()
      .select({
        categoryId: subtransactions.categoryId,
        count: sql<number>`count(*)::int`,
      })
      .from(subtransactions)
      .where(eq(subtransactions.budgetId, budgetId))
      .groupBy(subtransactions.categoryId),
  ])
  const counts = new Map<string | null, number>()
  for (const u of [...usage, ...splitUsage]) {
    counts.set(u.categoryId, (counts.get(u.categoryId) ?? 0) + u.count)
  }

  const byGroup = new Map<string, Array<CategoryRow>>()
  for (const { groupId, ...rest } of cats) {
    const list = byGroup.get(groupId) ?? []
    list.push({ ...rest, transactionCount: counts.get(rest.id) ?? 0 })
    byGroup.set(groupId, list)
  }
  return groups
    .filter(
      (g) =>
        !g.system ||
        (options.includeCreditCardPayments &&
          g.systemKind === 'credit_card_payments'),
    )
    .map(({ system: _system, systemKind: _kind, ...g }) => ({
      ...g,
      categories: byGroup.get(g.id) ?? [],
    }))
}

/** The Ready to Assign category id (income category) for a budget. */
export async function queryInflowCategoryId(
  budgetId: string,
): Promise<string | null> {
  const [row] = await db()
    .select({ id: categories.id })
    .from(categories)
    .where(
      and(
        eq(categories.budgetId, budgetId),
        eq(categories.systemKind, 'inflow'),
      ),
    )
    .limit(1)
  return row?.id ?? null
}
