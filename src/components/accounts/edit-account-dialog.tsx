import { useState, useTransition } from 'react'
import type { ReactNode } from 'react'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { accountNameSchema } from '#/lib/accounts'
import { updateAccount } from '#/server/accounts'

export function EditAccountDialog({
  budgetId,
  accountId,
  name,
  note,
  children,
}: {
  budgetId: string
  accountId: string
  name: string
  note: string | null
  children: ReactNode
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const parsedName = accountNameSchema.safeParse(form.get('name'))
    if (!parsedName.success) {
      setError(parsedName.error.issues[0]?.message ?? 'Invalid name')
      return
    }
    const noteText = String(form.get('note') ?? '').trim()
    if (noteText.length > 500) {
      setError('Note must be 500 characters or fewer')
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        await updateAccount({
          data: {
            budgetId,
            accountId,
            name: parsedName.data,
            note: noteText === '' ? null : noteText,
          },
        })
        await router.invalidate()
        toast.success('Account updated')
        setOpen(false)
      } catch {
        setError('Could not save changes.')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <form
          method="post"
          onSubmit={onSubmit}
          noValidate
          className="grid gap-4"
        >
          <DialogHeader>
            <DialogTitle>Edit account</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="edit-account-name">Name</Label>
            <Input
              id="edit-account-name"
              name="name"
              defaultValue={name}
              maxLength={60}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-account-note">Note</Label>
            <Input
              id="edit-account-note"
              name="note"
              defaultValue={note ?? ''}
              maxLength={500}
            />
          </div>
          {error ? (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          ) : null}
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
