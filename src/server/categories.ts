import { createServerFn } from '@tanstack/react-start'
import { and, eq, sql } from 'drizzle-orm'
import { db } from '#/db'
import {
  categories,
  categoryGroups,
  subtransactions,
  transactions,
} from '#/db/schema'
import { budgetIdSchema } from '#/lib/budget-schemas'
import {
  deleteCategorySchema,
  createCategorySchema,
  createGroupSchema,
  groupRefSchema,
  reorderCategoriesSchema,
  reorderGroupsSchema,
  updateCategorySchema,
  updateGroupSchema,
} from '#/lib/categories'
import { requireBudgetRole } from '#/server/budget-access'
import { queryCategoryGroups } from '#/server/categories-query'

export const listCategoryGroups = createServerFn({ method: 'GET' })
  .validator(budgetIdSchema)
  .handler(async ({ data }) => {
    await requireBudgetRole(data.budgetId, 'viewer')
    return queryCategoryGroups(data.budgetId)
  })

export const createCategoryGroup = createServerFn({ method: 'POST' })
  .validator(createGroupSchema)
  .handler(async ({ data }) => {
    await requireBudgetRole(data.budgetId, 'editor')
    const [row] = await db()
      .select({
        next: sql<number>`coalesce(max(${categoryGroups.sort}), -1) + 1`,
      })
      .from(categoryGroups)
      .where(eq(categoryGroups.budgetId, data.budgetId))
    await db()
      .insert(categoryGroups)
      .values({
        budgetId: data.budgetId,
        name: data.name,
        sort: row?.next ?? 0,
      })
  })

export const updateCategoryGroup = createServerFn({ method: 'POST' })
  .validator(updateGroupSchema)
  .handler(async ({ data }) => {
    await requireBudgetRole(data.budgetId, 'editor')
    const set: { name?: string; hidden?: boolean } = {}
    if (data.name !== undefined) set.name = data.name
    if (data.hidden !== undefined) set.hidden = data.hidden
    if (Object.keys(set).length === 0) return
    await db()
      .update(categoryGroups)
      .set(set)
      .where(
        and(
          eq(categoryGroups.id, data.groupId),
          eq(categoryGroups.budgetId, data.budgetId),
          eq(categoryGroups.system, false),
        ),
      )
  })

/** Deletes the group and (via FK cascade) all of its categories. */
export const deleteCategoryGroup = createServerFn({ method: 'POST' })
  .validator(groupRefSchema)
  .handler(async ({ data }) => {
    await requireBudgetRole(data.budgetId, 'editor')
    await db()
      .delete(categoryGroups)
      .where(
        and(
          eq(categoryGroups.id, data.groupId),
          eq(categoryGroups.budgetId, data.budgetId),
          eq(categoryGroups.system, false),
        ),
      )
  })

export const reorderCategoryGroups = createServerFn({ method: 'POST' })
  .validator(reorderGroupsSchema)
  .handler(async ({ data }) => {
    await requireBudgetRole(data.budgetId, 'editor')
    await db().transaction(async (tx) => {
      for (const [index, groupId] of data.groupIds.entries()) {
        await tx
          .update(categoryGroups)
          .set({ sort: index })
          .where(
            and(
              eq(categoryGroups.id, groupId),
              eq(categoryGroups.budgetId, data.budgetId),
              eq(categoryGroups.system, false),
            ),
          )
      }
    })
  })

async function nextCategorySort(groupId: string) {
  const [row] = await db()
    .select({ next: sql<number>`coalesce(max(${categories.sort}), -1) + 1` })
    .from(categories)
    .where(eq(categories.groupId, groupId))
  return row?.next ?? 0
}

export const createCategory = createServerFn({ method: 'POST' })
  .validator(createCategorySchema)
  .handler(async ({ data }) => {
    await requireBudgetRole(data.budgetId, 'editor')
    // the group must belong to this budget and not be a system group
    const [group] = await db()
      .select({ id: categoryGroups.id })
      .from(categoryGroups)
      .where(
        and(
          eq(categoryGroups.id, data.groupId),
          eq(categoryGroups.budgetId, data.budgetId),
          eq(categoryGroups.system, false),
        ),
      )
      .limit(1)
    if (!group) throw new Error('Not found')
    const [created] = await db()
      .insert(categories)
      .values({
        budgetId: data.budgetId,
        groupId: data.groupId,
        name: data.name,
        sort: await nextCategorySort(data.groupId),
      })
      .returning({ id: categories.id })
    if (!created) throw new Error('Could not create category')
    return { id: created.id }
  })

export const updateCategory = createServerFn({ method: 'POST' })
  .validator(updateCategorySchema)
  .handler(async ({ data }) => {
    await requireBudgetRole(data.budgetId, 'editor')
    const set: {
      name?: string
      hidden?: boolean
      groupId?: string
      sort?: number
      note?: string | null
    } = {}
    if (data.name !== undefined) set.name = data.name
    if (data.hidden !== undefined) set.hidden = data.hidden
    if (data.note !== undefined) set.note = data.note || null
    if (data.groupId !== undefined) {
      const [group] = await db()
        .select({ id: categoryGroups.id })
        .from(categoryGroups)
        .where(
          and(
            eq(categoryGroups.id, data.groupId),
            eq(categoryGroups.budgetId, data.budgetId),
            eq(categoryGroups.system, false),
          ),
        )
        .limit(1)
      if (!group) throw new Error('Not found')
      set.groupId = data.groupId
      set.sort = await nextCategorySort(data.groupId)
    }
    if (Object.keys(set).length === 0) return
    await db()
      .update(categories)
      .set(set)
      .where(
        and(
          eq(categories.id, data.categoryId),
          eq(categories.budgetId, data.budgetId),
          sql`${categories.systemKind} is null`,
        ),
      )
  })

export const deleteCategory = createServerFn({ method: 'POST' })
  .validator(deleteCategorySchema)
  .handler(async ({ data }) => {
    await requireBudgetRole(data.budgetId, 'editor')
    if (data.reassignToCategoryId === data.categoryId) {
      throw new Error('Choose a different category')
    }
    await db().transaction(async (tx) => {
      if (data.reassignToCategoryId) {
        // the composite FK rejects a target category from another budget
        await tx
          .update(transactions)
          .set({ categoryId: data.reassignToCategoryId })
          .where(
            and(
              eq(transactions.budgetId, data.budgetId),
              eq(transactions.categoryId, data.categoryId),
            ),
          )
        await tx
          .update(subtransactions)
          .set({ categoryId: data.reassignToCategoryId })
          .where(
            and(
              eq(subtransactions.budgetId, data.budgetId),
              eq(subtransactions.categoryId, data.categoryId),
            ),
          )
      }
      // any remaining references become uncategorized via ON DELETE SET NULL
      await tx
        .delete(categories)
        .where(
          and(
            eq(categories.id, data.categoryId),
            eq(categories.budgetId, data.budgetId),
            sql`${categories.systemKind} is null`,
          ),
        )
    })
  })

export const reorderCategories = createServerFn({ method: 'POST' })
  .validator(reorderCategoriesSchema)
  .handler(async ({ data }) => {
    await requireBudgetRole(data.budgetId, 'editor')
    await db().transaction(async (tx) => {
      for (const [index, categoryId] of data.categoryIds.entries()) {
        await tx
          .update(categories)
          .set({ sort: index })
          .where(
            and(
              eq(categories.id, categoryId),
              eq(categories.groupId, data.groupId),
              eq(categories.budgetId, data.budgetId),
            ),
          )
      }
    })
  })
