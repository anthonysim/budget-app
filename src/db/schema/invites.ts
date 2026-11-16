import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { budgetRole, budgets } from './budgets'

/** Pending invitations. Accepting one (as the matching, confirmed email) creates a membership. */
export const budgetInvites = pgTable('budget_invites', {
  id: uuid('id').primaryKey().defaultRandom(),
  budgetId: uuid('budget_id')
    .notNull()
    .references(() => budgets.id, { onDelete: 'cascade' }),
  /** Lowercased. */
  email: text('email').notNull(),
  role: budgetRole('role').notNull(),
  invitedBy: uuid('invited_by'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
}).enableRLS()
