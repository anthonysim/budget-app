import { Link } from '@tanstack/react-router'
import { PlusIcon } from 'lucide-react'
import { AddAccountDialog } from '#/components/accounts/add-account-dialog'
import { Money } from '#/components/accounts/money'
import type { BudgetSummary } from '#/components/budgets/budget-types'
import {
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '#/components/ui/sidebar'
import type { AccountWithBalances } from '#/server/accounts-query'

export function SidebarAccounts({
  budget,
  accounts,
}: {
  budget: BudgetSummary
  accounts: Array<AccountWithBalances>
}) {
  const open = accounts.filter((a) => !a.closed)
  const canEdit = budget.role !== 'viewer'
  const groups = [
    { title: 'Budget', items: open.filter((a) => a.onBudget) },
    { title: 'Tracking', items: open.filter((a) => !a.onBudget) },
  ]

  return (
    <>
      {open.length === 0 ? (
        <SidebarGroup>
          <SidebarGroupLabel>Accounts</SidebarGroupLabel>
          {canEdit ? (
            <AddAccountDialog budgetId={budget.id}>
              <SidebarGroupAction title="Add account">
                <PlusIcon /> <span className="sr-only">Add account</span>
              </SidebarGroupAction>
            </AddAccountDialog>
          ) : null}
          <SidebarGroupContent>
            <p className="text-sidebar-foreground/60 px-2 text-xs group-data-[collapsible=icon]:hidden">
              No accounts yet
            </p>
          </SidebarGroupContent>
        </SidebarGroup>
      ) : (
        groups.map((g, i) =>
          g.items.length === 0 ? null : (
            <SidebarGroup key={g.title}>
              <SidebarGroupLabel>{g.title}</SidebarGroupLabel>
              {i === 0 && canEdit ? (
                <AddAccountDialog budgetId={budget.id}>
                  <SidebarGroupAction title="Add account">
                    <PlusIcon /> <span className="sr-only">Add account</span>
                  </SidebarGroupAction>
                </AddAccountDialog>
              ) : null}
              <SidebarGroupContent>
                <SidebarMenu>
                  {g.items.map((a) => (
                    <SidebarMenuItem key={a.id}>
                      <SidebarMenuButton asChild tooltip={a.name} size="sm">
                        <Link
                          to="/budgets/$budgetId/accounts/$accountId"
                          params={{ budgetId: budget.id, accountId: a.id }}
                          activeProps={{ 'data-active': true }}
                        >
                          <span className="truncate">{a.name}</span>
                          <Money
                            value={a.workingBalance}
                            currency={budget.currency}
                            className="ml-auto text-xs group-data-[collapsible=icon]:hidden"
                          />
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ),
        )
      )}
    </>
  )
}
