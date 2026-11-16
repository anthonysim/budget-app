export type RuleMatchType = 'contains' | 'starts_with' | 'equals'

export interface PayeeRule {
  matchType: RuleMatchType
  pattern: string
  /** Payee name to use when the rule matches. */
  payeeName: string
  categoryId: string | null
}

export function ruleMatches(rule: PayeeRule, rawPayee: string): boolean {
  const text = rawPayee.trim().toLowerCase()
  const pattern = rule.pattern.trim().toLowerCase()
  if (pattern === '') return false
  switch (rule.matchType) {
    case 'contains':
      return text.includes(pattern)
    case 'starts_with':
      return text.startsWith(pattern)
    case 'equals':
      return text === pattern
  }
}

/** First matching rule wins (rules are applied in the order given). */
export function applyPayeeRules(
  rawPayee: string,
  rules: ReadonlyArray<PayeeRule>,
): { payeeName: string; categoryId: string | null; matched: boolean } {
  for (const rule of rules) {
    if (ruleMatches(rule, rawPayee)) {
      return {
        payeeName: rule.payeeName,
        categoryId: rule.categoryId,
        matched: true,
      }
    }
  }
  return { payeeName: rawPayee.trim(), categoryId: null, matched: false }
}
