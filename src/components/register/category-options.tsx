import type { CategoryGroupRow } from '#/server/categories-query'

/**
 * <option>/<optgroup> list for category pickers.
 * Hidden categories are omitted unless they are the currently selected one.
 */
export function CategoryOptions({
  groups,
  inflowCategoryId,
  selectedId,
  uncategorizedLabel = 'Uncategorized',
}: {
  groups: Array<CategoryGroupRow>
  inflowCategoryId: string | null
  selectedId?: string | null
  uncategorizedLabel?: string
}) {
  return (
    <>
      <option value="">{uncategorizedLabel}</option>
      {inflowCategoryId ? (
        <option value={inflowCategoryId}>Inflow: Ready to Assign</option>
      ) : null}
      {groups.map((g) => {
        const cats = g.categories.filter(
          (c) => (!g.hidden && !c.hidden) || c.id === selectedId,
        )
        return cats.length === 0 ? null : (
          <optgroup key={g.id} label={g.name}>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </optgroup>
        )
      })}
    </>
  )
}
