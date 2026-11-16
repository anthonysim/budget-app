import { timingSafeEqual } from 'node:crypto'
import { createFileRoute } from '@tanstack/react-router'
import { utcDateString } from '#/lib/date'
import { serverEnv } from '#/lib/env.server'
import { materializeDue } from '#/server/scheduled-materialize'

function authorized(request: Request, secret: string): boolean {
  const header = request.headers.get('authorization') ?? ''
  const expected = `Bearer ${secret}`
  const a = Buffer.from(header)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

/**
 * Daily Vercel Cron job (see vercel.json). Vercel sends `Authorization: Bearer $CRON_SECRET`.
 * Enters every scheduled transaction that is due as of today (UTC) for all budgets.
 */
export const Route = createFileRoute('/api/cron/scheduled')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { CRON_SECRET } = serverEnv()
        if (!CRON_SECRET) {
          return Response.json(
            { error: 'Cron not configured' },
            { status: 503 },
          )
        }
        if (!authorized(request, CRON_SECRET)) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }
        const created = await materializeDue(utcDateString(0))
        return Response.json({ ok: true, created })
      },
    },
  },
})
