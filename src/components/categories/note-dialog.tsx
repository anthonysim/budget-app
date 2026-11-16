import { useState, useTransition } from 'react'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Label } from '#/components/ui/label'

export const textareaClass =
  'border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 min-h-24 w-full rounded-md border px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px]'

/** Free-text note editor. Mount only while open so it starts fresh. */
export function NoteDialog({
  open,
  onOpenChange,
  title,
  initialValue,
  maxLength = 500,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  initialValue: string
  maxLength?: number
  /** Called with the trimmed note (empty string clears it). */
  onSave: (note: string) => Promise<void>
}) {
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const note = String(new FormData(e.currentTarget).get('note') ?? '').trim()
    startTransition(async () => {
      try {
        await onSave(note)
        onOpenChange(false)
      } catch {
        setError('Could not save the note.')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form method="post" onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="note-text">Note</Label>
            <textarea
              id="note-text"
              name="note"
              className={textareaClass}
              maxLength={maxLength}
              defaultValue={initialValue}
              autoFocus
            />
            {error ? (
              <p role="alert" className="text-destructive text-sm">
                {error}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? 'Saving…' : 'Save note'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
