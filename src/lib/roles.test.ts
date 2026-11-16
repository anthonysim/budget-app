import { describe, expect, it } from 'vitest'
import { hasRole } from './roles'

describe('hasRole', () => {
  it('orders owner > editor > viewer', () => {
    expect(hasRole('owner', 'editor')).toBe(true)
    expect(hasRole('editor', 'editor')).toBe(true)
    expect(hasRole('viewer', 'editor')).toBe(false)
    expect(hasRole('editor', 'owner')).toBe(false)
    expect(hasRole('viewer', 'viewer')).toBe(true)
  })
})
