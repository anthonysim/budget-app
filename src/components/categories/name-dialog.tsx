import { useState, useTransition } from 'react'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { categoryNameSchema } from '#/lib/categories'

/** Small controlled dialog that asks for a single name. */
export function NameDialog({
  open,
  onOpenChange,
  title,
  label,
  initialValue = '',
  submitLabel,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  label: string
  initialValue?: string
  submitLabel: string
  onSubmit: (name: string) => Promise<void>
}) {
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const parsed = categoryNameSchema.safeParse(
      new FormData(e.currentTarget).get('name'),
    )
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid name')
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        await onSubmit(parsed.data)
        onOpenChange(false)
      } catch {
        setError('Something went wrong. Try again.')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form
          method="post"
          onSubmit={handleSubmit}
          noValidate
          className="grid gap-4"
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="name-dialog-input">{label}</Label>
            <Input
              id="name-dialog-input"
              name="name"
              defaultValue={initialValue}
              maxLength={60}
              autoFocus
              required
            />
            {error ? (
              <p role="alert" className="text-destructive text-sm">
                {error}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? 'Saving…' : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
