import { createServerFn } from '@tanstack/react-start'
import { and, asc, eq } from 'drizzle-orm'
import { db } from '#/db'
import { budgetMembers, budgets } from '#/db/schema'
import {
  budgetIdSchema,
  createBudgetSchema,
  renameBudgetSchema,
} from '#/lib/budget-schemas'
import { firstOfMonth } from '#/lib/month'
import { requireBudgetRole } from '#/server/budget-access'
import { requireUser } from '#/server/require-user'

export const listBudgets = createServerFn({ method: 'GET' }).handler(
  async () => {
    const user = await requireUser()
    return db()
      .select({
        id: budgets.id,
        name: budgets.name,
        currency: budgets.currency,
        role: budgetMembers.role,
      })
      .from(budgetMembers)
      .innerJoin(budgets, eq(budgets.id, budgetMembers.budgetId))
      .where(eq(budgetMembers.userId, user.id))
      .orderBy(asc(budgets.createdAt))
  },
)

/** Returns the budget if the caller is a member, otherwise null. */
export const getBudget = createServerFn({ method: 'GET' })
  .validator(budgetIdSchema)
  .handler(async ({ data }) => {
    const user = await requireUser()
    const [row] = await db()
      .select({
        id: budgets.id,
        name: budgets.name,
        currency: budgets.currency,
        dateFormat: budgets.dateFormat,
        firstMonth: budgets.firstMonth,
        role: budgetMembers.role,
      })
      .from(budgetMembers)
      .innerJoin(budgets, eq(budgets.id, budgetMembers.budgetId))
      .where(
        and(
          eq(budgetMembers.budgetId, data.budgetId),
          eq(budgetMembers.userId, user.id),
        ),
      )
      .limit(1)
    return row ?? null
  })

export const createBudget = createServerFn({ method: 'POST' })
  .validator(createBudgetSchema)
  .handler(async ({ data }) => {
    const user = await requireUser()
    const id = await db().transaction(async (tx) => {
      const [budget] = await tx
        .insert(budgets)
        .values({
          name: data.name,
          currency: data.currency,
          firstMonth: firstOfMonth(),
          createdBy: user.id,
        })
        .returning({ id: budgets.id })
      if (!budget) throw new Error('Failed to create budget')
      await tx
        .insert(budgetMembers)
        .values({ budgetId: budget.id, userId: user.id, role: 'owner' })
      return budget.id
    })
    return { id }
  })

export const renameBudget = createServerFn({ method: 'POST' })
  .validator(renameBudgetSchema)
  .handler(async ({ data }) => {
    await requireBudgetRole(data.budgetId, 'owner')
    await db()
      .update(budgets)
      .set({ name: data.name })
      .where(eq(budgets.id, data.budgetId))
  })

export const deleteBudget = createServerFn({ method: 'POST' })
  .validator(budgetIdSchema)
  .handler(async ({ data }) => {
    await requireBudgetRole(data.budgetId, 'owner')
    await db().delete(budgets).where(eq(budgets.id, data.budgetId))
  })
