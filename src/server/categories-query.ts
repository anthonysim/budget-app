import { asc, eq } from 'drizzle-orm'
import { db } from '#/db'
import { categories, categoryGroups } from '#/db/schema'

// Server-only query helpers (no createServerFn here; see accounts-query.ts for why).

export interface CategoryRow {
  id: string
  name: string
  hidden: boolean
  note: string | null
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
): Promise<Array<CategoryGroupRow>> {
  const [groups, cats] = await Promise.all([
    db()
      .select({
        id: categoryGroups.id,
        name: categoryGroups.name,
        hidden: categoryGroups.hidden,
        system: categoryGroups.system,
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
  ])

  const byGroup = new Map<string, Array<CategoryRow>>()
  for (const { groupId, ...rest } of cats) {
    const list = byGroup.get(groupId) ?? []
    list.push(rest)
    byGroup.set(groupId, list)
  }
  return groups
    .filter((g) => !g.system)
    .map(({ system: _system, ...g }) => ({
      ...g,
      categories: byGroup.get(g.id) ?? [],
    }))
}
