import { evalAssignedInput } from '#/lib/assign-expression'
import { Money } from '#/components/accounts/money'

function plain(milli: number): string {
  return (milli / 1000).toFixed(2)
}

/**
 * Editable Assigned amount. Accepts expressions ("+50", "*2", "100+25").
 * Commits on Enter or blur; Escape reverts. Remounts (via key) when the saved value changes.
 */
export function AssignedCell({
  name,
  assigned,
  currency,
  canEdit,
  onCommit,
}: {
  name: string
  assigned: number
  currency: string
  canEdit: boolean
  /** Called with the new absolute milliunits when the value changed. */
  onCommit: (next: number) => void
}) {
  if (!canEdit) {
    return <Money value={assigned} currency={currency} />
  }

  function commit(input: HTMLInputElement) {
    const next = evalAssignedInput(input.value, assigned)
    if (next === null) {
      input.value = plain(assigned)
      input.setAttribute('aria-invalid', 'true')
      return
    }
    input.removeAttribute('aria-invalid')
    input.value = plain(next)
    if (next !== assigned) onCommit(next)
  }

  return (
    <input
      key={`${assigned}`}
      aria-label={`Assigned for ${name}`}
      inputMode="decimal"
      autoComplete="off"
      defaultValue={plain(assigned)}
      onFocus={(e) => e.currentTarget.select()}
      onBlur={(e) => commit(e.currentTarget)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
        if (e.key === 'Escape') {
          e.currentTarget.value = plain(assigned)
          e.currentTarget.blur()
        }
      }}
      className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 aria-[invalid=true]:border-destructive -mr-[9px] h-8 w-28 rounded-md border px-2 text-right text-sm tabular-nums shadow-xs outline-none focus-visible:ring-[3px]"
    />
  )
}
