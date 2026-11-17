import type { CSSProperties, ReactNode } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { cn } from '#/lib/utils'
import { Wordmark } from '#/components/layout/wordmark'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '#/components/ui/sidebar'
import { BudgetSwitcher } from '#/components/layout/budget-switcher'
import { AppSidebar } from '#/components/layout/app-sidebar'
import type { BudgetSummary } from '#/components/budgets/budget-types'
import type { AccountWithBalances } from '#/server/accounts-query'
import { SearchDialog } from '#/components/layout/search-dialog'
import { InvitesBanner } from '#/components/sharing/invites-banner'
import type { MyInvite } from '#/lib/sharing'
import { UserMenu } from '#/components/layout/user-menu'
import { ThemeToggle } from '#/components/theme-toggle'

export function AppShell({
  email,
  budget,
  budgets,
  accounts,
  invites,
  children,
}: {
  email: string
  budget: BudgetSummary & { dateFormat: string }
  budgets: Array<BudgetSummary>
  accounts: Array<AccountWithBalances>
  invites: Array<MyInvite>
  children: ReactNode
}) {
  // The budget page lays out its own tiles (pinned header + scrolling table), so the main area is not a scroller there.
  const ownTiles = useRouterState({
    select: (s) => /\/budget\/?$/.test(s.location.pathname),
  })
  return (
    <SidebarProvider
      className="bg-canvas h-svh flex-col overflow-hidden"
      style={{ '--header-height': '3.5rem' } as CSSProperties}
    >
      <header className="bg-canvas flex h-(--header-height) shrink-0 items-center gap-2 px-4">
        <div className="flex w-full items-center gap-2">
          {/* Desktop toggle lives in the sidebar; the sidebar is a sheet on mobile, so keep one here. */}
          <SidebarTrigger aria-label="Open sidebar" className="md:hidden" />
          <Link
            to="/budget"
            aria-label="ganso home"
            title="간소 · simplicity"
            className="mr-1 rounded-md px-1"
          >
            <Wordmark />
          </Link>
          <span aria-hidden className="bg-border h-5 w-px" />
          <BudgetSwitcher current={budget} budgets={budgets} />
          <div className="ml-auto flex items-center gap-2">
            <SearchDialog
              budgetId={budget.id}
              currency={budget.currency}
              dateFormat={budget.dateFormat}
            />
            <ThemeToggle />
            <UserMenu email={email} />
          </div>
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        <AppSidebar budget={budget} accounts={accounts} />
        <SidebarInset
          className={cn(
            'm-3 min-h-0 min-w-0 md:ml-0',
            ownTiles
              ? 'gap-3 bg-transparent'
              : 'bg-background overflow-y-auto overscroll-contain rounded-xl border',
          )}
        >
          {invites.length > 0 ? (
            <div className="px-6 pt-4">
              <InvitesBanner invites={invites} />
            </div>
          ) : null}
          <div className={cn('flex-1', ownTiles && 'min-h-0')}>{children}</div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
