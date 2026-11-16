import { z } from 'zod'

export const searchSchema = z.object({
  budgetId: z.uuid(),
  q: z.string().trim().min(1).max(100),
})

export interface SearchResults {
  transactions: Array<{
    id: string
    accountId: string
    accountName: string
    date: string
    payeeName: string | null
    categoryName: string | null
    memo: string | null
    amount: number
  }>
  accounts: Array<{ id: string; name: string }>
  categories: Array<{ id: string; name: string; groupName: string }>
}

/** Escapes LIKE wildcards so user text is matched literally. */
export function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, (c) => `\\${c}`)
}
