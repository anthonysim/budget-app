import {
  bigint,
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
    memo: text('memo'),
    cleared: clearedStatus('cleared').notNull().default('uncleared'),
    approved: boolean('approved').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    foreignKey({
      columns: [t.budgetId, t.accountId],
      foreignColumns: [accounts.budgetId, accounts.id],
      name: 'transactions_account_budget_fk',
    }).onDelete('cascade'),
  ],
).enableRLS()
