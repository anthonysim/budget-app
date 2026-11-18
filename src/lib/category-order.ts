/**
 * Applies locally-saved category orderings (groupId -> category ids) on top of
 * server groups. Ids missing from an override keep their server order after the
 * overridden ones; ids in an override that no longer exist are ignored.
 * Groups without an override are returned untouched.
 */
export function applyCategoryOrder<
  TCategory extends { id: string },
  TGroup extends { id: string; categories: Array<TCategory> },
>(
  groups: Array<TGroup>,
  order: Readonly<Record<string, Array<string>>>,
): Array<TGroup> {
  if (Object.keys(order).length === 0) return groups
  return groups.map((g) => {
    const ids = order[g.id]
    if (!ids) return g
    const rank = new Map(ids.map((id, i) => [id, i]))
    const categories = [...g.categories].sort(
      (a, b) =>
        (rank.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
        (rank.get(b.id) ?? Number.MAX_SAFE_INTEGER),
    )
    return { ...g, categories }
  })
}
