import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { NativeSelect } from '#/components/register/native-select'
import { categoryNameSchema } from '#/lib/categories'
import { createCategory } from '#/server/categories'
import type { CategoryGroupRow } from '#/server/categories-query'

/**
 * Inline "add a category" row for pickers. Not a <form> (it lives inside one);
 * Enter is handled manually so it never submits the outer form.
 */
export function NewCategoryInline({
  budgetId,
  groups,
  onCreated,
  onCancel,
}: {
  budgetId: string
  groups: Array<CategoryGroupRow>
  /** Called after the category exists and the page data was refreshed. */
  onCreated: (categoryId: string) => Promise<void>
  onCancel: () => void
}) {
  const [groupId, setGroupId] = useState(groups[0]?.id ?? '')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function add() {
    const parsed = categoryNameSchema.safeParse(name)
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Enter a name')
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        const { id } = await createCategory({
          data: { budgetId, groupId, name: parsed.data },
        })
        await onCreated(id)
        toast.success('Category added')
      } catch {
        setError('Could not add the category.')
      }
    })
  }

  return (
    <div className="border-border grid gap-2 rounded-md border p-3">
      <NativeSelect
        aria-label="Category group"
        value={groupId}
        onChange={(e) => setGroupId(e.target.value)}
      >
        {groups.map((g) => (
          <option key={g.id} value={g.id}>
            {g.name}
          </option>
        ))}
      </NativeSelect>
      <Input
        aria-label="New category name"
        placeholder="Category name"
        autoFocus
        autoComplete="off"
        maxLength={60}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            if (!pending) add()
          }
        }}
      />
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" size="sm" disabled={pending} onClick={add}>
          {pending ? 'Adding…' : 'Add'}
        </Button>
      </div>
    </div>
  )
}
