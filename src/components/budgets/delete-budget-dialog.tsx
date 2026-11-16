import { useTransition } from 'react'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '#/components/ui/alert-dialog'
import { deleteBudget } from '#/server/budgets'

export function DeleteBudgetDialog({
  budgetId,
  name,
  open,
  onOpenChange,
}: {
  budgetId: string
  name: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function onConfirm(e: React.MouseEvent) {
    e.preventDefault() // keep the dialog open until the request finishes
    startTransition(async () => {
      try {
        await deleteBudget({ data: { budgetId } })
        onOpenChange(false)
        toast.success('Budget deleted')
        // Leave the deleted budget's route first (its loader would now 404), then refresh.
        // /budget picks the next budget, or the "create your first budget" screen.
        await router.navigate({ to: '/budget' })
        await router.invalidate()
      } catch {
        toast.error('Could not delete the budget')
      }
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete “{name}”?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes the budget and everything in it. This
            cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={pending}>
            {pending ? 'Deleting…' : 'Delete budget'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
