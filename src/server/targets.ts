import { createServerFn } from '@tanstack/react-start'
import { and, eq, sql } from 'drizzle-orm'
import { db } from '#/db'
import { categories, categoryTargets } from '#/db/schema'
import { clearTargetSchema, setTargetSchema } from '#/lib/targets'
import { requireBudgetRole } from '#/server/budget-access'

/** Creates or replaces the single target of a category. */
export const setCategoryTarget = createServerFn({ method: 'POST' })
  .validator(setTargetSchema)
  .handler(async ({ data }) => {
    await requireBudgetRole(data.budgetId, 'editor')
    await db().transaction(async (tx) => {
      // targets belong to user categories and credit card payment categories, not the system inflow
      const [category] = await tx
        .select({ id: categories.id })
        .from(categories)
        .where(
          and(
            eq(categories.id, data.categoryId),
            eq(categories.budgetId, data.budgetId),
            sql`${categories.systemKind} is distinct from 'inflow'`,
          ),
        )
        .limit(1)
      if (!category) throw new Error('Not found')

      const values = {
        budgetId: data.budgetId,
        categoryId: data.categoryId,
        type: data.type,
        amount: data.amount,
        repeat: data.type === 'needed_for_spending' ? data.repeat : null,
        dueDate: data.type === 'monthly_funding' ? null : data.dueDate,
        behavior: data.type === 'needed_for_spending' ? data.behavior : null,
      }
      await tx
        .insert(categoryTargets)
        .values(values)
        .onConflictDoUpdate({
          target: categoryTargets.categoryId,
          set: {
            type: values.type,
            amount: values.amount,
            repeat: values.repeat,
            dueDate: values.dueDate,
            behavior: values.behavior,
          },
        })
    })
  })

export const clearCategoryTarget = createServerFn({ method: 'POST' })
  .validator(clearTargetSchema)
  .handler(async ({ data }) => {
    await requireBudgetRole(data.budgetId, 'editor')
    await db()
      .delete(categoryTargets)
      .where(
        and(
          eq(categoryTargets.categoryId, data.categoryId),
          eq(categoryTargets.budgetId, data.budgetId),
        ),
      )
  })
