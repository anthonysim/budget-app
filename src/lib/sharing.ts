import { z } from 'zod'
import type { BudgetRole } from '#/lib/roles'

/** Roles an owner can hand out. There is exactly one owner: the creator. */
export const INVITE_ROLES = ['editor', 'viewer'] as const
export type InviteRole = (typeof INVITE_ROLES)[number]

export const ROLE_LABELS: Record<BudgetRole, string> = {
  owner: 'Owner',
  editor: 'Editor',
  viewer: 'Viewer',
}

export const ROLE_DESCRIPTIONS: Record<BudgetRole, string> = {
  owner: 'Full control, including sharing and deleting the budget',
  editor: 'Can add and change anything in the budget',
  viewer: 'Can look but not change',
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email('Enter a valid email'))

export const inviteSchema = z.object({
  budgetId: z.uuid(),
  email,
  role: z.enum(INVITE_ROLES),
})

export const revokeInviteSchema = z.object({
  budgetId: z.uuid(),
  inviteId: z.uuid(),
})

export const memberRefSchema = z.object({
  budgetId: z.uuid(),
  userId: z.uuid(),
})

export const updateMemberRoleSchema = memberRefSchema.extend({
  role: z.enum(INVITE_ROLES),
})

export const leaveBudgetSchema = z.object({ budgetId: z.uuid() })
export const inviteRefSchema = z.object({ inviteId: z.uuid() })

/** Only owners manage sharing. */
export function canManageMembers(role: BudgetRole): boolean {
  return role === 'owner'
}

/**
 * Whether `actor` may change or remove `target`: owners manage everyone except themselves,
 * and nobody can touch an owner.
 */
export function canModifyMember(
  actor: { userId: string; role: BudgetRole },
  target: { userId: string; role: BudgetRole },
): boolean {
  return (
    canManageMembers(actor.role) &&
    target.role !== 'owner' &&
    target.userId !== actor.userId
  )
}

/** A member can leave unless they are the owner (the owner deletes the budget instead). */
export function canLeave(role: BudgetRole): boolean {
  return role !== 'owner'
}

export interface MemberRow {
  userId: string
  role: BudgetRole
  email: string | null
  displayName: string | null
  joinedAt: Date
}

export interface InviteRow {
  id: string
  email: string
  role: InviteRole
  createdAt: Date
}

export interface MyInvite {
  id: string
  budgetName: string
  role: InviteRole
  invitedByEmail: string | null
}
