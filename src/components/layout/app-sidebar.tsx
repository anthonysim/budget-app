import { Link } from '@tanstack/react-router'
import {
  BarChart3Icon,
  CalendarClockIcon,
  LandmarkIcon,
  ListTreeIcon,
  ReplaceIcon,
  UsersIcon,
  WalletIcon,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from '#/components/ui/sidebar'
import { BudgetSwitcher } from '#/components/layout/budget-switcher'
import { SidebarAccounts } from '#/components/layout/sidebar-accounts'
import type { AccountWithBalances } from '#/server/accounts-query'
import type { BudgetSummary } from '#/components/budgets/budget-types'

const NAV = [
  { to: '/budgets/$budgetId/budget', label: 'Budget', icon: WalletIcon },
  { to: '/budgets/$budgetId/reports', label: 'Reports', icon: BarChart3Icon },
  {
    to: '/budgets/$budgetId/categories',
    label: 'Categories',
    icon: ListTreeIcon,
  },
  {
    to: '/budgets/$budgetId/members',
    label: 'Sharing',
    icon: UsersIcon,
  },
  {
    to: '/budgets/$budgetId/payee-rules',
    label: 'Payee rules',
    icon: ReplaceIcon,
  },
  {
    to: '/budgets/$budgetId/scheduled',
    label: 'Scheduled',
    icon: CalendarClockIcon,
  },
  {
    to: '/budgets/$budgetId/accounts',
    label: 'All Accounts',
    icon: LandmarkIcon,
  },
] as const

export function AppSidebar({
  budget,
  budgets,
  accounts,
}: {
  budget: BudgetSummary
  budgets: Array<BudgetSummary>
  accounts: Array<AccountWithBalances>
}) {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="flex-row items-center group-data-[collapsible=icon]:flex-col-reverse">
        <SidebarMenu className="min-w-0 flex-1">
          <SidebarMenuItem>
            <BudgetSwitcher current={budget} budgets={budgets} />
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarTrigger aria-label="Toggle sidebar" className="shrink-0" />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map(({ to, label, icon: Icon }) => (
                <SidebarMenuItem key={to}>
                  <SidebarMenuButton asChild tooltip={label}>
                    <Link
                      to={to}
                      params={{ budgetId: budget.id }}
                      activeProps={{ 'data-active': true }}
                    >
                      <Icon />
                      <span>{label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarAccounts budget={budget} accounts={accounts} />
      </SidebarContent>
    </Sidebar>
  )
}
