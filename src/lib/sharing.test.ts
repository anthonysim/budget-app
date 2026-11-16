import { describe, expect, it } from 'vitest'
import {
  canLeave,
  canManageMembers,
  canModifyMember,
  inviteSchema,
  normalizeEmail,
  updateMemberRoleSchema,
} from './sharing'

const id = '3b3ed651-a8b6-4cdf-94e7-51660d1a6e7b'

describe('sharing rules', () => {
  const owner = { userId: 'o', role: 'owner' as const }
  const editor = { userId: 'e', role: 'editor' as const }
  const viewer = { userId: 'v', role: 'viewer' as const }

  it('only owners manage members', () => {
    expect(canManageMembers('owner')).toBe(true)
    expect(canManageMembers('editor')).toBe(false)
    expect(canManageMembers('viewer')).toBe(false)
  })

  it('owners can change others but never themselves or another owner', () => {
    expect(canModifyMember(owner, editor)).toBe(true)
    expect(canModifyMember(owner, viewer)).toBe(true)
    expect(canModifyMember(owner, owner)).toBe(false)
    expect(canModifyMember(owner, { userId: 'o2', role: 'owner' })).toBe(false)
  })

  it('editors and viewers cannot modify anyone', () => {
    expect(canModifyMember(editor, viewer)).toBe(false)
    expect(canModifyMember(viewer, editor)).toBe(false)
  })

  it('everyone but the owner can leave', () => {
    expect(canLeave('editor')).toBe(true)
    expect(canLeave('viewer')).toBe(true)
    expect(canLeave('owner')).toBe(false)
  })
})

describe('invite input', () => {
  it('normalizes the email and only allows editor or viewer', () => {
    expect(
      inviteSchema.parse({
        budgetId: id,
        email: '  Pat@Example.COM ',
        role: 'editor',
      }).email,
    ).toBe('pat@example.com')
    expect(
      inviteSchema.safeParse({
        budgetId: id,
        email: 'pat@example.com',
        role: 'owner',
      }).success,
    ).toBe(false)
    expect(
      inviteSchema.safeParse({ budgetId: id, email: 'nope', role: 'viewer' })
        .success,
    ).toBe(false)
    expect(
      updateMemberRoleSchema.safeParse({
        budgetId: id,
        userId: id,
        role: 'owner',
      }).success,
    ).toBe(false)
    expect(normalizeEmail(' A@B.co ')).toBe('a@b.co')
  })
})
