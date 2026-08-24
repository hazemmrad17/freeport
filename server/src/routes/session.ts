import { Hono } from 'hono'

import type { ServerConfig } from '../config'
import type { SessionRow, TrustTier, UserRow } from '../db'
import { getResetPeriod } from '../lib/reset-period'
import type { AppBindings } from '../middleware/auth'
import { requireUser } from '../middleware/auth'
import {
  admitSession,
  endAllSessionsForUser,
  getActiveSessionForUser,
  getSessionUsageUnits,
  getSpendSinceMs,
  getUserTrustTier,
  incrementSessionUsage,
  isPaidUser,
  rotateSession,
} from '../store'

// Model ids this deployment serves. The fork routes every model to DeepInfra's
// DeepSeek V4 Flash upstream, so these labels ride along on the session row but
// the serving model is governed by the client's provider config. Coerce unknown
// ids to the fallback rather than rejecting, matching FREEPORT's behavior.
const SUPPORTED_MODEL_IDS = [
  'deepseek/deepseek-v4-flash',
  'deepseek/deepseek-v4-pro',
  'minimax/minimax-m3',
  'google/gemini-3.1-pro-preview',
  'z-ai/glm-5.2',
  'mimo/mimo-v2.5',
] as const
const FALLBACK_MODEL_ID = 'mimo/mimo-v2.5'
const DEFAULT_MODEL_ID = 'deepseek/deepseek-v4-flash'

const ACCESS_TIER = 'full' as const

function resolveModel(id: string | undefined): string {
  if (!id) return DEFAULT_MODEL_ID
  return (SUPPORTED_MODEL_IDS as readonly string[]).includes(id) ? id : FALLBACK_MODEL_ID
}

function getQuotaLimit(
  config: ServerConfig,
  isPaid: boolean,
  trustTier: TrustTier = 'standard',
): number {
  if (isPaid) return config.paidSessionsPerDay
  if (trustTier === 'low') return config.lowTrustFreeSessionsPerDay
  return config.freeSessionsPerDay
}

function rateLimitEntry(
  config: ServerConfig,
  model: string,
  recentCount: number,
  nowMs: number,
  isPaid: boolean,
  trustTier: TrustTier = 'standard',
): {
  model: string
  pool: string
  poolLabel: string
  entitlementBreakdown: { base: number }
  limit: number
  period: 'pacific_day'
  resetTimeZone: string
  resetAt: string
  windowHours: number
  recentCount: number
} {
  const period = getResetPeriod(nowMs, config.resetOffsetHoursUtc)
  const limit = getQuotaLimit(config, isPaid, trustTier)
  const poolLabel = isPaid
    ? 'Daily paid sessions'
    : trustTier === 'low'
      ? 'Daily free sessions (New account tier)'
      : 'Daily free sessions'
  return {
    model,
    pool: 'daily',
    poolLabel,
    entitlementBreakdown: { base: limit },
    limit,
    period: 'pacific_day',
    resetTimeZone: config.resetTimeZone,
    resetAt: period.resetAt,
    windowHours: 24,
    recentCount,
  }
}

function rateLimitsByModel(
  config: ServerConfig,
  db: AppBindings['Variables']['db'],
  userId: string,
  dbUsage: (model: string) => number,
  nowMs: number,
  trustTier: TrustTier = 'standard',
) {
  const paid = isPaidUser(db, userId)
  const byModel: Record<string, unknown> = {}
  for (const model of SUPPORTED_MODEL_IDS) {
    byModel[model] = rateLimitEntry(config, model, dbUsage(model), nowMs, paid, trustTier)
  }
  return byModel
}

function activeResponse(
  config: ServerConfig,
  db: AppBindings['Variables']['db'],
  row: SessionRow,
  user: UserRow,
) {
  const nowMs = Date.now()
  const remainingMs = Math.max(0, row.expires_at - nowMs)
  const recent = getSessionUsageUnits(
    db,
    user.id,
    getResetPeriod(nowMs, config.resetOffsetHoursUtc).startMs,
  )
  const paid = isPaidUser(db, user.id)
  const trustTier = user.trust_tier ?? 'standard'
  return {
    status: 'active' as const,
    accessTier: ACCESS_TIER,
    instanceId: row.instance_id,
    model: row.model,
    admittedAt: new Date(row.admitted_at).toISOString(),
    expiresAt: new Date(row.expires_at).toISOString(),
    remainingMs,
    rateLimit: rateLimitEntry(config, row.model, recent, nowMs, paid, trustTier),
    rateLimitsByModel: rateLimitsByModel(config, db, user.id, () => recent, nowMs, trustTier),
  }
}

