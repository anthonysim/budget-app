import * as React from 'react'
import { XIcon } from 'lucide-react'
import { Input } from '#/components/ui/input'
import { cn } from '#/lib/utils'

/**
 * Controlled text input with an X button, and the Esc key, that clear it while it has text.
 * `className` sizes the wrapper; other props go to the input.
 */
function SearchInput({
  className,
  value,
  onClear,
  onKeyDown,
  ...props
}: Omit<React.ComponentProps<typeof Input>, 'value'> & {
  value: string
  onClear: () => void
}) {
  const ref = React.useRef<HTMLInputElement>(null)
  return (
    <div className={cn('relative w-full', className)}>
      <Input
        ref={ref}
        value={value}
        className="pr-8"
        onKeyDown={(e) => {
          onKeyDown?.(e)
          // Esc clears the text first; only an already-empty input lets Esc bubble on.
          if (e.key === 'Escape' && value !== '' && !e.defaultPrevented) {
            e.preventDefault()
            e.stopPropagation()
            onClear()
          }
        }}
        {...props}
      />
      {value !== '' ? (
        <button
          type="button"
          aria-label="Clear search"
          className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-0 flex w-8 items-center justify-center rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          onClick={() => {
            onClear()
            ref.current?.focus()
          }}
        >
          <XIcon className="size-4" />
        </button>
      ) : null}
    </div>
  )
}

export { SearchInput }
