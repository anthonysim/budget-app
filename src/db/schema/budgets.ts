import {
  date,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

export const budgetRole = pgEnum('budget_role', ['owner', 'editor', 'viewer'])

export const budgets = pgTable('budgets', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  currency: text('currency').notNull().default('USD'),
  dateFormat: text('date_format').notNull().default('MM/DD/YYYY'),
  /** First month of the budget, 'YYYY-MM-01' */
  firstMonth: date('first_month', { mode: 'string' }).notNull(),
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
}).enableRLS()

export const budgetMembers = pgTable(
  'budget_members',
  {
    budgetId: uuid('budget_id')
      .notNull()
      .references(() => budgets.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull(),
    role: budgetRole('role').notNull().default('owner'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.budgetId, t.userId] })],
).enableRLS()
