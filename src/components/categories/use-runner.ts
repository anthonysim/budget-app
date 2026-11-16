import { useTransition } from 'react'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'

/** Runs a server mutation, refreshes route data, and toasts on success/failure. */
export function useRunner() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function run(action: () => Promise<unknown>, success?: string) {
    startTransition(async () => {
      try {
        await action()
        await router.invalidate()
        if (success) toast.success(success)
      } catch {
        toast.error('Something went wrong. Try again.')
      }
    })
  }

  /** Refresh route data after a mutation you awaited yourself. */
  async function refresh(success?: string) {
    await router.invalidate()
    if (success) toast.success(success)
  }

  return { run, refresh, pending }
}
