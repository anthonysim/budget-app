import { describe, expect, it } from 'vitest'
import { allocateProportionally } from './allocate'

describe('allocateProportionally', () => {
  it('splits exactly when divisible', () => {
    expect(allocateProportionally(100, [60, 40])).toEqual([60, 40])
    expect(allocateProportionally(50, [1, 1])).toEqual([25, 25])
  })
  it('always sums to the total (largest remainder)', () => {
    const r = allocateProportionally(100, [1, 1, 1])
    expect(r.reduce((a, b) => a + b, 0)).toBe(100)
    expect(r).toEqual([34, 33, 33])
  })
  it('handles zero total, zero weights and single weight', () => {
    expect(allocateProportionally(0, [5, 5])).toEqual([0, 0])
    expect(allocateProportionally(10, [0, 0])).toEqual([0, 0])
    expect(allocateProportionally(77, [9])).toEqual([77])
    expect(allocateProportionally(10, [0, 5])).toEqual([0, 10])
  })
  it('is exact for large milliunit values', () => {
    const r = allocateProportionally(900_000_000_007, [3, 3, 3])
    expect(r.reduce((a, b) => a + b, 0)).toBe(900_000_000_007)
  })
})
