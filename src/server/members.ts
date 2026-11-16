import { createServerFn } from '@tanstack/react-start'
import { and, eq, sql } from 'drizzle-orm'
import { db } from '#/db'
import { budgetInvites, budgetMembers, profiles } from '#/db/schema'
import { budgetIdSchema } from '#/lib/budget-schemas'
import {
  canLeave,
  canModifyMember,
  inviteRefSchema,
  inviteSchema,
  leaveBudgetSchema,
  memberRefSchema,
  normalizeEmail,
  revokeInviteSchema,
  updateMemberRoleSchema,
} from '#/lib/sharing'
import { requireBudgetRole } from '#/server/budget-access'
import {
  queryInvites,
  queryMembers,
  queryMyInvites,
} from '#/server/members-query'
import { requireUser } from '#/server/require-user'

/** Members and pending invites. Everyone in the budget sees members; only owners see invites. */
export const loadMembers = createServerFn({ method: 'GET' })
  .validator(budgetIdSchema)
  .handler(async ({ data }) => {
    const { user, role } = await requireBudgetRole(data.budgetId, 'viewer')
    const [members, invites] = await Promise.all([
      queryMembers(data.budgetId),
      role === 'owner' ? queryInvites(data.budgetId) : Promise.resolve([]),
    ])
    return { role, currentUserId: user.id, members, invites }
  })

export const inviteMember = createServerFn({ method: 'POST' })
  .validator(inviteSchema)
  .handler(async ({ data }) => {
    const { user } = await requireBudgetRole(data.budgetId, 'owner')
    const email = normalizeEmail(data.email)
    if (email === normalizeEmail(user.email ?? '')) {
      throw new Error('You already own this budget')
    }
    await db().transaction(async (tx) => {
      const [existing] = await tx
        .select({ userId: budgetMembers.userId })
        .from(budgetMembers)
        .innerJoin(profiles, eq(profiles.id, budgetMembers.userId))
        .where(
          and(
            eq(budgetMembers.budgetId, data.budgetId),
            sql`lower(${profiles.email}) = ${email}`,
          ),
        )
        .limit(1)
      if (existing) throw new Error('Already a member')
      await tx
        .insert(budgetInvites)
        .values({
          budgetId: data.budgetId,
          email,
          role: data.role,
          invitedBy: user.id,
        })
        .onConflictDoUpdate({
          target: [budgetInvites.budgetId, budgetInvites.email],
          set: { role: data.role, invitedBy: user.id },
        })
    })
  })

export const revokeInvite = createServerFn({ method: 'POST' })
  .validator(revokeInviteSchema)
  .handler(async ({ data }) => {
    await requireBudgetRole(data.budgetId, 'owner')
    await db()
      .delete(budgetInvites)
      .where(
        and(
          eq(budgetInvites.id, data.inviteId),
          eq(budgetInvites.budgetId, data.budgetId),
        ),
      )
  })

async function loadTarget(budgetId: string, userId: string) {
  const [row] = await db()
    .select({ userId: budgetMembers.userId, role: budgetMembers.role })
    .from(budgetMembers)
    .where(
      and(
        eq(budgetMembers.budgetId, budgetId),
        eq(budgetMembers.userId, userId),
      ),
    )
    .limit(1)
  if (!row) throw new Error('Not found')
  return row
}

export const updateMemberRole = createServerFn({ method: 'POST' })
  .validator(updateMemberRoleSchema)
  .handler(async ({ data }) => {
    const { user, role } = await requireBudgetRole(data.budgetId, 'owner')
    const target = await loadTarget(data.budgetId, data.userId)
    if (!canModifyMember({ userId: user.id, role }, target)) {
      throw new Error('Forbidden')
    }
    await db()
      .update(budgetMembers)
      .set({ role: data.role })
      .where(
        and(
          eq(budgetMembers.budgetId, data.budgetId),
          eq(budgetMembers.userId, data.userId),
        ),
      )
  })

export const removeMember = createServerFn({ method: 'POST' })
  .validator(memberRefSchema)
  .handler(async ({ data }) => {
    const { user, role } = await requireBudgetRole(data.budgetId, 'owner')
    const target = await loadTarget(data.budgetId, data.userId)
    if (!canModifyMember({ userId: user.id, role }, target)) {
      throw new Error('Forbidden')
    }
    await db()
      .delete(budgetMembers)
      .where(
        and(
          eq(budgetMembers.budgetId, data.budgetId),
          eq(budgetMembers.userId, data.userId),
        ),
      )
  })

/** A non-owner member leaves the budget. */
export const leaveBudget = createServerFn({ method: 'POST' })
  .validator(leaveBudgetSchema)
  .handler(async ({ data }) => {
    const { user, role } = await requireBudgetRole(data.budgetId, 'viewer')
    if (!canLeave(role)) throw new Error('Owners delete the budget instead')
    await db()
      .delete(budgetMembers)
      .where(
        and(
          eq(budgetMembers.budgetId, data.budgetId),
          eq(budgetMembers.userId, user.id),
        ),
      )
  })

export const listMyInvites = createServerFn({ method: 'GET' }).handler(
  async () => {
    const user = await requireUser()
    return queryMyInvites(user.email)
  },
)

/**
 * Accepting requires the invitation's email to match the signed-in user's CONFIRMED email.
 * (Hosted Supabase must have "Confirm email" enabled, otherwise anyone could claim an invitation
 * by signing up with someone else's address.)
 */
export const acceptInvite = createServerFn({ method: 'POST' })
  .validator(inviteRefSchema)
  .handler(async ({ data }) => {
    const user = await requireUser()
    if (!user.email || !user.email_confirmed_at) {
      throw new Error('Confirm your email address before accepting invitations')
    }
    const email = normalizeEmail(user.email)
    return db().transaction(async (tx) => {
      const [invite] = await tx
        .select({
          id: budgetInvites.id,
          budgetId: budgetInvites.budgetId,
          role: budgetInvites.role,
        })
        .from(budgetInvites)
        .where(
          and(
            eq(budgetInvites.id, data.inviteId),
            eq(budgetInvites.email, email),
          ),
        )
        .limit(1)
      if (!invite) throw new Error('Not found')
      await tx
        .insert(budgetMembers)
        .values({
          budgetId: invite.budgetId,
          userId: user.id,
          role: invite.role,
        })
        .onConflictDoNothing()
      await tx.delete(budgetInvites).where(eq(budgetInvites.id, invite.id))
      return { budgetId: invite.budgetId }
    })
  })

export const declineInvite = createServerFn({ method: 'POST' })
  .validator(inviteRefSchema)
  .handler(async ({ data }) => {
    const user = await requireUser()
    if (!user.email) throw new Error('Not found')
    await db()
      .delete(budgetInvites)
      .where(
        and(
          eq(budgetInvites.id, data.inviteId),
          eq(budgetInvites.email, normalizeEmail(user.email)),
        ),
      )
  })
