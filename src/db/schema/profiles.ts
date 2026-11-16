import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

/**
 * One row per auth user. `id` mirrors auth.users.id.
 * Row is created by the on_auth_user_created trigger (see drizzle/*_profiles_trigger.sql).
 */
export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(),
  email: text('email'),
  displayName: text('display_name'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
}).enableRLS()
