import type { ReactNode } from 'react'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '#/components/ui/sidebar'
import { Separator } from '#/components/ui/separator'
import { AppSidebar } from '#/components/layout/app-sidebar'
import type { BudgetSummary } from '#/components/budgets/budget-types'
import { ThemeToggle } from '#/components/theme-toggle'

export function AppShell({
  email,
  budget,
  budgets,
  children,
}: {
  email: string
  budget: BudgetSummary
  budgets: Array<BudgetSummary>
  children: ReactNode
}) {
  return (
    <SidebarProvider>
      <AppSidebar email={email} budget={budget} budgets={budgets} />
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
