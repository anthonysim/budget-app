import { useState } from 'react'
import { useHotkey } from '#/hooks/use-hotkey'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'

const MOD = '⌘/Ctrl'

const SHORTCUTS: Array<{ keys: Array<string>; label: string }> = [
  { keys: [MOD, 'I'], label: 'Toggle sidebar' },
  { keys: [MOD, 'K'], label: 'Search' },
  { keys: [MOD, 'Z'], label: 'Undo budget change' },
  { keys: [MOD, 'Shift', 'Z'], label: 'Redo budget change' },
  { keys: [MOD, '/'], label: 'Show keyboard shortcuts' },
]

export function ShortcutsDialog() {
  const [open, setOpen] = useState(false)

  useHotkey('/', () => setOpen((o) => !o), { allowInInputs: true })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>
            Press ⌘/Ctrl + / any time to open or close this list.
          </DialogDescription>
        </DialogHeader>
        <ul className="flex flex-col gap-2">
          {SHORTCUTS.map((s) => (
            <li
              key={s.label}
              className="flex items-center justify-between gap-4 text-sm"
            >
              <span>{s.label}</span>
              <span className="flex items-center gap-1">
                {s.keys.map((k) => (
                  <kbd
                    key={k}
                    className="bg-muted text-muted-foreground rounded border px-1.5 py-0.5 font-mono text-xs"
                  >
                    {k}
                  </kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  )
}
