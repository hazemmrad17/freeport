import { Hono } from 'hono'

import { computeCost } from '../lib/cost'
import { getResetPeriod } from '../lib/reset-period'
import type { AppBindings } from '../middleware/auth'
import { requireUser } from '../middleware/auth'
import { getSessionUsageUnits, insertUsageEvent } from '../store'

export const usageRoutes = new Hono<AppBindings>()

/**
 * The CLI reports real model token usage here (model traffic goes direct to
 * the provider, so the server can't observe it otherwise). This is the data
 * that validates the unit economics: cost per user per day.
 */
usageRoutes.post('/api/v1/usage/report', requireUser, async (c) => {
  const config = c.get('config')
  const db = c.get('db')
  const user = c.get('user')!

  const body = (await c.req.json().catch(() => ({}))) as {
    model?: string
    sessionId?: string
    inputTokens?: number
    outputTokens?: number
    cachedInputTokens?: number
  }

  const tokens = {
    inputTokens: Math.max(0, Math.round(body.inputTokens ?? 0)),
    outputTokens: Math.max(0, Math.round(body.outputTokens ?? 0)),
    cachedInputTokens: Math.max(0, Math.round(body.cachedInputTokens ?? 0)),
  }
  const { costUsd } = computeCost(tokens, config.pricing)

  insertUsageEvent(db, {
    user_id: user.id,
    session_instance_id: typeof body.sessionId === 'string' ? body.sessionId : null,
    model: typeof body.model === 'string' ? body.model : null,
    input_tokens: tokens.inputTokens,
    output_tokens: tokens.outputTokens,
    cached_input_tokens: tokens.cachedInputTokens,
    cost_usd: costUsd,
  })

  return c.json({ received: true, costUsd })
})

/** Legacy Codebuff usage endpoint — the fork runs free mode, so this returns
 *  today's session usage and spend rather than a credit balance. */
usageRoutes.post('/api/v1/usage', requireUser, (c) => {
  const config = c.get('config')
  const db = c.get('db')
  const user = c.get('user')!

  const nowMs = Date.now()
  const period = getResetPeriod(nowMs, config.resetOffsetHoursUtc)
  const sessionsUsed = getSessionUsageUnits(db, user.id, period.startMs)

  const spendRow = db
    .query(
      'SELECT COALESCE(SUM(cost_usd), 0) AS total FROM usage_events WHERE user_id = ? AND created_at >= ?',
    )
    .get(user.id, period.startMs) as { total: number }

  return c.json({
    type: 'usage-response',
    usage: sessionsUsed,
    remainingBalance: null,
    balanceBreakdown: {
      free_sessions_used_today: sessionsUsed,
      free_sessions_per_day: config.freeSessionsPerDay,
      spend_today_usd: Number(spendRow.total.toFixed(6)),
      next_reset: period.resetAt,
    },
    next_quota_reset: period.resetAt,
  })
})