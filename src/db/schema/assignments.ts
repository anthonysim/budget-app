import {
  bigint,
  date,
  foreignKey,
  pgTable,
  primaryKey,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import { categories } from './categories'

/** Money assigned to a category in a month ('YYYY-MM-01'). Absent row = 0. */
export const monthAssignments = pgTable(
  'month_assignments',
  {
    budgetId: uuid('budget_id').notNull(),
    categoryId: uuid('category_id').notNull(),
    month: date('month', { mode: 'string' }).notNull(),
    /** Signed milliunits. */
    assigned: bigint('assigned', { mode: 'number' }).notNull().default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.categoryId, t.month] }),
    foreignKey({
      columns: [t.budgetId, t.categoryId],
      foreignColumns: [categories.budgetId, categories.id],
      name: 'month_assignments_category_budget_fk',
    }).onDelete('cascade'),
  ],
).enableRLS()
