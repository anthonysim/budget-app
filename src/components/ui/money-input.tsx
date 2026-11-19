import * as React from 'react'
import { Input } from '#/components/ui/input'
import { normalizeMoneyText } from '#/lib/money'

/**
 * Text input for dollar amounts. On blur a valid amount is rewritten with two decimals
 * ("50" -> "50.00"), and with `expressions` arithmetic is evaluated first. Works controlled or uncontrolled.
 */
function MoneyInput({
  onBlur,
  expressions = false,
  ...props
}: Omit<React.ComponentProps<typeof Input>, 'type' | 'inputMode'> & {
  /** Allow arithmetic such as "3201.15+35.07"; it is evaluated on blur. */
  expressions?: boolean
}) {
  return (
    <Input
      inputMode="decimal"
      autoComplete="off"
      {...props}
      onBlur={(e) => {
        onBlur?.(e)
        const el = e.currentTarget
        const next = normalizeMoneyText(el.value, expressions)
        if (next === el.value) return
        // Use the native setter + input event so React-controlled inputs see the change too.
        const set = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          'value',
        )?.set
        set?.call(el, next)
        el.dispatchEvent(new Event('input', { bubbles: true }))
      }}
    />
  )
}

export { MoneyInput }
