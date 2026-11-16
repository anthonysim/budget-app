import { createServerFn } from '@tanstack/react-start'
import { and, eq, inArray, sql } from 'drizzle-orm'
import { db } from '#/db'
import { categories, monthAssignments, monthNotes } from '#/db/schema'
import {
  loadBudgetMonthSchema,
  moveMoneySchema,
  saveMonthNoteSchema,
  setAssignmentsSchema,
} from '#/lib/budget-month'
import { requireBudgetRole } from '#/server/budget-access'
import type { Db } from '#/server/db-types'
import { queryBudgetMonth } from '#/server/budget-month-query'

export const loadBudgetMonth = createServerFn({ method: 'GET' })
  .validator(loadBudgetMonthSchema)
  .handler(async ({ data }) => {
    await requireBudgetRole(data.budgetId, 'viewer')
    return queryBudgetMonth(data.budgetId, data.month)
  })

/** The categories must belong to the budget and must not be the system Inflow category
 * (credit card payment categories are allowed). */
async function assertAssignable(
  tx: Pick<Db, 'select'>,
  budgetId: string,
  categoryIds: Array<string>,
) {
  const unique = [...new Set(categoryIds)]
  const rows = await tx
    .select({ id: categories.id })
    .from(categories)
    .where(
      and(
        eq(categories.budgetId, budgetId),
        inArray(categories.id, unique),
        sql`${categories.systemKind} is distinct from 'inflow'`,
      ),
    )
  if (rows.length !== unique.length) throw new Error('Not found')
}

/** Sets absolute assigned amounts (edits, undo and redo). */
export const setAssignments = createServerFn({ method: 'POST' })
  .validator(setAssignmentsSchema)
  .handler(async ({ data }) => {
    await requireBudgetRole(data.budgetId, 'editor')
    await db().transaction(async (tx) => {
      await assertAssignable(
        tx,
        data.budgetId,
        data.changes.map((c) => c.categoryId),
      )
      for (const c of data.changes) {
        await tx
          .insert(monthAssignments)
          .values({
            budgetId: data.budgetId,
            categoryId: c.categoryId,
            month: c.month,
            assigned: c.assigned,
          })
          .onConflictDoUpdate({
            target: [monthAssignments.categoryId, monthAssignments.month],
            set: { assigned: c.assigned, updatedAt: sql`now()` },
          })
      }
    })
  })

/** Moves money between categories using atomic increments (no read-modify-write race). */
export const moveMoney = createServerFn({ method: 'POST' })
  .validator(moveMoneySchema)
  .handler(async ({ data }) => {
    await requireBudgetRole(data.budgetId, 'editor')
    await db().transaction(async (tx) => {
      await assertAssignable(tx, data.budgetId, [
        data.fromCategoryId,
        data.toCategoryId,
      ])
      for (const [categoryId, delta] of [
        [data.fromCategoryId, -data.amount],
        [data.toCategoryId, data.amount],
      ] as const) {
        await tx
          .insert(monthAssignments)
          .values({
            budgetId: data.budgetId,
            categoryId,
            month: data.month,
            assigned: delta,
          })
          .onConflictDoUpdate({
            target: [monthAssignments.categoryId, monthAssignments.month],
            set: {
              assigned: sql`${monthAssignments.assigned} + ${delta}`,
              updatedAt: sql`now()`,
            },
          })
      }
    })
  })

/** Saves (or clears, when empty) the note for a budget month. */
export const saveMonthNote = createServerFn({ method: 'POST' })
  .validator(saveMonthNoteSchema)
  .handler(async ({ data }) => {
    await requireBudgetRole(data.budgetId, 'editor')
    if (data.note === '') {
      await db()
        .delete(monthNotes)
        .where(
          and(
            eq(monthNotes.budgetId, data.budgetId),
            eq(monthNotes.month, data.month),
          ),
        )
      return
    }
    await db()
      .insert(monthNotes)
      .values({ budgetId: data.budgetId, month: data.month, note: data.note })
      .onConflictDoUpdate({
        target: [monthNotes.budgetId, monthNotes.month],
        set: { note: data.note, updatedAt: sql`now()` },
      })
  })
