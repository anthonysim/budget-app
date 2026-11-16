import { createServerFn } from '@tanstack/react-start'
import { and, asc, eq, inArray, isNull, ne, sql } from 'drizzle-orm'
import { db } from '#/db'
import { accounts, payeeRules, payees, transactions } from '#/db/schema'
import { assignImportIds } from '#/lib/import/map'
import { matchImported } from '#/lib/import/match'
import { applyPayeeRules } from '#/lib/import/rules'
import {
  approveTransactionsSchema,
  importTransactionsSchema,
  payeeRuleRefSchema,
  payeeRuleSchema,
  updatePayeeRuleSchema,
} from '#/lib/import/schemas'
import type { ImportResult } from '#/lib/import/schemas'
import { budgetIdSchema } from '#/lib/budget-schemas'
import { requireBudgetRole } from '#/server/budget-access'
import { queryCategoryGroups } from '#/server/categories-query'
import { getAccount, insertTransaction } from '#/server/transaction-writes'

/**
 * Imports parsed bank rows into an account.
 * - rows already imported (same import id) are skipped
 * - rows matching a manually entered transaction (same amount, date within 10 days) are matched
 *   to it instead of duplicated
 * - the rest are created as cleared but UNAPPROVED, after applying payee rules / category memory
 */
export const importTransactions = createServerFn({ method: 'POST' })
  .validator(importTransactionsSchema)
  .handler(async ({ data }): Promise<ImportResult> => {
    await requireBudgetRole(data.budgetId, 'editor')
    return db().transaction(async (tx) => {
      const account = await getAccount(tx, data.budgetId, data.accountId)
      const rows = data.rows
      const importIds = assignImportIds(rows)

      const known = await tx
        .select({ importId: transactions.importId })
        .from(transactions)
        .where(
          and(
            eq(transactions.accountId, account.id),
            inArray(transactions.importId, importIds),
          ),
        )
      const knownIds = new Set(known.map((k) => k.importId))
      const fresh = rows
        .map((row, index) => ({ row, index, importId: importIds[index] ?? '' }))
        .filter((r) => !knownIds.has(r.importId))

      const candidates = await tx
        .select({
          id: transactions.id,
          date: transactions.date,
          amount: transactions.amount,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.accountId, account.id),
            eq(transactions.budgetId, data.budgetId),
            isNull(transactions.importId),
            ne(transactions.cleared, 'reconciled'),
          ),
        )
      const matches = matchImported(
        fresh.map((f) => f.row),
        candidates,
      )

      const result: ImportResult = {
        total: rows.length,
        duplicates: rows.length - fresh.length,
        matched: matches.size,
        created: fresh.length - matches.size,
      }
      if (data.dryRun) return result

      // matched: confirm the hand-entered transaction with the bank's id
      for (const [freshIndex, transactionId] of matches) {
        const f = fresh[freshIndex]
        if (!f) continue
        await tx
          .update(transactions)
          .set({ importId: f.importId, approved: true, cleared: 'cleared' })
          .where(eq(transactions.id, transactionId))
      }

      const rules = await tx
        .select({
          matchType: payeeRules.matchType,
          pattern: payeeRules.pattern,
          payeeName: payeeRules.payeeName,
          categoryId: payeeRules.categoryId,
        })
        .from(payeeRules)
        .where(eq(payeeRules.budgetId, data.budgetId))
        .orderBy(asc(payeeRules.sort), asc(payeeRules.createdAt))

      const toCreate = fresh.filter((_, i) => !matches.has(i))
      const named = toCreate.map((f) => ({
        ...f,
        ...applyPayeeRules(f.row.payee, rules),
      }))

      // category memory: the last category used with each payee name
      const names = [
        ...new Set(named.map((n) => n.payeeName.toLowerCase())),
      ].filter(Boolean)
      const memory = new Map<string, string>()
      if (names.length > 0) {
        const rowsForNames = await tx
          .select({ name: payees.name, last: payees.lastCategoryId })
          .from(payees)
          .where(
            and(
              eq(payees.budgetId, data.budgetId),
              sql`lower(${payees.name}) in ${names}`,
            ),
          )
        for (const p of rowsForNames) {
          if (p.last) memory.set(p.name.toLowerCase(), p.last)
        }
      }

      for (const n of named) {
        const categoryId = account.onBudget
          ? (n.categoryId ?? memory.get(n.payeeName.toLowerCase()) ?? null)
          : null
        await insertTransaction(
          tx,
          {
            budgetId: data.budgetId,
            accountId: account.id,
            date: n.row.date,
            payeeName: n.payeeName,
            categoryId,
            transferAccountId: null,
            memo: n.row.memo || null,
            amount: n.row.amount,
            cleared: 'cleared',
          },
          { approved: false, importId: n.importId },
        )
      }

      if (data.saveMapping) {
        await tx
          .update(accounts)
          .set({ importMapping: data.saveMapping })
          .where(eq(accounts.id, account.id))
      }
      return result
    })
  })

