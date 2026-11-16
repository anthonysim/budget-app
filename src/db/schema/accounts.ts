import {
  bigint,
  jsonb,
  boolean,
  date,
  foreignKey,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core'
import type { CsvMapping } from '#/lib/import/map'
import { budgets } from './budgets'

export const accountType = pgEnum('account_type', [
  'checking',
  'savings',
  'cash',
  'credit_card',
  'line_of_credit',
  'asset',
  'liability',
  'mortgage',
  'loan',
])

export const transactionFlag = pgEnum('transaction_flag', [
  'red',
  'orange',
  'yellow',
  'green',
  'blue',
  'purple',
])

export const clearedStatus = pgEnum('cleared_status', [
  'uncleared',
  'cleared',
  'reconciled',
])

export const payees = pgTable(
  'payees',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    budgetId: uuid('budget_id')
      .notNull()
      .references(() => budgets.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    /** Category last used with this payee; pre-fills new transactions. */
    lastCategoryId: uuid('last_category_id'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique('payees_budget_id_id_unique').on(t.budgetId, t.id)],
).enableRLS()

export const accounts = pgTable(
  'accounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    budgetId: uuid('budget_id')
      .notNull()
      .references(() => budgets.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    type: accountType('type').notNull(),
    onBudget: boolean('on_budget').notNull(),
    closed: boolean('closed').notNull().default(false),
    sort: integer('sort').notNull().default(0),
    note: text('note'),
    /** Saved CSV column mapping for imports into this account. */
    importMapping: jsonb('import_mapping').$type<CsvMapping>(),
    /** Debt accounts: annual rate in basis points (1999 = 19.99%) and minimum monthly payment. */
    aprBps: integer('apr_bps'),
    minPayment: bigint('min_payment', { mode: 'number' }),
    lastReconciledAt: timestamp('last_reconciled_at', { withTimezone: true }),
    lastReconciledBalance: bigint('last_reconciled_balance', {
      mode: 'number',
    }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  // lets transactions prove their account belongs to the same budget
  (t) => [unique('accounts_budget_id_id_unique').on(t.budgetId, t.id)],
).enableRLS()

/**
 * Minimal transactions table (PR 6) so account balances are real.
 * PR 8 extends it with payee, category, flags, transfers and splits.
 */
export const transactions = pgTable(
  'transactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    budgetId: uuid('budget_id').notNull(),
    accountId: uuid('account_id').notNull(),
    date: date('date', { mode: 'string' }).notNull(),
    /** Signed milliunits: inflow positive, outflow negative. */
    amount: bigint('amount', { mode: 'number' }).notNull(),
    payeeId: uuid('payee_id'),
    categoryId: uuid('category_id'),
    /** Set on both sides of a transfer; the paired transaction lives in the other account. */
    transferAccountId: uuid('transfer_account_id'),
    transferTransactionId: uuid('transfer_transaction_id'),
    memo: text('memo'),
    cleared: clearedStatus('cleared').notNull().default('uncleared'),
    approved: boolean('approved').notNull().default(true),
    flag: transactionFlag('flag'),
    /** Dedupe key for imported transactions (bank id, or amount+date+occurrence). */
    importId: text('import_id'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique('transactions_budget_id_id_unique').on(t.budgetId, t.id),
    foreignKey({
      columns: [t.budgetId, t.accountId],
      foreignColumns: [accounts.budgetId, accounts.id],
      name: 'transactions_account_budget_fk',
    }).onDelete('cascade'),
  ],
).enableRLS()

/** Lines of a split transaction. The parent keeps the total and has no category itself. */
export const subtransactions = pgTable(
  'subtransactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    budgetId: uuid('budget_id').notNull(),
    transactionId: uuid('transaction_id').notNull(),
    categoryId: uuid('category_id'),
    memo: text('memo'),
    /** Signed milliunits; lines sum to the parent amount. */
    amount: bigint('amount', { mode: 'number' }).notNull(),
    sort: integer('sort').notNull().default(0),
  },
  (t) => [
    foreignKey({
      columns: [t.budgetId, t.transactionId],
      foreignColumns: [transactions.budgetId, transactions.id],
      name: 'subtransactions_transaction_budget_fk',
    }).onDelete('cascade'),
  ],
).enableRLS()