function noneResponse(
  config: ServerConfig,
  db: AppBindings['Variables']['db'],
  user: UserRow,
) {
  const nowMs = Date.now()
  const recent = getSessionUsageUnits(
    db,
    user.id,
    getResetPeriod(nowMs, config.resetOffsetHoursUtc).startMs,
  )
  const trustTier = user.trust_tier ?? 'standard'
  return {
    status: 'none' as const,
    accessTier: ACCESS_TIER,
    rateLimitsByModel: rateLimitsByModel(config, db, user.id, () => recent, nowMs, trustTier),
  }
}

function rateLimitedResponse(
  config: ServerConfig,
  model: string,
  recentCount: number,
  limit: number,
) {
  const nowMs = Date.now()
  const period = getResetPeriod(nowMs, config.resetOffsetHoursUtc)
  return {
    status: 'rate_limited' as const,
    accessTier: ACCESS_TIER,
    model,
    limit,
    entitlementBreakdown: { base: limit },
    period: 'pacific_day' as const,
    resetTimeZone: config.resetTimeZone,
    resetAt: period.resetAt,
    windowHours: 24,
    recentCount,
    retryAfterMs: period.retryAfterMs,
  }
}

export const sessionRoutes = new Hono<AppBindings>()

sessionRoutes.get('/api/v1/FREEPORT/session', requireUser, (c) => {
  const config = c.get('config')
  const db = c.get('db')
  const user = c.get('user')!

  const active = getActiveSessionForUser(db, user.id)
  if (!active) return c.json(noneResponse(config, db, user))

  const callerInstanceId = c.req.header('x-FREEPORT-instance-id')
  if (callerInstanceId && callerInstanceId !== active.instance_id) {
    // Another CLI (or a rotated instance) owns the row now.
    return c.json({ status: 'superseded' })
  }

  return c.json(activeResponse(config, db, active, user))
})

sessionRoutes.post('/api/v1/FREEPORT/session', requireUser, (c) => {
  const config = c.get('config')
  const db = c.get('db')
  const user = c.get('user')!

  const requestedModel = resolveModel(c.req.header('x-FREEPORT-model'))
  const active = getActiveSessionForUser(db, user.id)

  if (active) {
    if (active.model !== requestedModel) {
      c.status(409)
      return c.json({
        status: 'model_locked',
        accessTier: ACCESS_TIER,
        currentModel: active.model,
        requestedModel,
      })
    }
    // Same-model claim/rotation (e.g. takeover after a crashed process). Rotate
    // the instance id but do NOT spend a fresh session unit — the user was
    // already admitted.
    const rotated = rotateSession(db, active, requestedModel, config.sessionDurationMs)
    return c.json(activeResponse(config, db, rotated, user))
  }

  // No active session: enforce the daily quota before admitting.
  const nowMs = Date.now()
  const period = getResetPeriod(nowMs, config.resetOffsetHoursUtc)
  const recent = getSessionUsageUnits(db, user.id, period.startMs)
  const paid = isPaidUser(db, user.id)
  const trustTier = user.trust_tier ?? 'standard'
  const dailyLimit = getQuotaLimit(config, paid, trustTier)

  // If waitlist mode is on, free sessions are gated while community sponsorship builds up.
  if (config.waitlistMode && !paid) {
    c.status(403)
    return c.json({
      status: 'waitlisted',
      accessTier: ACCESS_TIER,
      model: requestedModel,
      message:
        'Freeport is currently in Waitlist Mode while free inference capacity is being funded. To bypass the waitlist, upgrade to Pro at /pricing or use your own API key (--key).',
      waitlistUrl: `${config.appUrl}/#early-access`,
      pricingUrl: `${config.appUrl}/pricing`,
    })
  }

  if (recent >= dailyLimit) {
    c.status(429)
    return c.json(rateLimitedResponse(config, requestedModel, recent, dailyLimit))
  }

  // Free-tier cost safety: refuse admission once today's reported model spend
  // crosses the hard cap (protects against runaway context loops).
  if (!paid && config.freeDailySpendCapUsd > 0) {
    const spentToday = getSpendSinceMs(db, user.id, period.startMs)
    if (spentToday >= config.freeDailySpendCapUsd) {
      c.status(429)
      return c.json({
        ...rateLimitedResponse(config, requestedModel, recent, dailyLimit),
        reason: 'daily_spend_cap',
        spendCapUsd: config.freeDailySpendCapUsd,
        spentTodayUsd: Number(spentToday.toFixed(4)),
      })
    }
  }

  const admitted = admitSession(db, {
    userId: user.id,
    model: requestedModel,
    durationMs: config.sessionDurationMs,
  })
  incrementSessionUsage(db, user.id, period.startMs)
  return c.json(activeResponse(config, db, admitted, user))
})

sessionRoutes.delete('/api/v1/FREEPORT/session', requireUser, (c) => {
  const config = c.get('config')
  const db = c.get('db')
  const user = c.get('user')!
  endAllSessionsForUser(db, user.id)
  return c.json(noneResponse(config, db, user))
})