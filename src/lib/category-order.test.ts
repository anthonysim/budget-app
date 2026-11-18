import { describe, expect, it } from 'vitest'
import { applyCategoryOrder } from './category-order'

const groups = [
  { id: 'g1', categories: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] },
  { id: 'g2', categories: [{ id: 'x' }, { id: 'y' }] },
]
const ids = (g: { categories: Array<{ id: string }> }) =>
  g.categories.map((c) => c.id)

describe('applyCategoryOrder', () => {
  it('returns the same groups when there are no overrides', () => {
    expect(applyCategoryOrder(groups, {})).toBe(groups)
  })

  it('reorders only the overridden group', () => {
    const out = applyCategoryOrder(groups, { g1: ['c', 'a', 'b'] })
    expect(ids(out[0]!)).toEqual(['c', 'a', 'b'])
    expect(out[1]).toBe(groups[1])
  })

  it('appends categories missing from the override in server order', () => {
    const out = applyCategoryOrder(groups, { g1: ['c'] })
    expect(ids(out[0]!)).toEqual(['c', 'a', 'b'])
  })

  it('ignores ids that no longer exist', () => {
    const out = applyCategoryOrder(groups, { g1: ['gone', 'b', 'a', 'c'] })
    expect(ids(out[0]!)).toEqual(['b', 'a', 'c'])
  })
})
