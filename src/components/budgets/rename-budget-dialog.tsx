import { useState, useTransition } from 'react'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
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
import { budgetNameSchema } from '#/lib/budget-schemas'
import { renameBudget } from '#/server/budgets'

export function RenameBudgetDialog({
  budgetId,
  currentName,
  open,
  onOpenChange,
}: {
  budgetId: string
  currentName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const parsed = budgetNameSchema.safeParse(
      new FormData(e.currentTarget).get('name'),
    )
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid name')
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        await renameBudget({ data: { budgetId, name: parsed.data } })
        await router.invalidate()
        toast.success('Budget renamed')
        onOpenChange(false)
      } catch {
        setError('Could not rename the budget.')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form
          method="post"
          onSubmit={onSubmit}
          noValidate
          className="grid gap-4"
        >
          <DialogHeader>
            <DialogTitle>Rename budget</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="rename-name">Name</Label>
            <Input
              id="rename-name"
              name="name"
              defaultValue={currentName}
              maxLength={60}
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
              {pending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
