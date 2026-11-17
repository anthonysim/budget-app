import { cn } from '#/lib/utils'

/** The ganso wordmark. 간소 is Korean for "simplicity". */
export function Wordmark({
  size = 'sm',
  className,
}: {
  size?: 'sm' | 'lg'
  className?: string
}) {
  return (
    <span
      className={cn(
        'font-semibold tracking-tight lowercase',
        size === 'sm' ? 'text-lg' : 'text-5xl',
        className,
      )}
    >
      ganso
    </span>
  )
}
