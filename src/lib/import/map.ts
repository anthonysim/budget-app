import { parseMoneyInput } from '#/lib/money'

export const DATE_FORMATS = [
  'YYYY-MM-DD',
  'MM/DD/YYYY',
  'DD/MM/YYYY',
  'MM-DD-YYYY',
  'DD-MM-YYYY',
  'DD.MM.YYYY',
] as const
export type DateFormat = (typeof DATE_FORMATS)[number]

export interface CsvMapping {
  hasHeader: boolean
  dateColumn: number
  dateFormat: DateFormat
  payeeColumn: number | null
  memoColumn: number | null
  amountMode: 'single' | 'split'
  amountColumn: number | null
  outflowColumn: number | null
  inflowColumn: number | null
  /** Single amount column where charges are positive (many credit card exports). */
  invertSign: boolean
}

export interface ImportRow {
  /** 'YYYY-MM-DD' */
  date: string
  payee: string
  memo: string
  /** Signed milliunits (negative = money out). */
  amount: number
  /** Bank transaction id (OFX FITID) when the file has one. */
  fitId: string | null
}

export function parseDateCell(text: string, format: DateFormat): string | null {
  const t = text.trim().split(/[ T]/)[0] ?? ''
  const parts = t.split(/[-/.]/)
  if (parts.length !== 3 || parts.some((p) => !/^\d+$/.test(p))) return null
  const n = parts.map(Number) as [number, number, number]
  let y: number, m: number, d: number
  switch (format) {
    case 'YYYY-MM-DD':
      ;[y, m, d] = n
      break
    case 'MM/DD/YYYY':
    case 'MM-DD-YYYY':
      ;[m, d, y] = n
      break
    default:
      ;[d, m, y] = n
  }
  if (y < 100) y += 2000
  const date = new Date(Date.UTC(y, m - 1, d))
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== m - 1 ||
    date.getUTCDate() !== d
  ) {
    return null
  }
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/**
 * Bank amount text -> signed milliunits. Handles "$1,234.56", "(12.50)", "12.50-", "-12.50"
 * and European "1.234,56". Returns null if it is not a number.
 */
export function parseAmountCell(text: string): number | null {
  let t = text.trim().replace(/[\s$€£]/g, '')
  if (t === '') return null
  let negative = false
  if (/^\(.*\)$/.test(t)) {
    negative = true
    t = t.slice(1, -1)
  }
  if (t.endsWith('-')) {
    negative = true
    t = t.slice(0, -1)
  }
  if (t.startsWith('-')) {
    negative = !negative
    t = t.slice(1)
  }
  if (t.startsWith('+')) t = t.slice(1)
  // European format: 1.234,56 or 12,5
  if (/^\d{1,3}(\.\d{3})*,\d{1,3}$/.test(t) || /^\d+,\d{1,2}$/.test(t)) {
    t = t.replace(/\./g, '').replace(',', '.')
  }
  const milli = parseMoneyInput(t)
  if (milli === null) return null
  return negative ? -milli : milli
}

function cell(row: ReadonlyArray<string>, index: number | null): string {
  return index === null ? '' : (row[index] ?? '').trim()
}

export function mapCsvRows(
  rows: ReadonlyArray<ReadonlyArray<string>>,
  mapping: CsvMapping,
): {
  rows: Array<ImportRow>
  errors: Array<{ line: number; message: string }>
} {
  const result: Array<ImportRow> = []
  const errors: Array<{ line: number; message: string }> = []
  const start = mapping.hasHeader ? 1 : 0

  for (let i = start; i < rows.length; i++) {
    const row = rows[i] ?? []
    const line = i + 1
    const date = parseDateCell(
      cell(row, mapping.dateColumn),
      mapping.dateFormat,
    )
    if (!date) {
      errors.push({ line, message: 'Invalid date' })
      continue
    }

    let amount: number | null
    if (mapping.amountMode === 'single') {
      amount = parseAmountCell(cell(row, mapping.amountColumn))
      if (amount !== null && mapping.invertSign) amount = -amount
    } else {
      const out = parseAmountCell(cell(row, mapping.outflowColumn)) ?? 0
      const inn = parseAmountCell(cell(row, mapping.inflowColumn)) ?? 0
      const bothEmpty =
        cell(row, mapping.outflowColumn) === '' &&
        cell(row, mapping.inflowColumn) === ''
      amount = bothEmpty ? null : Math.abs(inn) - Math.abs(out)
    }
    if (amount === null) {
      errors.push({ line, message: 'Invalid amount' })
      continue
    }

    result.push({
      date,
      payee: cell(row, mapping.payeeColumn),
      memo: cell(row, mapping.memoColumn),
      amount,
      fitId: null,
    })
  }
  return { rows: result, errors }
}

/** Best-effort column guesses from header names. */
export function guessMapping(
  header: ReadonlyArray<string>,
): Partial<CsvMapping> {
  const find = (re: RegExp) => {
    const i = header.findIndex((h) => re.test(h.trim().toLowerCase()))
    return i === -1 ? null : i
  }
  const date = find(/^(transaction |posting |posted )?date$|^date\b/)
  const outflow = find(/debit|withdraw|outflow|money out|paid out/)
  const inflow = find(/credit|deposit|inflow|money in|paid in/)
  const amount = find(/^amount$|^amt$|transaction amount/)
  const split = amount === null && outflow !== null && inflow !== null
  return {
    hasHeader: true,
    ...(date !== null ? { dateColumn: date } : {}),
    payeeColumn: find(/payee|description|merchant|name|details/),
    memoColumn: find(/memo|note|reference|category/),
    amountMode: split ? 'split' : 'single',
    amountColumn: amount,
    outflowColumn: outflow,
    inflowColumn: inflow,
  }
}

/**
 * Stable per-account ids used to skip rows that were already imported.
 * Bank ids (OFX FITID) when present, otherwise amount+date plus an occurrence counter so two
 * identical purchases on one day stay distinct.
 */
export function assignImportIds(rows: ReadonlyArray<ImportRow>): Array<string> {
  const seen = new Map<string, number>()
  return rows.map((r) => {
    if (r.fitId) return `ofx:${r.fitId}`
    const key = `${r.amount}:${r.date}`
    const n = (seen.get(key) ?? 0) + 1
    seen.set(key, n)
    return `${key}:${n}`
  })
}
