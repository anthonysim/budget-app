import type { ReactNode } from 'react'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '#/components/ui/sidebar'
import { AppSidebar } from '#/components/layout/app-sidebar'
import type { BudgetSummary } from '#/components/budgets/budget-types'
import type { AccountWithBalances } from '#/server/accounts-query'
import { SearchDialog } from '#/components/layout/search-dialog'
import { InvitesBanner } from '#/components/sharing/invites-banner'
import type { MyInvite } from '#/lib/sharing'
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
  return (
    <SidebarProvider>
      <AppSidebar
        email={email}
        budget={budget}
        budgets={budgets}
        accounts={accounts}
      />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          {/* Desktop toggle lives in the sidebar header; the sidebar is a sheet on mobile, so keep one here. */}
          <SidebarTrigger aria-label="Open sidebar" className="md:hidden" />
          <div className="ml-auto flex items-center gap-2">
            <SearchDialog
              budgetId={budget.id}
              currency={budget.currency}
              dateFormat={budget.dateFormat}
            />
            <ThemeToggle />
          </div>
        </header>
        {invites.length > 0 ? (
          <div className="px-6 pt-4">
            <InvitesBanner invites={invites} />
          </div>
        ) : null}
        <div className="flex-1">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
