import { describe, expect, it } from 'vitest'
import {
  dollarsToMilliunits,
  formatMilliunits,
  formatMoneyField,
  milliunitsToDollars,
  normalizeMoneyText,
  parseMoneyExpression,
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

describe('money input formatting', () => {
  it('formats with two decimals', () => {
    expect(formatMoneyField(50_000)).toBe('50.00')
    expect(formatMoneyField(12_500)).toBe('12.50')
    expect(formatMoneyField(-5_000)).toBe('-5.00')
  })

  it('keeps a third decimal when the amount has sub-cent precision', () => {
    expect(formatMoneyField(12_345)).toBe('12.345')
  })

  it('normalizes typed text', () => {
    expect(normalizeMoneyText('50')).toBe('50.00')
    expect(normalizeMoneyText('$1,200.5')).toBe('1200.50')
    expect(normalizeMoneyText('.5')).toBe('0.50')
    expect(normalizeMoneyText('50.')).toBe('50.00')
  })

  it('leaves blank and invalid text alone', () => {
    expect(normalizeMoneyText('')).toBe('')
    expect(normalizeMoneyText('abc')).toBe('abc')
    expect(normalizeMoneyText('1.2345')).toBe('1.2345')
  })

  it('evaluates arithmetic in money expressions', () => {
    expect(parseMoneyExpression('3201.15+35.07')).toBe(3_236_220)
    expect(parseMoneyExpression('100-12.5')).toBe(87_500)
    expect(parseMoneyExpression('(20+5)*2')).toBe(50_000)
    expect(parseMoneyExpression('$1,200 / 3')).toBe(400_000)
    expect(parseMoneyExpression('50')).toBe(50_000)
    expect(parseMoneyExpression('-50')).toBe(-50_000)
  })

  it('rejects invalid money expressions', () => {
    expect(parseMoneyExpression('')).toBeNull()
    expect(parseMoneyExpression('10+')).toBeNull()
    expect(parseMoneyExpression('*2')).toBeNull()
    expect(parseMoneyExpression('10/0')).toBeNull()
    expect(parseMoneyExpression('abc')).toBeNull()
  })

  it('normalizes expressions only when enabled', () => {
    expect(normalizeMoneyText('3201.15+35.07', true)).toBe('3236.22')
    expect(normalizeMoneyText('3201.15+35.07')).toBe('3201.15+35.07')
    expect(normalizeMoneyText('10+', true)).toBe('10+')
  })
})
