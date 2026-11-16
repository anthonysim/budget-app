import { describe, expect, it } from 'vitest'
import { autoAssignChanges } from './auto-assign'
import type { AutoAssignRow } from './auto-assign'

const row = (over: Partial<AutoAssignRow>): AutoAssignRow => ({
  id: 'a',
  assigned: 0,
  underfunded: 0,
  lastAssigned: 0,
  lastSpent: 0,
  avgAssigned: 0,
  avgSpent: 0,
  ...over,
})

describe('autoAssignChanges', () => {
  it('underfunded adds the gap and skips funded categories', () => {
    const rows = [
      row({ id: 'a', assigned: 20_000, underfunded: 80_000 }),
      row({ id: 'b', assigned: 50_000, underfunded: 0 }),
    ]
    expect(autoAssignChanges('underfunded', rows)).toEqual([
      { categoryId: 'a', from: 20_000, to: 100_000 },
    ])
  })
  it('copies last month assigned or spent', () => {
    const rows = [
      row({
        id: 'a',
        assigned: 5_000,
        lastAssigned: 30_000,
        lastSpent: 12_000,
      }),
    ]
    expect(autoAssignChanges('last_assigned', rows)[0]?.to).toBe(30_000)
    expect(autoAssignChanges('last_spent', rows)[0]?.to).toBe(12_000)
  })
  it('uses 3 month averages', () => {
    const rows = [row({ id: 'a', avgAssigned: 40_000, avgSpent: 25_000 })]
    expect(autoAssignChanges('avg_assigned', rows)[0]?.to).toBe(40_000)
    expect(autoAssignChanges('avg_spent', rows)[0]?.to).toBe(25_000)
  })
  it('reset zeroes everything that is not already zero', () => {
    const rows = [
      row({ id: 'a', assigned: 5_000 }),
      row({ id: 'b', assigned: 0 }),
    ]
    expect(autoAssignChanges('reset', rows)).toEqual([
      { categoryId: 'a', from: 5_000, to: 0 },
    ])
  })
  it('omits categories that would not change', () => {
    expect(
      autoAssignChanges('last_assigned', [
        row({ assigned: 10_000, lastAssigned: 10_000 }),
      ]),
    ).toEqual([])
  })
})
