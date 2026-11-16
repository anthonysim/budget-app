import { Link } from '@tanstack/react-router'
import { BarChart3Icon, LandmarkIcon, WalletIcon } from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '#/components/ui/sidebar'
import { BudgetSwitcher } from '#/components/layout/budget-switcher'
import { UserMenu } from '#/components/layout/user-menu'
import type { BudgetSummary } from '#/components/budgets/budget-types'

const NAV = [
  { to: '/budgets/$budgetId/budget', label: 'Budget', icon: WalletIcon },
  { to: '/budgets/$budgetId/reports', label: 'Reports', icon: BarChart3Icon },
  {
    to: '/budgets/$budgetId/accounts',
    label: 'All Accounts',
    icon: LandmarkIcon,
  },
] as const

export function AppSidebar({
  email,
  budget,
  budgets,
}: {
  email: string
  budget: BudgetSummary
  budgets: Array<BudgetSummary>
}) {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <BudgetSwitcher current={budget} budgets={budgets} />
          </SidebarMenuItem>
        </SidebarMenu>
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

        <SidebarGroup>
          <SidebarGroupLabel>Accounts</SidebarGroupLabel>
          <SidebarGroupContent>
            {/* Account list with balances arrives in PR 6 */}
            <p className="text-sidebar-foreground/60 px-2 text-xs group-data-[collapsible=icon]:hidden">
              No accounts yet
            </p>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <UserMenu email={email} />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
