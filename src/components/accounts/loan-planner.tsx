import { useState } from 'react'
import { Money } from '#/components/accounts/money'
import { ChartCard, DataTable } from '#/components/reports/chart-card'
import { LineChart } from '#/components/reports/line-chart'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { comparePayoff, payoffMonth } from '#/domain/payoff'
import { formatAxisAmount, shortMonth } from '#/lib/chart'
import { firstOfMonth, formatMonth } from '#/lib/month'
import {
  formatMilliunits,
  milliunitsToDollars,
  parseMoneyInput,
  parsePercentToBps,
} from '#/lib/money'

/**
 * What-if payoff planner for a debt account. All math runs in the browser from the saved APR and
 * minimum payment (editable here without saving), so changes are instant.
 */
export function LoanPlanner({
  owed,
  aprBps,
  minPayment,
  currency,
}: {
  /** Amount owed, positive milliunits. */
  owed: number
  aprBps: number | null
  minPayment: number | null
  currency: string
}) {
  const [aprText, setAprText] = useState(
    aprBps === null ? '' : String(aprBps / 100),
  )
  const [payText, setPayText] = useState(
    minPayment === null ? '' : String(milliunitsToDollars(minPayment)),
  )
  const [extraText, setExtraText] = useState('0')

  const apr = aprText.trim() === '' ? null : parsePercentToBps(aprText)
  const payment = payText.trim() === '' ? null : parseMoneyInput(payText)
  const extra = extraText.trim() === '' ? 0 : parseMoneyInput(extraText)
  const valid =
    apr !== null &&
    payment !== null &&
    payment > 0 &&
    extra !== null &&
    extra >= 0

  const plan = valid
    ? comparePayoff({ balance: owed, aprBps: apr, payment }, extra)
    : null
  const chosen = plan
    ? extra && extra > 0
      ? plan.withExtra
      : plan.baseline
    : null
  const now = firstOfMonth()
  const fmt = (v: number) => formatMilliunits(v, currency)

  const points = chosen
    ? [
        { month: now, value: owed },
        ...chosen.schedule.map((s) => ({
          month: payoffMonth(now, s.month),
          value: s.balance,
        })),
      ]
    : []
  // keep the chart readable for long payoffs
  const thinned =
    points.length > 60
      ? points.filter(
          (_, i) =>
            i % Math.ceil(points.length / 60) === 0 || i === points.length - 1,
        )
      : points

  const years = (m: number) => {
    const y = Math.floor(m / 12)
    const r = m % 12
    return (
      [y ? `${y} yr` : '', r ? `${r} mo` : ''].filter(Boolean).join(' ') ||
      '0 mo'
    )
  }

  return (
    <section
      aria-label="Loan planner"
      className="flex flex-col gap-4 rounded-lg border p-4"
    >
      <div>
        <h2 className="text-lg font-semibold">Payoff planner</h2>
        <p className="text-muted-foreground text-sm">
          You owe <Money value={-owed} currency={currency} />. Try different
          payments to see when you could be debt free.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="grid gap-1">
          <Label htmlFor="plan-apr">Interest rate (APR %)</Label>
          <Input
            id="plan-apr"
            inputMode="decimal"
            autoComplete="off"
            value={aprText}
            onChange={(e) => setAprText(e.target.value)}
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="plan-payment">Monthly payment</Label>
          <Input
            id="plan-payment"
            inputMode="decimal"
            autoComplete="off"
            value={payText}
            onChange={(e) => setPayText(e.target.value)}
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="plan-extra">Extra each month (what if)</Label>
          <Input
            id="plan-extra"
            inputMode="decimal"
            autoComplete="off"
            value={extraText}
            onChange={(e) => setExtraText(e.target.value)}
          />
        </div>
      </div>

      {!valid ? (
        <p role="status" className="text-muted-foreground text-sm">
          Enter an interest rate and a monthly payment to see a payoff plan.
          Save them on the account (Edit) to keep them.
        </p>
      ) : chosen?.neverPaysOff ? (
        <p role="alert" className="text-destructive text-sm">
          This payment does not cover the monthly interest, so the balance never
          goes down. Pay more each month.
        </p>
      ) : chosen && chosen.months !== null ? (
        <>
          <dl
            className="grid gap-3 sm:grid-cols-3"
            data-testid="payoff-summary"
          >
            <div className="rounded-lg border p-3">
              <dt className="text-muted-foreground text-sm">Debt free in</dt>
              <dd className="text-xl font-semibold">{years(chosen.months)}</dd>
              <dd className="text-muted-foreground text-xs">
                {formatMonth(payoffMonth(now, chosen.months))}
              </dd>
            </div>
            <div className="rounded-lg border p-3">
              <dt className="text-muted-foreground text-sm">Total interest</dt>
              <dd className="text-xl font-semibold">
                {fmt(chosen.totalInterest)}
              </dd>
            </div>
            <div className="rounded-lg border p-3">
              <dt className="text-muted-foreground text-sm">
                {extra && extra > 0 ? 'With the extra payment' : 'Total paid'}
              </dt>
              {extra &&
              extra > 0 &&
              plan &&
              plan.monthsSaved !== null &&
              plan.interestSaved !== null ? (
                <dd className="text-xl font-semibold" data-testid="savings">
                  {plan.monthsSaved} mo sooner, {fmt(plan.interestSaved)} less
                  interest
                </dd>
              ) : (
                <dd className="text-xl font-semibold">
                  {fmt(chosen.totalPaid)}
                </dd>
              )}
            </div>
          </dl>
          <ChartCard
            title="Balance over time"
            caption={
              extra && extra > 0
                ? 'With your extra payment'
                : 'At your monthly payment'
            }
            chart={
              <LineChart
                points={thinned}
                seriesLabel="Balance"
                format={fmt}
                formatAxis={(v) => formatAxisAmount(v, currency)}
                ariaLabel="Debt balance over time"
              />
            }
            table={
              <DataTable
                columns={['Month', 'Interest', 'Principal', 'Balance']}
                rows={chosen.schedule.map((s) => [
                  shortMonth(payoffMonth(now, s.month), true),
                  fmt(s.interest),
                  fmt(s.principal),
                  fmt(s.balance),
                ])}
              />
            }
          />
        </>
      ) : (
        <p role="status" className="text-muted-foreground text-sm">
          This plan takes longer than 50 years to pay off.
        </p>
      )}
    </section>
  )
}
