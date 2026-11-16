import { describe, expect, it } from 'vitest'
import { comparePayoff, payoffMonth, projectPayoff } from './payoff'

describe('projectPayoff', () => {
  it('a zero-interest debt takes balance / payment months', () => {
    const r = projectPayoff({ balance: 1_200_000, aprBps: 0, payment: 100_000 })
    expect(r.months).toBe(12)
    expect(r.totalInterest).toBe(0)
    expect(r.totalPaid).toBe(1_200_000)
    expect(r.schedule.at(-1)?.balance).toBe(0)
  })

  it('charges monthly interest on the remaining balance', () => {
    // $1,000 at 12% APR = 1% a month, paying $500: interest 10, then 5.05 ...
    const r = projectPayoff({
      balance: 1_000_000,
      aprBps: 1200,
      payment: 500_000,
    })
    expect(r.schedule[0]).toEqual({
      month: 1,
      interest: 10_000,
      principal: 490_000,
      balance: 510_000,
    })
    expect(r.schedule[1]?.interest).toBe(5_100)
    expect(r.months).toBe(3)
    // the final payment is only what is left plus interest
    const last = r.schedule.at(-1)
    expect(last?.balance).toBe(0)
    expect(r.totalPaid).toBe(1_000_000 + r.totalInterest)
  })

  it('detects a payment that never pays the debt off', () => {
    // $10,000 at 24% = $200/month interest; paying $150 never works
    const r = projectPayoff({
      balance: 10_000_000,
      aprBps: 2400,
      payment: 150_000,
    })
    expect(r.neverPaysOff).toBe(true)
    expect(r.months).toBeNull()
    // paying exactly the interest never reduces it either
    expect(
      projectPayoff({ balance: 10_000_000, aprBps: 2400, payment: 200_000 })
        .neverPaysOff,
    ).toBe(true)
  })

  it('nothing owed is already paid off', () => {
    expect(
      projectPayoff({ balance: 0, aprBps: 1999, payment: 100 }).months,
    ).toBe(0)
  })

  it('a final payment smaller than the regular one ends the debt', () => {
    const r = projectPayoff({ balance: 250_000, aprBps: 0, payment: 100_000 })
    expect(r.schedule.map((s) => s.principal)).toEqual([
      100_000, 100_000, 50_000,
    ])
    expect(r.months).toBe(3)
  })
})

describe('comparePayoff', () => {
  it('extra payments save months and interest', () => {
    const c = comparePayoff(
      { balance: 5_000_000, aprBps: 1999, payment: 150_000 },
      100_000,
    )
    expect(c.monthsSaved).toBeGreaterThan(0)
    expect(c.interestSaved).toBeGreaterThan(0)
    expect(c.withExtra.totalPaid).toBeLessThan(c.baseline.totalPaid)
  })
  it('reports nothing saved when the baseline never pays off', () => {
    const c = comparePayoff(
      { balance: 10_000_000, aprBps: 2400, payment: 100_000 },
      0,
    )
    expect(c.monthsSaved).toBeNull()
  })
  it('an extra payment can turn a never-ending debt into a payoff date', () => {
    const c = comparePayoff(
      { balance: 10_000_000, aprBps: 2400, payment: 100_000 },
      400_000,
    )
    expect(c.baseline.neverPaysOff).toBe(true)
    expect(c.withExtra.months).not.toBeNull()
  })
})

describe('payoffMonth', () => {
  it('adds months across years', () => {
    expect(payoffMonth('2026-11-01', 3)).toBe('2027-02-01')
    expect(payoffMonth('2026-11-01', 14)).toBe('2028-01-01')
  })
})
