import {
  bigint,
  date,
  foreignKey,
  pgEnum,
  pgTable,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core'
import { categories } from './categories'

export const targetType = pgEnum('target_type', [
  'needed_for_spending',
  'have_balance',
  'monthly_funding',
])
export const targetRepeat = pgEnum('target_repeat', [
  'weekly',
  'monthly',
  'yearly',
  'once',
])
export const targetBehavior = pgEnum('target_behavior', ['set_aside', 'refill'])

/** At most one target per category. */
export const categoryTargets = pgTable(
  'category_targets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    budgetId: uuid('budget_id').notNull(),
    categoryId: uuid('category_id').notNull(),
    type: targetType('type').notNull(),
    /** Goal amount in milliunits (> 0). */
    amount: bigint('amount', { mode: 'number' }).notNull(),
    repeat: targetRepeat('repeat'),
    dueDate: date('due_date', { mode: 'string' }),
    behavior: targetBehavior('behavior'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique('category_targets_category_unique').on(t.categoryId),
    foreignKey({
      columns: [t.budgetId, t.categoryId],
      foreignColumns: [categories.budgetId, categories.id],
      name: 'category_targets_category_budget_fk',
    }).onDelete('cascade'),
  ],
).enableRLS()
