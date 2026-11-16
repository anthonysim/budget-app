import { useTransition } from 'react'
import { useRouter } from '@tanstack/react-router'
import { MailIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '#/components/ui/button'
import type { MyInvite } from '#/lib/sharing'
import { acceptInvite, declineInvite } from '#/server/members'

/** Pending invitations for the signed-in user, with Accept and Decline. */
export function InvitesBanner({ invites }: { invites: Array<MyInvite> }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  if (invites.length === 0) return null

  function accept(id: string) {
    startTransition(async () => {
      try {
        const { budgetId } = await acceptInvite({ data: { inviteId: id } })
        await router.invalidate()
        toast.success('You joined the budget')
        await router.navigate({
          to: '/budgets/$budgetId/budget',
          params: { budgetId },
        })
      } catch {
        toast.error(
          'Could not accept the invitation. Make sure your email address is confirmed.',
        )
      }
    })
  }

  function decline(id: string) {
    startTransition(async () => {
      try {
        await declineInvite({ data: { inviteId: id } })
        await router.invalidate()
        toast.success('Invitation declined')
      } catch {
        toast.error('Could not decline the invitation')
      }
    })
  }

  return (
    <section aria-label="Invitations" className="flex flex-col gap-2">
      {invites.map((i) => (
        <div
          key={i.id}
          role="status"
          className="bg-muted flex flex-wrap items-center justify-between gap-2 rounded-lg border px-4 py-2 text-sm"
        >
          <span className="flex items-center gap-2">
            <MailIcon className="size-4" aria-hidden />
            <span>
              {i.invitedByEmail ?? 'Someone'} invited you to{' '}
              <strong>{i.budgetName}</strong> as{' '}
              {i.role === 'editor' ? 'an editor' : 'a viewer'}
            </span>
          </span>
          <span className="flex gap-2">
            <Button size="sm" disabled={pending} onClick={() => accept(i.id)}>
              Accept
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => decline(i.id)}
            >
              Decline
            </Button>
          </span>
        </div>
      ))}
    </section>
  )
}
