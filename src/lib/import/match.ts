const DAY_MS = 86_400_000

function dayNumber(date: string): number {
  return Math.floor(new Date(`${date}T00:00:00Z`).getTime() / DAY_MS)
}

export interface MatchCandidate {
  id: string
  date: string
  amount: number
}

/**
 * Pairs imported rows with transactions the user already entered by hand: same amount and a date
 * within `maxDays`. Each candidate is used at most once; the closest date wins.
 * Returns a Map of imported row index -> candidate id.
 */
export function matchImported(
  imported: ReadonlyArray<{ date: string; amount: number }>,
  candidates: ReadonlyArray<MatchCandidate>,
  maxDays = 10,
): Map<number, string> {
  const used = new Set<string>()
  const matches = new Map<number, string>()
  imported.forEach((row, index) => {
    const rowDay = dayNumber(row.date)
    let best: { id: string; distance: number } | null = null
    for (const c of candidates) {
      if (used.has(c.id) || c.amount !== row.amount) continue
      const distance = Math.abs(dayNumber(c.date) - rowDay)
      if (distance <= maxDays && (best === null || distance < best.distance)) {
        best = { id: c.id, distance }
      }
    }
    if (best) {
      used.add(best.id)
      matches.set(index, best.id)
    }
  })
  return matches
}
