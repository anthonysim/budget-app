import {
  date,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import { budgets } from './budgets'

/** A free-text note for a budget month ('YYYY-MM-01'). */
export const monthNotes = pgTable(
  'month_notes',
  {
    budgetId: uuid('budget_id')
      .notNull()
      .references(() => budgets.id, { onDelete: 'cascade' }),
    month: date('month', { mode: 'string' }).notNull(),
    note: text('note').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.budgetId, t.month] })],
).enableRLS()