export const approveTransactions = createServerFn({ method: 'POST' })
  .validator(approveTransactionsSchema)
  .handler(async ({ data }) => {
    await requireBudgetRole(data.budgetId, 'editor')
    await db()
      .update(transactions)
      .set({ approved: true })
      .where(
        and(
          eq(transactions.budgetId, data.budgetId),
          eq(transactions.approved, false),
          data.transactionIds
            ? inArray(transactions.id, data.transactionIds)
            : undefined,
          data.accountId
            ? eq(transactions.accountId, data.accountId)
            : undefined,
        ),
      )
  })

// ---- payee rules --------------------------------------------------------------------------

export const loadPayeeRules = createServerFn({ method: 'GET' })
  .validator(budgetIdSchema)
  .handler(async ({ data }) => {
    await requireBudgetRole(data.budgetId, 'viewer')
    const [rules, categoryGroups] = await Promise.all([
      db()
        .select({
          id: payeeRules.id,
          matchType: payeeRules.matchType,
          pattern: payeeRules.pattern,
          payeeName: payeeRules.payeeName,
          categoryId: payeeRules.categoryId,
        })
        .from(payeeRules)
        .where(eq(payeeRules.budgetId, data.budgetId))
        .orderBy(asc(payeeRules.sort), asc(payeeRules.createdAt)),
      queryCategoryGroups(data.budgetId),
    ])
    return { rules, categoryGroups }
  })

export const createPayeeRule = createServerFn({ method: 'POST' })
  .validator(payeeRuleSchema)
  .handler(async ({ data }) => {
    await requireBudgetRole(data.budgetId, 'editor')
    const [row] = await db()
      .select({ next: sql<number>`coalesce(max(${payeeRules.sort}), -1) + 1` })
      .from(payeeRules)
      .where(eq(payeeRules.budgetId, data.budgetId))
    await db()
      .insert(payeeRules)
      .values({
        budgetId: data.budgetId,
        matchType: data.matchType,
        pattern: data.pattern,
        payeeName: data.payeeName,
        categoryId: data.categoryId,
        sort: row?.next ?? 0,
      })
  })

export const updatePayeeRule = createServerFn({ method: 'POST' })
  .validator(updatePayeeRuleSchema)
  .handler(async ({ data }) => {
    await requireBudgetRole(data.budgetId, 'editor')
    await db()
      .update(payeeRules)
      .set({
        matchType: data.matchType,
        pattern: data.pattern,
        payeeName: data.payeeName,
        categoryId: data.categoryId,
      })
      .where(
        and(
          eq(payeeRules.id, data.ruleId),
          eq(payeeRules.budgetId, data.budgetId),
        ),
      )
  })

export const deletePayeeRule = createServerFn({ method: 'POST' })
  .validator(payeeRuleRefSchema)
  .handler(async ({ data }) => {
    await requireBudgetRole(data.budgetId, 'editor')
    await db()
      .delete(payeeRules)
      .where(
        and(
          eq(payeeRules.id, data.ruleId),
          eq(payeeRules.budgetId, data.budgetId),
        ),
      )
  })
