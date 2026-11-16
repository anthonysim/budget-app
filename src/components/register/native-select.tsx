import type { ComponentProps } from 'react'
import { ChevronDownIcon } from 'lucide-react'
import { cn } from '#/lib/utils'

/** Plain <select> styled like Input. Native selects are fast and keyboard-friendly in table rows. */
export function NativeSelect({
  className,
  ...props
}: ComponentProps<'select'>) {
  return (
    <span className={cn('relative inline-block w-full', className)}>
      <select
        className={cn(
          'border-input bg-background h-8 w-full appearance-none rounded-md border pr-8 pl-2 text-sm shadow-xs outline-none',
          'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
          'disabled:opacity-50',
        )}
        {...props}
      />
      <ChevronDownIcon
        aria-hidden
        className="text-muted-foreground pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2"
      />
    </span>
  )
}
