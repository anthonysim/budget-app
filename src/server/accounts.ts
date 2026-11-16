import { createServerFn } from '@tanstack/react-start'
import { and, eq, sql } from 'drizzle-orm'
import { db } from '#/db'
import { accounts, categories, transactions } from '#/db/schema'
import {
  ACCOUNT_TYPE_INFO,
  accountRefSchema,
  createAccountSchema,
  isOnBudgetType,
  reorderAccountsSchema,
  startingBalanceFor,
  updateAccountSchema,
} from '#/lib/accounts'
import { requireBudgetRole } from '#/server/budget-access'
import { queryInflowCategoryId } from '#/server/categories-query'
import { findOrCreatePayee } from '#/server/payees'
import { ensurePaymentCategory } from '#/server/payment-categories'
import { getAccount } from '#/server/transaction-writes'

export const createAccount = createServerFn({ method: 'POST' })
  .validator(createAccountSchema)
  .handler(async ({ data }) => {
    await requireBudgetRole(data.budgetId, 'editor')
    const id = await db().transaction(async (tx) => {
      const [row] = await tx
        .select({ next: sql<number>`coalesce(max(${accounts.sort}), -1) + 1` })
        .from(accounts)
        .where(eq(accounts.budgetId, data.budgetId))
      const [account] = await tx
        .insert(accounts)
        .values({
          budgetId: data.budgetId,
          name: data.name,
          type: data.type,
          onBudget: isOnBudgetType(data.type),
          sort: row?.next ?? 0,
        })
        .returning({ id: accounts.id })
      if (!account) throw new Error('Failed to create account')
      if (data.type === 'credit_card') {
        await ensurePaymentCategory(tx, data.budgetId, account.id, data.name)
      }
      const balance = startingBalanceFor(data.type, data.startingBalance)
      if (balance !== 0) {
        const payeeId = await findOrCreatePayee(
          tx,
          data.budgetId,
          'Starting Balance',
        )
        // on-budget asset balances are income (feed Ready to Assign); debt balances are
        // pre-budget debt and tracking accounts have no categories
        const categoryId =
          isOnBudgetType(data.type) && !ACCOUNT_TYPE_INFO[data.type].debt
            ? await queryInflowCategoryId(data.budgetId)
            : null
        await tx.insert(transactions).values({
          budgetId: data.budgetId,
          accountId: account.id,
          payeeId,
          categoryId,
          date: data.startingDate ?? new Date().toISOString().slice(0, 10),
          amount: balance,
          memo: 'Starting Balance',
          cleared: 'cleared',
        })
      }
      return account.id
    })
    return { id }
  })

export const updateAccount = createServerFn({ method: 'POST' })
  .validator(updateAccountSchema)
  .handler(async ({ data }) => {
    await requireBudgetRole(data.budgetId, 'editor')
    await db().transaction(async (tx) => {
      const account = await getAccount(tx, data.budgetId, data.accountId)
      // APR and minimum payment only make sense for debt accounts
      const debt = ACCOUNT_TYPE_INFO[account.type].debt
      await tx
        .update(accounts)
        .set({
          name: data.name,
          note: data.note || null,
          ...(debt && data.aprBps !== undefined ? { aprBps: data.aprBps } : {}),
          ...(debt && data.minPayment !== undefined
            ? { minPayment: data.minPayment }
            : {}),
        })
        .where(
          and(
            eq(accounts.id, data.accountId),
            eq(accounts.budgetId, data.budgetId),
          ),
        )
      // a credit card's payment category is named after the card
      await tx
        .update(categories)
        .set({ name: data.name })
        .where(
          and(
            eq(categories.budgetId, data.budgetId),
            eq(categories.linkedAccountId, data.accountId),
            eq(categories.systemKind, 'cc_payment'),
          ),
        )
    })
  })

async function setClosed(budgetId: string, accountId: string, closed: boolean) {
  await requireBudgetRole(budgetId, 'editor')
  await db()
    .update(accounts)
    .set({ closed })
    .where(and(eq(accounts.id, accountId), eq(accounts.budgetId, budgetId)))
}

export const closeAccount = createServerFn({ method: 'POST' })
  .validator(accountRefSchema)
  .handler(({ data }) => setClosed(data.budgetId, data.accountId, true))

export const reopenAccount = createServerFn({ method: 'POST' })
  .validator(accountRefSchema)
  .handler(({ data }) => setClosed(data.budgetId, data.accountId, false))

/** Persist a new account order. Ids not in the budget are ignored by the WHERE clause. */
export const reorderAccounts = createServerFn({ method: 'POST' })
  .validator(reorderAccountsSchema)
  .handler(async ({ data }) => {
    await requireBudgetRole(data.budgetId, 'editor')
    await db().transaction(async (tx) => {
      for (const [index, accountId] of data.accountIds.entries()) {
        await tx
          .update(accounts)
          .set({ sort: index })
          .where(
            and(
              eq(accounts.id, accountId),
              eq(accounts.budgetId, data.budgetId),
            ),
          )
      }
    })
  })
