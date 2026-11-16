import { and, asc, desc, eq, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { db } from '#/db'
import { budgetInvites, budgetMembers, budgets, profiles } from '#/db/schema'
import type { InviteRow, MemberRow, MyInvite } from '#/lib/sharing'

// Server-only query helpers (no createServerFn; see accounts-query.ts for why).

/** Pending invitations addressed to this email. */
export async function queryMyInvites(
  email: string | undefined,
): Promise<Array<MyInvite>> {
  if (!email) return []
  const inviter = alias(profiles, 'inviter')
  return db()
    .select({
      id: budgetInvites.id,
      budgetName: budgets.name,
      role: sql<MyInvite['role']>`${budgetInvites.role}`,
      invitedByEmail: inviter.email,
    })
    .from(budgetInvites)
    .innerJoin(budgets, eq(budgets.id, budgetInvites.budgetId))
    .leftJoin(inviter, eq(inviter.id, budgetInvites.invitedBy))
    .where(eq(budgetInvites.email, email.trim().toLowerCase()))
    .orderBy(desc(budgetInvites.createdAt))
}

export async function queryMembers(
  budgetId: string,
): Promise<Array<MemberRow>> {
  return db()
    .select({
      userId: budgetMembers.userId,
      role: budgetMembers.role,
      email: profiles.email,
      displayName: profiles.displayName,
      joinedAt: budgetMembers.createdAt,
    })
    .from(budgetMembers)
    .leftJoin(profiles, eq(profiles.id, budgetMembers.userId))
    .where(eq(budgetMembers.budgetId, budgetId))
    .orderBy(asc(budgetMembers.createdAt))
}

export async function queryInvites(
  budgetId: string,
): Promise<Array<InviteRow>> {
  return db()
    .select({
      id: budgetInvites.id,
      email: budgetInvites.email,
      role: sql<InviteRow['role']>`${budgetInvites.role}`,
      createdAt: budgetInvites.createdAt,
    })
    .from(budgetInvites)
    .where(and(eq(budgetInvites.budgetId, budgetId)))
    .orderBy(desc(budgetInvites.createdAt))
}
