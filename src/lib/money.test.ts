import { describe, expect, it } from 'vitest'
import {
  dollarsToMilliunits,
  formatMilliunits,
  milliunitsToDollars,
} from './money'

describe('money', () => {
  it('converts dollars to milliunits without float drift', () => {
    expect(dollarsToMilliunits(1)).toBe(1000)
    expect(dollarsToMilliunits(19.99)).toBe(19990)
    expect(dollarsToMilliunits(0.1 + 0.2)).toBe(300)
    expect(dollarsToMilliunits(-5.25)).toBe(-5250)
  })

  it('converts milliunits to dollars', () => {
    expect(milliunitsToDollars(12340)).toBe(12.34)
  })

  it('formats milliunits as currency', () => {
    expect(formatMilliunits(1234560)).toBe('$1,234.56')
    expect(formatMilliunits(-5000)).toBe('-$5.00')
  })
})
