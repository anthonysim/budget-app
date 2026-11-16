import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { NativeSelect } from '#/components/register/native-select'
import { RANGE_LABELS, RANGE_PRESETS } from '#/domain/reports'
import type { RangePreset } from '#/domain/reports'
import { GROUP_BYS, GROUP_BY_LABELS } from '#/lib/reports'
import type { GroupBy } from '#/lib/reports'

export interface ReportFilters {
  range: RangePreset
  from?: string
  to?: string
  account?: string
  groupBy: GroupBy
}

/**
 * One filter row above every chart. It scopes everything below it, so all numbers agree.
 * Date range first (presets before a custom range).
 */
export function ReportsFilters({
  value,
  accounts,
  onChange,
}: {
  value: ReportFilters
  accounts: Array<{ id: string; name: string }>
  onChange: (patch: Partial<ReportFilters>) => void
}) {
  return (
    <div
      role="group"
      aria-label="Report filters"
      className="flex flex-wrap items-end gap-3"
    >
      <div className="grid gap-1">
        <Label htmlFor="report-range">Date range</Label>
        <NativeSelect
          id="report-range"
          className="w-44"
          value={value.range}
          onChange={(e) => onChange({ range: e.target.value as RangePreset })}
        >
          {RANGE_PRESETS.map((r) => (
            <option key={r} value={r}>
              {RANGE_LABELS[r]}
            </option>
          ))}
        </NativeSelect>
      </div>
      {value.range === 'custom' ? (
        <>
          <div className="grid gap-1">
            <Label htmlFor="report-from">From</Label>
            <Input
              id="report-from"
              type="date"
              className="h-8 w-40"
              value={value.from ?? ''}
              onChange={(e) => onChange({ from: e.target.value || undefined })}
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="report-to">To</Label>
            <Input
              id="report-to"
              type="date"
              className="h-8 w-40"
              value={value.to ?? ''}
              onChange={(e) => onChange({ to: e.target.value || undefined })}
            />
          </div>
        </>
      ) : null}
      <div className="grid gap-1">
        <Label htmlFor="report-account">Account</Label>
        <NativeSelect
          id="report-account"
          className="w-48"
          value={value.account ?? 'all'}
          onChange={(e) =>
            onChange({
              account: e.target.value === 'all' ? undefined : e.target.value,
            })
          }
        >
          <option value="all">All accounts</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="grid gap-1">
        <Label htmlFor="report-group-by">Spending by</Label>
        <NativeSelect
          id="report-group-by"
          className="w-40"
          value={value.groupBy}
          onChange={(e) => onChange({ groupBy: e.target.value as GroupBy })}
        >
          {GROUP_BYS.map((g) => (
            <option key={g} value={g}>
              {GROUP_BY_LABELS[g]}
            </option>
          ))}
        </NativeSelect>
      </div>
    </div>
  )
}
