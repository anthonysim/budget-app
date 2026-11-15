/**
 * Money is stored as integer milliunits ($1.00 = 1000), like YNAB.
 * Never use floats for stored/calculated amounts.
 */
export type Milliunits = number

export function dollarsToMilliunits(dollars: number): Milliunits {
  return Math.round(dollars * 1000)
}

export function milliunitsToDollars(milliunits: Milliunits): number {
  return milliunits / 1000
}

export function formatMilliunits(
  milliunits: Milliunits,
  currency = 'USD',
  locale = 'en-US',
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(milliunitsToDollars(milliunits))
}
