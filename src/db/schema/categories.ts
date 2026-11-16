import {
  boolean,
  foreignKey,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core'
import { budgets } from './budgets'

export const categoryGroups = pgTable(
  'category_groups',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    budgetId: uuid('budget_id')
      .notNull()
      .references(() => budgets.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    sort: integer('sort').notNull().default(0),
    hidden: boolean('hidden').notNull().default(false),
    /** System groups (the Inflow group) cannot be edited or deleted. */
    system: boolean('system').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique('category_groups_budget_id_id_unique').on(t.budgetId, t.id)],
).enableRLS()

export const categories = pgTable(
  'categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    budgetId: uuid('budget_id').notNull(),
    groupId: uuid('group_id').notNull(),
    name: text('name').notNull(),
    sort: integer('sort').notNull().default(0),
    hidden: boolean('hidden').notNull().default(false),
    note: text('note'),
    /** 'inflow' marks the Ready to Assign income category. */
    systemKind: text('system_kind'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique('categories_budget_id_id_unique').on(t.budgetId, t.id),
    foreignKey({
      columns: [t.budgetId, t.groupId],
      foreignColumns: [categoryGroups.budgetId, categoryGroups.id],
      name: 'categories_group_budget_fk',
    }).onDelete('cascade'),
  ],
).enableRLS()
