import { describe, expect, it } from 'vitest'
import {
  dollarsToMilliunits,
  formatMilliunits,
  milliunitsToDollars,
  parseMoneyInput,
  parsePercentToBps,
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

  it('parses money input', () => {
    expect(parseMoneyInput('$1,234.56')).toBe(1234560)
    expect(parseMoneyInput('-50')).toBe(-50000)
    expect(parseMoneyInput('12.5')).toBe(12500)
    expect(parseMoneyInput('.75')).toBe(750)
    expect(parseMoneyInput('0')).toBe(0)
    expect(parseMoneyInput('')).toBeNull()
    expect(parseMoneyInput('abc')).toBeNull()
    expect(parseMoneyInput('1.2345')).toBeNull()
    expect(parseMoneyInput('1.2.3')).toBeNull()
  })

  it('parses percentages to basis points', () => {
    expect(parsePercentToBps('19.99')).toBe(1999)
    expect(parsePercentToBps('24%')).toBe(2400)
    expect(parsePercentToBps(' 5.5 % ')).toBe(550)
    expect(parsePercentToBps('0')).toBe(0)
    expect(parsePercentToBps('1000.01')).toBeNull()
    expect(parsePercentToBps('abc')).toBeNull()
    expect(parsePercentToBps('-3')).toBeNull()
    expect(parsePercentToBps('1.234')).toBeNull()
  })
})
