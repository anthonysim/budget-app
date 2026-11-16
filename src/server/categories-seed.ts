import type { db } from '#/db'
import { categories, categoryGroups } from '#/db/schema'
import {
  DEFAULT_CATEGORY_GROUPS,
  INFLOW_CATEGORY_NAME,
  INFLOW_GROUP_NAME,
} from '#/lib/default-categories'

export type DbTransaction = Parameters<
  Parameters<ReturnType<typeof db>['transaction']>[0]
>[0]

/** Creates the hidden Inflow group + the default groups/categories for a new budget. */
export async function seedDefaultCategories(
  tx: DbTransaction,
  budgetId: string,
) {
  const [inflow] = await tx
    .insert(categoryGroups)
    .values({
      budgetId,
      name: INFLOW_GROUP_NAME,
      sort: -1,
      hidden: true,
      system: true,
    })
    .returning({ id: categoryGroups.id })
  if (!inflow) throw new Error('Failed to seed categories')
  await tx.insert(categories).values({
    budgetId,
    groupId: inflow.id,
    name: INFLOW_CATEGORY_NAME,
    systemKind: 'inflow',
  })

  for (const [gi, group] of DEFAULT_CATEGORY_GROUPS.entries()) {
    const [row] = await tx
      .insert(categoryGroups)
      .values({ budgetId, name: group.name, sort: gi })
      .returning({ id: categoryGroups.id })
    if (!row) throw new Error('Failed to seed categories')
    await tx.insert(categories).values(
      group.categories.map((name, ci) => ({
        budgetId,
        groupId: row.id,
        name,
        sort: ci,
      })),
    )
  }
}
