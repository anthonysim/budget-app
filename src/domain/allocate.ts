/**
 * Splits an integer `total` across `weights` proportionally using exact integer math
 * (largest remainder method). The result always sums to `total`.
 * Weights must be non-negative integers; if they sum to 0 the result is all zeros.
 */
export function allocateProportionally(
  total: number,
  weights: ReadonlyArray<number>,
): Array<number> {
  const sumW = weights.reduce((s, w) => s + w, 0)
  if (total === 0 || sumW === 0) return weights.map(() => 0)

  const T = BigInt(total)
  const W = BigInt(sumW)
  const shares = weights.map((w) => {
    const num = T * BigInt(w)
    return { base: num / W, rem: num % W }
  })
  const result = shares.map((s) => s.base)
  let left = T - result.reduce((s, v) => s + v, 0n)

  // give leftover units to the largest remainders (ties: earlier index first)
  const order = shares
    .map((s, i) => ({ i, rem: s.rem }))
    .sort((a, b) => (a.rem === b.rem ? a.i - b.i : a.rem > b.rem ? -1 : 1))
  for (const { i } of order) {
    if (left === 0n) break
    if (weights[i] === 0) continue
    result[i] = (result[i] ?? 0n) + 1n
    left -= 1n
  }
  return result.map(Number)
}
