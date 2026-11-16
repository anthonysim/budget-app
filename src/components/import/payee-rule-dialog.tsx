import { useState, useTransition } from 'react'
import type { ReactNode } from 'react'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import { CategoryOptions } from '#/components/register/category-options'
import { NativeSelect } from '#/components/register/native-select'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { MATCH_TYPES, payeeRuleSchema } from '#/lib/import/schemas'
import { createPayeeRule, updatePayeeRule } from '#/server/import'
import type { CategoryGroupRow } from '#/server/categories-query'

type MatchType = (typeof MATCH_TYPES)[number]

export const MATCH_LABELS: Record<MatchType, string> = {
  contains: 'contains',
  starts_with: 'starts with',
  equals: 'is exactly',
}

export interface RuleRow {
  id: string
  matchType: MatchType
  pattern: string
  payeeName: string
  categoryId: string | null
}

/** Create or edit a payee rule. The form remounts each time the dialog opens. */
export function PayeeRuleDialog({
  budgetId,
  categoryGroups,
  rule,
  children,
}: {
  budgetId: string
  categoryGroups: Array<CategoryGroupRow>
  rule?: RuleRow
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <RuleForm
          budgetId={budgetId}
          categoryGroups={categoryGroups}
          rule={rule}
          onDone={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  )
}

function RuleForm({
  budgetId,
  categoryGroups,
  rule,
  onDone,
}: {
  budgetId: string
  categoryGroups: Array<CategoryGroupRow>
  rule?: RuleRow
  onDone: () => void
}) {
  const router = useRouter()
  const [matchType, setMatchType] = useState<MatchType>(
    rule?.matchType ?? 'contains',
  )
  const [pattern, setPattern] = useState(rule?.pattern ?? '')
  const [payeeName, setPayeeName] = useState(rule?.payeeName ?? '')
  const [categoryId, setCategoryId] = useState(rule?.categoryId ?? '')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const parsed = payeeRuleSchema.safeParse({
      budgetId,
      matchType,
      pattern,
      payeeName,
      categoryId: categoryId === '' ? null : categoryId,
    })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check the rule')
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        if (rule)
          await updatePayeeRule({ data: { ...parsed.data, ruleId: rule.id } })
        else await createPayeeRule({ data: parsed.data })
        await router.invalidate()
        toast.success(rule ? 'Rule saved' : 'Rule added')
        onDone()
      } catch {
        setError('Could not save the rule.')
      }
    })
  }

  return (
    <form method="post" onSubmit={submit} noValidate className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{rule ? 'Edit rule' : 'Add payee rule'}</DialogTitle>
      </DialogHeader>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label htmlFor="rule-match">When the bank payee</Label>
          <NativeSelect
            id="rule-match"
            value={matchType}
            onChange={(e) => setMatchType(e.target.value as MatchType)}
          >
            {MATCH_TYPES.map((m) => (
              <option key={m} value={m}>
                {MATCH_LABELS[m]}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="rule-pattern">Text</Label>
          <Input
            id="rule-pattern"
            autoFocus
            maxLength={100}
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
          />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="rule-payee">Rename the payee to</Label>
        <Input
          id="rule-payee"
          maxLength={80}
          value={payeeName}
          onChange={(e) => setPayeeName(e.target.value)}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="rule-category">And use this category (optional)</Label>
        <NativeSelect
          id="rule-category"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          <CategoryOptions
            groups={categoryGroups}
            inflowCategoryId={null}
            selectedId={categoryId}
            uncategorizedLabel="No default category"
          />
        </NativeSelect>
      </div>
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
      <DialogFooter>
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Save'}
        </Button>
      </DialogFooter>
    </form>
  )
}
