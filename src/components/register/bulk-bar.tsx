import { useState } from 'react'
import { Trash2Icon } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { ConfirmDialog } from '#/components/categories/confirm-dialog'
import { CategoryOptions } from '#/components/register/category-options'
import { FLAGS, FLAG_COLORS } from '#/lib/transactions'
import type { Flag } from '#/lib/transactions'
import { NativeSelect } from '#/components/register/native-select'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import type { CategoryGroupRow } from '#/server/categories-query'

const NO_FLAG = '__none__'

export function BulkBar({
  count,
  categoryGroups,
  inflowCategoryId,
  busy,
  onCategorize,
  onSetCleared,
  onDelete,
  onApprove,
  onFlag,
  onClear,
}: {
  count: number
  categoryGroups: Array<CategoryGroupRow>
  inflowCategoryId: string | null
  busy: boolean
  /** null = uncategorized */
  onCategorize: (categoryId: string | null) => void
  onSetCleared: (cleared: 'cleared' | 'uncleared') => void
  onDelete: () => void
  onApprove: () => void
  /** null clears the flag */
  onFlag: (flag: Flag | null) => void
  onClear: () => void
}) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  return (
    <div
      role="region"
      aria-label="Bulk actions"
      className="bg-muted flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-sm"
    >
      <span className="font-medium">{count} selected</span>
      <NativeSelect
        aria-label="Categorize selected"
        className="w-48"
        value="__none__"
        disabled={busy}
        onChange={(e) => {
          const v = e.target.value
          if (v === '__none__') return
          onCategorize(v === '' ? null : v)
        }}
      >
        <option value="__none__" disabled>
          Categorize as…
        </option>
        <CategoryOptions
          groups={categoryGroups}
          inflowCategoryId={inflowCategoryId}
        />
      </NativeSelect>
      <Button
        size="sm"
        variant="outline"
        disabled={busy}
        onClick={() => onSetCleared('cleared')}
      >
        Mark cleared
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={busy}
        onClick={() => onSetCleared('uncleared')}
      >
        Mark uncleared
      </Button>
      <Select
        value=""
        disabled={busy}
        onValueChange={(v) => onFlag(v === NO_FLAG ? null : (v as Flag))}
      >
        <SelectTrigger aria-label="Flag selected" size="sm" className="w-36">
          <SelectValue placeholder="Flag as…" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NO_FLAG}>No flag</SelectItem>
          {FLAGS.map((f) => (
            <SelectItem key={f} value={f}>
              <span
                aria-hidden
                className="inline-block size-2.5 rounded-full"
                style={{ background: FLAG_COLORS[f] }}
              />
              <span className="capitalize">{f}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button size="sm" variant="outline" disabled={busy} onClick={onApprove}>
        Approve
      </Button>
      <Button
        size="sm"
        variant="destructive"
        disabled={busy}
        onClick={() => setDeleteOpen(true)}
      >
        <Trash2Icon /> Delete
      </Button>
      <Button size="sm" variant="ghost" className="ml-auto" onClick={onClear}>
        Clear selection
      </Button>
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete ${count} transaction${count === 1 ? '' : 's'}?`}
        description="This permanently deletes the selected transactions. Reconciled transactions are skipped."
        confirmLabel="Delete"
        onConfirm={onDelete}
      />
    </div>
  )
}
