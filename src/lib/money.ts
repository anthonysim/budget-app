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

/**
 * Parse user-typed money ("$1,234.56", "-50", "12.5") into milliunits.
 * Returns null when the text is not a valid amount (max 3 decimals).
 */
export function parseMoneyInput(input: string): Milliunits | null {
  const cleaned = input.trim().replace(/[$,\s]/g, '')
  if (!/^-?(\d+\.?\d{0,3}|\.\d{1,3})$/.test(cleaned)) return null
  const negative = cleaned.startsWith('-')
  const [whole = '0', frac = ''] = cleaned.replace('-', '').split('.')
  const milli = Number(whole || '0') * 1000 + Number((frac + '000').slice(0, 3))
  return negative ? -milli : milli
}

/** "19.99" or "19.99%" -> basis points (1999). Null if not a valid percentage 0 to 1000. */
export function parsePercentToBps(input: string): number | null {
  const t = input.trim().replace(/%$/, '').trim()
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return null
  const bps = Math.round(Number(t) * 100)
  return bps <= 100_000 ? bps : null
}

/**
 * Text for a money input: always two decimals ("50.00"), or three when the amount has
 * sub-cent precision so nothing is lost. No currency symbol or thousands separators.
 */
export function formatMoneyField(milliunits: Milliunits): string {
  return milliunits % 10 === 0
    ? (milliunits / 1000).toFixed(2)
    : (milliunits / 1000).toFixed(3)
}

/**
 * Normalizes typed money text to {@link formatMoneyField} ("50" -> "50.00", "$1,200.5" ->
 * "1200.50"). Blank or invalid text is returned unchanged so the user can keep editing.
 */
export function normalizeMoneyText(text: string): string {
  if (text.trim() === '') return text
  const milli = parseMoneyInput(text)
  return milli === null ? text : formatMoneyField(milli)
}
