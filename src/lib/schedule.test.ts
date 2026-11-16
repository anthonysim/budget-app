import { describe, expect, it } from 'vitest'
import {
  createScheduledSchema,
  dayOfMonth,
  dueOccurrences,
  nextOccurrence,
} from './schedule'

describe('nextOccurrence', () => {
  it('daily, weekly, biweekly', () => {
    expect(nextOccurrence('2026-12-31', 'daily', 31)).toBe('2027-01-01')
    expect(nextOccurrence('2026-11-15', 'weekly', 15)).toBe('2026-11-22')
    expect(nextOccurrence('2026-11-25', 'biweekly', 25)).toBe('2026-12-09')
  })

  it('monthly keeps the anchor day through short months (no drift)', () => {
    expect(nextOccurrence('2026-01-31', 'monthly', 31)).toBe('2026-02-28')
    expect(nextOccurrence('2026-02-28', 'monthly', 31)).toBe('2026-03-31')
    expect(nextOccurrence('2026-03-31', 'monthly', 31)).toBe('2026-04-30')
  })

  it('handles leap years', () => {
    expect(nextOccurrence('2028-01-31', 'monthly', 31)).toBe('2028-02-29')
    expect(nextOccurrence('2028-02-29', 'yearly', 29)).toBe('2029-02-28')
    expect(nextOccurrence('2029-02-28', 'yearly', 29)).toBe('2030-02-28')
    expect(nextOccurrence('2031-02-28', 'yearly', 29)).toBe('2032-02-29')
  })

  it('every 2 months, quarterly, twice a year, yearly cross year ends', () => {
    expect(nextOccurrence('2026-11-10', 'bimonthly', 10)).toBe('2027-01-10')
    expect(nextOccurrence('2026-11-10', 'quarterly', 10)).toBe('2027-02-10')
    expect(nextOccurrence('2026-11-10', 'semiannual', 10)).toBe('2027-05-10')
    expect(nextOccurrence('2026-11-10', 'yearly', 10)).toBe('2027-11-10')
  })

  it('twice monthly alternates between the day and the day +/- 15', () => {
    expect(nextOccurrence('2026-11-01', 'twice_monthly', 1)).toBe('2026-11-16')
    expect(nextOccurrence('2026-11-16', 'twice_monthly', 1)).toBe('2026-12-01')
    // anchored on the 31st: 16th and 31st, clamped in short months
    expect(nextOccurrence('2026-01-31', 'twice_monthly', 31)).toBe('2026-02-16')
    expect(nextOccurrence('2026-02-16', 'twice_monthly', 31)).toBe('2026-02-28')
    expect(nextOccurrence('2026-02-28', 'twice_monthly', 31)).toBe('2026-03-16')
  })

  it('one-off has no next occurrence', () => {
    expect(nextOccurrence('2026-11-01', 'once', 1)).toBeNull()
  })
})

describe('dueOccurrences', () => {
  it('returns nothing when the next date is in the future', () => {
    expect(dueOccurrences('2026-12-01', 'monthly', 1, '2026-11-30')).toEqual({
      due: [],
      nextDate: '2026-12-01',
    })
  })

  it('catches up every missed occurrence and advances', () => {
    expect(dueOccurrences('2026-09-15', 'monthly', 15, '2026-11-20')).toEqual({
      due: ['2026-09-15', '2026-10-15', '2026-11-15'],
      nextDate: '2026-12-15',
    })
  })

  it('a one-off is due once, then finished', () => {
    expect(dueOccurrences('2026-11-01', 'once', 1, '2026-11-20')).toEqual({
      due: ['2026-11-01'],
      nextDate: null,
    })
  })

  it('stops at the end date', () => {
    expect(
      dueOccurrences('2026-09-01', 'monthly', 1, '2026-12-31', '2026-10-15'),
    ).toEqual({ due: ['2026-09-01', '2026-10-01'], nextDate: null })
  })

  it('caps catch-up for very old daily schedules', () => {
    const r = dueOccurrences('2020-01-01', 'daily', 1, '2026-11-20', null, 10)
    expect(r.due).toHaveLength(10)
    expect(r.nextDate).toBe('2020-01-11')
  })

  it('dayOfMonth', () => {
    expect(dayOfMonth('2026-11-05')).toBe(5)
  })
})

describe('createScheduledSchema', () => {
  it('requires a frequency and takes no cleared flag', () => {
    const base = {
      budgetId: '3b3ed651-a8b6-4cdf-94e7-51660d1a6e7b',
      accountId: '3b3ed651-a8b6-4cdf-94e7-51660d1a6e7b',
      date: '2026-12-01',
      payeeName: 'Landlord',
      categoryId: null,
      transferAccountId: null,
      memo: null,
      amount: -150000,
      frequency: 'monthly',
      endDate: null,
    }
    expect(createScheduledSchema.safeParse(base).success).toBe(true)
    expect(
      createScheduledSchema.safeParse({ ...base, frequency: 'hourly' }).success,
    ).toBe(false)
  })
})
