import {
  bigint,
  date,
  foreignKey,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import { accounts } from './accounts'

export const scheduleFrequency = pgEnum('schedule_frequency', [
  'once',
  'daily',
  'weekly',
  'biweekly',
  'twice_monthly',
  'monthly',
  'bimonthly',
  'quarterly',
  'semiannual',
  'yearly',
])

/** A recurring (or one-off) transaction template. Entered as real transactions when due. */
export const scheduledTransactions = pgTable(
  'scheduled_transactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    budgetId: uuid('budget_id').notNull(),
    accountId: uuid('account_id').notNull(),
    /** The next date this will be entered. */
    nextDate: date('next_date', { mode: 'string' }).notNull(),
    frequency: scheduleFrequency('frequency').notNull(),
    /** Original day-of-month so month-end schedules do not drift (Jan 31 -> Feb 28 -> Mar 31). */
    anchorDay: integer('anchor_day').notNull(),
    endDate: date('end_date', { mode: 'string' }),
    payeeId: uuid('payee_id'),
    categoryId: uuid('category_id'),
    transferAccountId: uuid('transfer_account_id'),
    memo: text('memo'),
    amount: bigint('amount', { mode: 'number' }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    foreignKey({
      columns: [t.budgetId, t.accountId],
      foreignColumns: [accounts.budgetId, accounts.id],
      name: 'scheduled_account_budget_fk',
    }).onDelete('cascade'),
  ],
).enableRLS()
