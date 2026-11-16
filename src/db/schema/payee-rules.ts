import {
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import { budgets } from './budgets'

export const ruleMatchType = pgEnum('rule_match_type', [
  'contains',
  'starts_with',
  'equals',
])

/** Import rules: rename a matching bank payee and optionally set a default category. */
export const payeeRules = pgTable('payee_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  budgetId: uuid('budget_id')
    .notNull()
    .references(() => budgets.id, { onDelete: 'cascade' }),
  matchType: ruleMatchType('match_type').notNull(),
  pattern: text('pattern').notNull(),
  payeeName: text('payee_name').notNull(),
  categoryId: uuid('category_id'),
  sort: integer('sort').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
}).enableRLS()

export type PayeeRuleRow = typeof payeeRules.$inferSelect
