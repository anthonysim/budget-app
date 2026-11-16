import { createServerFn } from '@tanstack/react-start'
import { loadReportsSchema } from '#/lib/reports'
import { requireBudgetRole } from '#/server/budget-access'
import { queryReports } from '#/server/reports-query'

/** All report data for the selected range and account in one round trip. */
export const loadReports = createServerFn({ method: 'GET' })
  .validator(loadReportsSchema)
  .handler(async ({ data }) => {
    await requireBudgetRole(data.budgetId, 'viewer')
    return queryReports(data)
  })
