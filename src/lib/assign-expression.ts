/**
 * Evaluates what a user types into an "Assigned" cell, relative to the current value.
 *
 *   "150"        -> 150.00
 *   "+50" "-20"  -> current + 50 / current - 20
 *   "*2" "/2"    -> current * 2 / current / 2
 *   "100+25.5"   -> 125.50      (+ - * / and parentheses)
 *   "$1,200"     -> 1200.00
 *
 * Returns milliunits (rounded), or null if the input is not valid.
 * No eval(): a small recursive-descent parser.
 */
export function evalAssignedInput(
  input: string,
  currentMilli: number,
): number | null {
  const text = input.replace(/[$,\s]/g, '')
  if (text === '') return null

  const first = text[0]
  const relative =
    first === '+' || first === '-' || first === '*' || first === '/'
  const source = relative ? `(${currentMilli / 1000})${text}` : text

  const parser = new Parser(source)
  const value = parser.parse()
  if (value === null || !Number.isFinite(value)) return null
  return Math.round(value * 1000)
}

class Parser {
  private pos = 0
  constructor(private readonly s: string) {}

  parse(): number | null {
    const v = this.expr()
    return v !== null && this.pos === this.s.length ? v : null
  }

  private expr(): number | null {
    let left = this.term()
    while (left !== null && (this.peek() === '+' || this.peek() === '-')) {
      const op = this.s[this.pos++]
      const right = this.term()
      if (right === null) return null
      left = op === '+' ? left + right : left - right
    }
    return left
  }

  private term(): number | null {
    let left = this.factor()
    while (left !== null && (this.peek() === '*' || this.peek() === '/')) {
      const op = this.s[this.pos++]
      const right = this.factor()
      if (right === null) return null
      if (op === '/' && right === 0) return null
      left = op === '*' ? left * right : left / right
    }
    return left
  }

  private factor(): number | null {
    const c = this.peek()
    if (c === '-') {
      this.pos++
      const v = this.factor()
      return v === null ? null : -v
    }
    if (c === '(') {
      this.pos++
      const v = this.expr()
      if (v === null || this.peek() !== ')') return null
      this.pos++
      return v
    }
    return this.number()
  }

  private number(): number | null {
    const m = /^\d*\.?\d+|^\d+\.?/.exec(this.s.slice(this.pos))
    if (!m) return null
    this.pos += m[0].length
    return Number(m[0])
  }

  private peek(): string | undefined {
    return this.s[this.pos]
  }
}
