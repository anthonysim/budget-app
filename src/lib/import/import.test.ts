import { describe, expect, it } from 'vitest'
import { detectDelimiter, parseCsv } from './csv'
import {
  assignImportIds,
  guessMapping,
  mapCsvRows,
  parseAmountCell,
  parseDateCell,
} from './map'
import type { CsvMapping, ImportRow } from './map'
import { matchImported } from './match'
import { looksLikeOfx, parseOfx } from './ofx'
import { applyPayeeRules } from './rules'

describe('parseCsv', () => {
  it('parses quotes, escaped quotes and embedded delimiters and newlines', () => {
    const text =
      'Date,Payee,Amount\r\n2026-11-01,"Smith, Bob",-12.50\n2026-11-02,"He said ""hi""\nthere",3\n'
    expect(parseCsv(text)).toEqual([
      ['Date', 'Payee', 'Amount'],
      ['2026-11-01', 'Smith, Bob', '-12.50'],
      ['2026-11-02', 'He said "hi"\nthere', '3'],
    ])
  })
  it('strips a BOM and blank lines, and detects semicolons and tabs', () => {
    expect(parseCsv('﻿a;b\n\n1;2\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
    expect(detectDelimiter('a\tb\tc')).toBe('\t')
    expect(detectDelimiter('"a,b";c;d')).toBe(';')
  })
})

describe('cells', () => {
  it('parses dates in several formats and rejects impossible ones', () => {
    expect(parseDateCell('2026-11-05', 'YYYY-MM-DD')).toBe('2026-11-05')
    expect(parseDateCell('11/05/2026', 'MM/DD/YYYY')).toBe('2026-11-05')
    expect(parseDateCell('05/11/2026', 'DD/MM/YYYY')).toBe('2026-11-05')
    expect(parseDateCell('5.11.2026', 'DD.MM.YYYY')).toBe('2026-11-05')
    expect(parseDateCell('11/05/26', 'MM/DD/YYYY')).toBe('2026-11-05')
    expect(parseDateCell('2026-11-05 14:30:00', 'YYYY-MM-DD')).toBe(
      '2026-11-05',
    )
    expect(parseDateCell('02/30/2026', 'MM/DD/YYYY')).toBeNull()
    expect(parseDateCell('nope', 'MM/DD/YYYY')).toBeNull()
  })
  it('parses bank amount formats', () => {
    expect(parseAmountCell('$1,234.56')).toBe(1_234_560)
    expect(parseAmountCell('-12.50')).toBe(-12_500)
    expect(parseAmountCell('(12.50)')).toBe(-12_500)
    expect(parseAmountCell('12.50-')).toBe(-12_500)
    expect(parseAmountCell('+7')).toBe(7_000)
    expect(parseAmountCell('1.234,56')).toBe(1_234_560)
    expect(parseAmountCell('12,5')).toBe(12_500)
    expect(parseAmountCell('')).toBeNull()
    expect(parseAmountCell('abc')).toBeNull()
  })
})

const mapping = (over: Partial<CsvMapping> = {}): CsvMapping => ({
  hasHeader: true,
  dateColumn: 0,
  dateFormat: 'MM/DD/YYYY',
  payeeColumn: 1,
  memoColumn: 2,
  amountMode: 'single',
  amountColumn: 3,
  outflowColumn: null,
  inflowColumn: null,
  invertSign: false,
  ...over,
})

describe('mapCsvRows', () => {
  const rows = [
    ['Date', 'Description', 'Memo', 'Amount'],
    ['11/01/2026', 'Whole Foods', 'weekly', '-42.50'],
    ['11/02/2026', 'Paycheck', '', '1500.00'],
    ['13/45/2026', 'Bad date', '', '1'],
    ['11/03/2026', 'Bad amount', '', 'x'],
  ]
  it('maps a single signed amount column and reports bad rows', () => {
    const r = mapCsvRows(rows, mapping())
    expect(r.rows).toEqual([
      {
        date: '2026-11-01',
        payee: 'Whole Foods',
        memo: 'weekly',
        amount: -42_500,
        fitId: null,
      },
      {
        date: '2026-11-02',
        payee: 'Paycheck',
        memo: '',
        amount: 1_500_000,
        fitId: null,
      },
    ])
    expect(r.errors).toEqual([
      { line: 4, message: 'Invalid date' },
      { line: 5, message: 'Invalid amount' },
    ])
  })
  it('inverts the sign for card exports where charges are positive', () => {
    const r = mapCsvRows(rows.slice(0, 2), mapping({ invertSign: true }))
    expect(r.rows[0]?.amount).toBe(42_500)
  })
  it('maps separate outflow and inflow columns', () => {
    const split = [
      ['Date', 'Desc', 'Memo', 'Debit', 'Credit'],
      ['11/01/2026', 'Store', '', '20.00', ''],
      ['11/02/2026', 'Refund', '', '', '5.00'],
      ['11/03/2026', 'Empty', '', '', ''],
    ]
    const r = mapCsvRows(
      split,
      mapping({
        amountMode: 'split',
        amountColumn: null,
        outflowColumn: 3,
        inflowColumn: 4,
      }),
    )
    expect(r.rows.map((x) => x.amount)).toEqual([-20_000, 5_000])
    expect(r.errors).toHaveLength(1)
  })
  it('guesses columns from headers', () => {
    expect(
      guessMapping(['Posting Date', 'Description', 'Amount']),
    ).toMatchObject({
      dateColumn: 0,
      payeeColumn: 1,
      amountMode: 'single',
      amountColumn: 2,
    })
    expect(
      guessMapping(['Date', 'Payee', 'Withdrawals', 'Deposits']),
    ).toMatchObject({
      amountMode: 'split',
      outflowColumn: 2,
      inflowColumn: 3,
    })
  })
})

describe('assignImportIds', () => {
  const r = (over: Partial<ImportRow>): ImportRow => ({
    date: '2026-11-01',
    payee: '',
    memo: '',
    amount: -5_000,
    fitId: null,
    ...over,
  })
  it('counts occurrences of identical rows on the same day', () => {
    expect(
      assignImportIds([
        r({}),
        r({}),
        r({ amount: -1 }),
        r({ date: '2026-11-02' }),
      ]),
    ).toEqual([
      '-5000:2026-11-01:1',
      '-5000:2026-11-01:2',
      '-1:2026-11-01:1',
      '-5000:2026-11-02:1',
    ])
  })
  it('prefers bank transaction ids', () => {
    expect(assignImportIds([r({ fitId: 'ABC123' })])).toEqual(['ofx:ABC123'])
  })
})

describe('parseOfx', () => {
  const sgml = `OFXHEADER:100
DATA:OFXSGML
<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKTRANLIST>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20261101120000[-5:EST]
<TRNAMT>-42.50
<FITID>2026110101
<NAME>WHOLE FOODS &amp; CO
<MEMO>Card purchase
</STMTTRN>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20261102
<TRNAMT>1500.00
<FITID>2026110201
<NAME>PAYROLL
</STMTTRN>
<STMTTRN>
<DTPOSTED>bogus
<TRNAMT>1
</STMTTRN>
</BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>`
  it('parses SGML statements', () => {
    expect(looksLikeOfx(sgml)).toBe(true)
    const r = parseOfx(sgml)
    expect(r.transactions).toEqual([
      {
        date: '2026-11-01',
        amount: -42_500,
        payee: 'WHOLE FOODS & CO',
        memo: 'Card purchase',
        fitId: '2026110101',
      },
      {
        date: '2026-11-02',
        amount: 1_500_000,
        payee: 'PAYROLL',
        memo: '',
        fitId: '2026110201',
      },
    ])
    expect(r.errors).toHaveLength(1)
  })
  it('parses XML statements and decimal commas', () => {
    const xml =
      '<OFX><STMTTRN><DTPOSTED>20261103</DTPOSTED><TRNAMT>-12,50</TRNAMT><FITID>9</FITID><NAME>Cafe</NAME></STMTTRN></OFX>'
    expect(parseOfx(xml).transactions[0]).toMatchObject({
      date: '2026-11-03',
      amount: -12_500,
      payee: 'Cafe',
    })
  })
  it('reports a file with no transactions', () => {
    expect(parseOfx('<OFX></OFX>').errors[0]).toMatch(/No transactions/)
    expect(looksLikeOfx('Date,Amount')).toBe(false)
  })
})

describe('applyPayeeRules', () => {
  const rules = [
    {
      matchType: 'starts_with' as const,
      pattern: 'AMZN',
      payeeName: 'Amazon',
      categoryId: 'shopping',
    },
    {
      matchType: 'contains' as const,
      pattern: 'whole foods',
      payeeName: 'Whole Foods',
      categoryId: 'groceries',
    },
    {
      matchType: 'equals' as const,
      pattern: 'NETFLIX',
      payeeName: 'Netflix',
      categoryId: null,
    },
  ]
  it('renames and sets the default category; first match wins', () => {
    expect(applyPayeeRules('AMZN Mktp US*2K4', rules)).toEqual({
      payeeName: 'Amazon',
      categoryId: 'shopping',
      matched: true,
    })
    expect(applyPayeeRules('POS WHOLE FOODS #123', rules).payeeName).toBe(
      'Whole Foods',
    )
    expect(applyPayeeRules('netflix', rules).payeeName).toBe('Netflix')
  })
  it('leaves unmatched payees alone (trimmed)', () => {
    expect(applyPayeeRules('  Local Cafe ', rules)).toEqual({
      payeeName: 'Local Cafe',
      categoryId: null,
      matched: false,
    })
    expect(applyPayeeRules('NETFLIX.COM', rules).matched).toBe(false)
  })
})

describe('matchImported', () => {
  const candidates = [
    { id: 'a', date: '2026-11-01', amount: -5_000 },
    { id: 'b', date: '2026-11-04', amount: -5_000 },
    { id: 'c', date: '2026-10-01', amount: -5_000 },
  ]
  it('matches the closest date within the window and uses each candidate once', () => {
    const m = matchImported(
      [
        { date: '2026-11-03', amount: -5_000 },
        { date: '2026-11-03', amount: -5_000 },
        { date: '2026-11-03', amount: -5_000 },
      ],
      candidates,
    )
    expect(m.get(0)).toBe('b') // 1 day away, closer than a (2 days)
    expect(m.get(1)).toBe('a')
    expect(m.has(2)).toBe(false) // c is outside the 10 day window
  })
  it('requires the exact amount', () => {
    expect(
      matchImported([{ date: '2026-11-01', amount: -4_999 }], candidates).size,
    ).toBe(0)
  })
})
