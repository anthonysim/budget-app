import { parseMoneyInput } from '#/lib/money'

export interface OfxTransaction {
  /** 'YYYY-MM-DD' */
  date: string
  /** Signed milliunits (negative = money out). */
  amount: number
  payee: string
  memo: string
  fitId: string | null
}

const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&apos;': "'",
}

function decode(value: string): string {
  return value
    .replace(/&(amp|lt|gt|quot|apos);/g, (m) => ENTITIES[m] ?? m)
    .trim()
}

/** Value of the first <TAG> in a block. Works for SGML (no closing tags) and XML OFX. */
function tag(block: string, name: string): string | null {
  const m = new RegExp(`<${name}>([^<\\r\\n]*)`, 'i').exec(block)
  return m?.[1] !== undefined ? decode(m[1]) : null
}

function parseAmount(raw: string): number | null {
  const cleaned = raw.trim()
  // some banks use a decimal comma: "-12,50"
  const normalized =
    cleaned.includes(',') && !cleaned.includes('.')
      ? cleaned.replace(',', '.')
      : cleaned
  return parseMoneyInput(normalized)
}

export function looksLikeOfx(text: string): boolean {
  return /OFXHEADER|<OFX>/i.test(text)
}

/** Parses OFX/QFX bank or credit card statements (SGML 1.x and XML 2.x). */
export function parseOfx(text: string): {
  transactions: Array<OfxTransaction>
  errors: Array<string>
} {
  const transactions: Array<OfxTransaction> = []
  const errors: Array<string> = []
  const blocks = text.split(/<STMTTRN>/i).slice(1)

  blocks.forEach((rawBlock, index) => {
    const block =
      rawBlock.split(/<\/STMTTRN>|<\/BANKTRANLIST>|<\/CCSTMTRS>/i)[0] ?? ''
    const posted = tag(block, 'DTPOSTED')
    const amountRaw = tag(block, 'TRNAMT')
    const date =
      posted && /^\d{8}/.test(posted)
        ? `${posted.slice(0, 4)}-${posted.slice(4, 6)}-${posted.slice(6, 8)}`
        : null
    const amount = amountRaw ? parseAmount(amountRaw) : null
    if (!date || amount === null) {
      errors.push(`Transaction ${index + 1}: missing or invalid date or amount`)
      return
    }
    transactions.push({
      date,
      amount,
      payee: tag(block, 'NAME') ?? tag(block, 'PAYEE') ?? '',
      memo: tag(block, 'MEMO') ?? '',
      fitId: tag(block, 'FITID') || null,
    })
  })

  if (blocks.length === 0) errors.push('No transactions found in this OFX file')
  return { transactions, errors }
}
