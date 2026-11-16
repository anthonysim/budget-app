import { describe, expect, it } from 'vitest'
import {
  ageOfMoneyAt,
  ageOfMoneyTimeline,
  foldTopN,
  monthsInRange,
  netWorthSeries,
  rangeFromPreset,
} from './reports'

describe('rangeFromPreset', () => {
  const today = '2026-11-15'
  it('covers whole months ending with the current month', () => {
    expect(rangeFromPreset('this_month', today)).toEqual({
      from: '2026-11-01',
      to: '2026-11-30',
    })
    expect(rangeFromPreset('3m', today)).toEqual({
      from: '2026-09-01',
      to: '2026-11-30',
    })
    expect(rangeFromPreset('6m', today)).toEqual({
      from: '2026-06-01',
      to: '2026-11-30',
    })
    expect(rangeFromPreset('12m', today)).toEqual({
      from: '2025-12-01',
      to: '2026-11-30',
    })
    expect(rangeFromPreset('ytd', today)).toEqual({
      from: '2026-01-01',
      to: '2026-11-30',
    })
    expect(rangeFromPreset('all', today)).toEqual({
      from: null,
      to: '2026-11-30',
    })
  })
  it('handles leap-year February', () => {
    expect(rangeFromPreset('this_month', '2028-02-10').to).toBe('2028-02-29')
  })
})

describe('monthsInRange', () => {
  it('lists every month inclusive across a year boundary', () => {
    expect(monthsInRange('2026-11-15', '2027-02-03')).toEqual([
      '2026-11-01',
      '2026-12-01',
      '2027-01-01',
      '2027-02-01',
    ])
    expect(monthsInRange('2026-11-01', '2026-11-30')).toEqual(['2026-11-01'])
  })
})

describe('foldTopN', () => {
  const rows = [
    { label: 'a', amount: 10 },
    { label: 'b', amount: 50 },
    { label: 'c', amount: 30 },
    { label: 'd', amount: 5 },
    { label: 'e', amount: 1 },
  ]
  it('keeps the largest rows and folds the rest into Other', () => {
    expect(foldTopN(rows, 3)).toEqual([
      { label: 'b', amount: 50 },
      { label: 'c', amount: 30 },
      { label: 'a', amount: 10 },
      { label: 'Other', amount: 6 },
    ])
  })
  it('does nothing when there are few rows', () => {
    expect(foldTopN(rows, 5)).toHaveLength(5)
    expect(foldTopN(rows, 5).some((r) => r.label === 'Other')).toBe(false)
  })
})

describe('netWorthSeries', () => {
  it('accumulates monthly changes onto the opening balance', () => {
    const r = netWorthSeries(
      { assets: 1000, liabilities: -300 },
      [
        { month: '2026-10-01', assets: 200, liabilities: 0 },
        { month: '2026-12-01', assets: -50, liabilities: -100 },
      ],
      ['2026-10-01', '2026-11-01', '2026-12-01'],
    )
    expect(r).toEqual([
      { month: '2026-10-01', assets: 1200, liabilities: -300, net: 900 },
      { month: '2026-11-01', assets: 1200, liabilities: -300, net: 900 },
      { month: '2026-12-01', assets: 1150, liabilities: -400, net: 750 },
    ])
  })
})

describe('Age of Money', () => {
  it('is how long the spent dollars sat', () => {
    const t = ageOfMoneyTimeline([
      { date: '2026-11-01', amount: 100 },
      { date: '2026-11-11', amount: -40 },
    ])
    expect(t).toEqual([{ date: '2026-11-11', age: 10, weight: 40 }])
    expect(ageOfMoneyAt(t, '2026-11-30')).toBe(10)
  })

  it('spends the oldest dollars first (FIFO) and weights by amount', () => {
    const t = ageOfMoneyTimeline([
      { date: '2026-11-01', amount: 100 },
      { date: '2026-11-21', amount: 100 },
      { date: '2026-12-01', amount: -150 },
    ])
    // 100 from day 0 (age 30) + 50 from day 20 (age 10) -> (3000 + 500) / 150
    expect(t[0]?.age).toBeCloseTo(23.33, 1)
    expect(ageOfMoneyAt(t, '2026-12-31')).toBe(23)
  })

  it('applies same-day inflows before outflows and ignores the unfunded part', () => {
    const t = ageOfMoneyTimeline([
      { date: '2026-11-05', amount: -500 },
      { date: '2026-11-05', amount: 100 },
    ])
    expect(t).toEqual([{ date: '2026-11-05', age: 0, weight: 100 }])
  })

  it('uses only the last 10 outflows up to the date', () => {
    const events = [{ date: '2026-01-01', amount: 100_000 }]
    for (let i = 0; i < 12; i++) {
      events.push({
        date: `2026-02-${String(i + 1).padStart(2, '0')}`,
        amount: -1000,
      })
    }
    const t = ageOfMoneyTimeline(events)
    expect(t).toHaveLength(12)
    // ages grow by one day each; last 10 are days 33..42 from Jan 1 -> wait: Feb 3..Feb 12
    const at = ageOfMoneyAt(t, '2026-02-28')
    expect(at).toBeGreaterThan(33)
    // as of Feb 5 only 5 outflows exist
    expect(ageOfMoneyAt(t, '2026-02-05')).toBe(
      Math.round((31 + 32 + 33 + 34 + 35) / 5),
    )
  })

  it('is null before any funded outflow', () => {
    expect(ageOfMoneyAt([], '2026-11-01')).toBeNull()
    expect(
      ageOfMoneyAt(
        ageOfMoneyTimeline([{ date: '2026-11-01', amount: 5 }]),
        '2026-11-30',
      ),
    ).toBeNull()
  })
})
