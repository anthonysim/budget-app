import { useEffect, useEffectEvent } from 'react'

interface HotkeyOptions {
  /** Require (true) or forbid (false) Shift. Omit to ignore Shift. */
  shift?: boolean
  /** Turn the shortcut off without unmounting. Defaults to true. */
  enabled?: boolean
  /** Fire while an input, select or textarea has focus. Defaults to false. */
  allowInInputs?: boolean
}

function isTextField(target: EventTarget | null) {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLSelectElement ||
    target instanceof HTMLTextAreaElement
  )
}

/**
 * Run `handler` on Cmd/Ctrl + `key`. Calls preventDefault on a match.
 * The handler may change every render without re-attaching the listener.
 */
export function useHotkey(
  key: string,
  handler: () => void,
  { shift, enabled = true, allowInInputs = false }: HotkeyOptions = {},
) {
  const onHotkey = useEffectEvent(handler)

  useEffect(() => {
    if (!enabled) return
    const wanted = key.toLowerCase()
    function onKeyDown(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey) || e.altKey) return
      if (e.key.toLowerCase() !== wanted) return
      if (shift !== undefined && e.shiftKey !== shift) return
      if (!allowInInputs && isTextField(e.target)) return
      e.preventDefault()
      onHotkey()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [key, shift, enabled, allowInInputs])
}
