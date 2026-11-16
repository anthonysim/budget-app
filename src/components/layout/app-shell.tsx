import type { ReactNode } from 'react'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '#/components/ui/sidebar'
import { Separator } from '#/components/ui/separator'
import { AppSidebar } from '#/components/layout/app-sidebar'
import type { BudgetSummary } from '#/components/budgets/budget-types'
import type { AccountWithBalances } from '#/server/accounts-query'
import { ThemeToggle } from '#/components/theme-toggle'

export function AppShell({
  email,
  budget,
  budgets,
  accounts,
  children,
}: {
  email: string
  budget: BudgetSummary
  budgets: Array<BudgetSummary>
  accounts: Array<AccountWithBalances>
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
          <SidebarTrigger aria-label="Toggle sidebar" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </header>
        <div className="flex-1">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
