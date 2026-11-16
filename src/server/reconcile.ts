import { createServerFn } from '@tanstack/react-start'
import { and, eq, sql } from 'drizzle-orm'
import { db } from '#/db'
import { accounts, transactions } from '#/db/schema'
import { ACCOUNT_TYPE_INFO, reconcileAccountSchema } from '#/lib/accounts'
import { reconcileDifference } from '#/lib/splits'
import { requireBudgetRole } from '#/server/budget-access'
import { queryInflowCategoryId } from '#/server/categories-query'
import { findOrCreatePayee } from '#/server/payees'

export const ADJUSTMENT_PAYEE = 'Reconciliation Balance Adjustment'

/**
 * Locks every cleared transaction in the account as reconciled. If the bank balance differs from
 * the cleared balance, an adjustment transaction is created first (only when asked to).
 */
export const reconcileAccount = createServerFn({ method: 'POST' })
  .validator(reconcileAccountSchema)
  .handler(async ({ data }) => {
    await requireBudgetRole(data.budgetId, 'editor')
    return db().transaction(async (tx) => {
      const [account] = await tx
        .select({
          id: accounts.id,
          type: accounts.type,
          onBudget: accounts.onBudget,
        })
        .from(accounts)
        .where(
          and(
            eq(accounts.id, data.accountId),
            eq(accounts.budgetId, data.budgetId),
          ),
        )
        .limit(1)
      if (!account) throw new Error('Not found')

      const [row] = await tx
        .select({
          cleared: sql<number>`coalesce(sum(${transactions.amount}), 0)::float8`,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.accountId, data.accountId),
            eq(transactions.budgetId, data.budgetId),
            sql`${transactions.cleared} in ('cleared', 'reconciled')`,
          ),
        )
      const difference = reconcileDifference(
        data.bankBalance,
        row?.cleared ?? 0,
      )

      if (difference !== 0) {
        if (!data.createAdjustment) throw new Error('Balances differ')
        const payeeId = await findOrCreatePayee(
          tx,
          data.budgetId,
          ADJUSTMENT_PAYEE,
        )
        // a positive adjustment on a normal on-budget account is found money (Ready to Assign)
        const categoryId =
          difference > 0 &&
          account.onBudget &&
          !ACCOUNT_TYPE_INFO[account.type].debt
            ? await queryInflowCategoryId(data.budgetId)
            : null
        await tx.insert(transactions).values({
          budgetId: data.budgetId,
          accountId: data.accountId,
          date: data.adjustmentDate ?? new Date().toISOString().slice(0, 10),
          amount: difference,
          cleared: 'cleared',
          payeeId,
          categoryId,
        })
      }

      const locked = await tx
        .update(transactions)
        .set({ cleared: 'reconciled' })
        .where(
          and(
            eq(transactions.accountId, data.accountId),
            eq(transactions.budgetId, data.budgetId),
            eq(transactions.cleared, 'cleared'),
          ),
        )
        .returning({ id: transactions.id })

      await tx
        .update(accounts)
        .set({
          lastReconciledAt: sql`now()`,
          lastReconciledBalance: data.bankBalance,
        })
        .where(eq(accounts.id, data.accountId))

      return { adjustment: difference, reconciledCount: locked.length }
    })
  })
