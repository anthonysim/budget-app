import { Skeleton } from '#/components/ui/skeleton'

export function PendingView() {
  return (
    <div role="status" aria-label="Loading" className="flex flex-col gap-4 p-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-full max-w-md" />
      <Skeleton className="h-4 w-full max-w-sm" />
    </div>
  )
}
