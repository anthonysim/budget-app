import type { ComponentProps } from 'react'
import { cn } from '#/lib/utils'

/** Plain <select> styled like Input. Native selects are fast and keyboard-friendly in table rows. */
export function NativeSelect({
  className,
  ...props
}: ComponentProps<'select'>) {
  return (
    <select
      className={cn(
        'border-input bg-background h-8 w-full rounded-md border px-2 text-sm shadow-xs outline-none',
        'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
        'disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}
