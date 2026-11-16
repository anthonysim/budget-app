import { useState, useTransition } from 'react'
import { useRouter } from '@tanstack/react-router'
import { NotebookPenIcon } from 'lucide-react'
import { toast } from 'sonner'
import { textareaClass } from '#/components/categories/note-dialog'
import { Button } from '#/components/ui/button'
import { saveMonthNote } from '#/server/budget-month'

/** Collapsible free-text note for the month. Saves when the field loses focus. */
export function MonthNote({
  budgetId,
  month,
  note,
  canEdit,
}: {
  budgetId: string
  month: string
  note: string | null
  canEdit: boolean
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [, startTransition] = useTransition()

  if (!note && !canEdit) return null

  function save(value: string) {
    const next = value.trim()
    if (next === (note ?? '')) return
    startTransition(async () => {
      try {
        await saveMonthNote({ data: { budgetId, month, note: next } })
        await router.invalidate()
        toast.success(next ? 'Note saved' : 'Note removed')
      } catch {
        toast.error('Could not save the note')
      }
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="ghost"
        size="sm"
        className="w-fit"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <NotebookPenIcon /> {note ? 'Month note' : 'Add a note for this month'}
      </Button>
      {!open && note ? (
        <p className="text-muted-foreground line-clamp-2 text-sm whitespace-pre-wrap">
          {note}
        </p>
      ) : null}
      {open ? (
        canEdit ? (
          <textarea
            // remount when the saved note or month changes so the field shows the new value
            key={`${month}-${note ?? ''}`}
            aria-label="Month note"
            className={textareaClass}
            maxLength={2000}
            defaultValue={note ?? ''}
            onBlur={(e) => save(e.currentTarget.value)}
          />
        ) : (
          <p className="text-sm whitespace-pre-wrap">{note}</p>
        )
      ) : null}
    </div>
  )
}
