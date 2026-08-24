import type { Context } from 'hono'
import { Hono } from 'hono'

import type { AppBindings } from '../middleware/auth'
import { bearerToken } from '../middleware/auth'
import { getResetPeriod } from '../lib/reset-period'
import { getUserDemographicsSummary, getWaitlistSummary } from '../store'

type AdminCtx = Context<AppBindings>

interface UserDailyStats {
  userId: string
  email: string
  authProvider: string
  trustTier: string
  signupIp: string
  sessionsUsed: number
  modelSpendUsd: number
  inputTokens: number
  outputTokens: number
  adImpressions: number
  adClicks: number
  adServed: number
  adRevenueUsd: number
}

interface DailyStats {
  periodStartMs: number
  resetAt: string
  users: UserDailyStats[]
  totals: {
    sessionsUsed: number
    modelSpendUsd: number
    adImpressions: number
    adClicks: number
    adRevenueUsd: number
    netUsd: number
  }
}

export const adminRoutes = new Hono<AppBindings>()

function isAdmin(c: AdminCtx): boolean {
  const config = c.get('config')
  const header = bearerToken(c)
  const query = c.req.query('token')
  return (header ?? query ?? '') === config.adminToken
}

function dailyStats(c: AdminCtx): DailyStats {
  const config = c.get('config')
  const db = c.get('db')
  const nowMs = Date.now()
  const { startMs, resetAt } = getResetPeriod(nowMs, config.resetOffsetHoursUtc)

  const rows = db
    .query(
      `SELECT
         u.id AS userId,
         u.email AS email,
         COALESCE(u.auth_provider, 'email') AS authProvider,
         COALESCE(u.trust_tier, 'standard') AS trustTier,
         COALESCE(u.signup_ip, '-') AS signupIp,
         COALESCE((SELECT su.units FROM session_usage su WHERE su.user_id = u.id AND su.period_start = ?), 0) AS sessionsUsed,
         COALESCE((SELECT SUM(ue.cost_usd) FROM usage_events ue WHERE ue.user_id = u.id AND ue.created_at >= ?), 0) AS modelSpendUsd,
         COALESCE((SELECT SUM(ue.input_tokens) FROM usage_events ue WHERE ue.user_id = u.id AND ue.created_at >= ?), 0) AS inputTokens,
         COALESCE((SELECT SUM(ue.output_tokens) FROM usage_events ue WHERE ue.user_id = u.id AND ue.created_at >= ?), 0) AS outputTokens,
         COALESCE((SELECT COUNT(*) FROM ad_events ae WHERE ae.user_id = u.id AND ae.kind = 'impression' AND ae.created_at >= ?), 0) AS adImpressions,
         COALESCE((SELECT COUNT(*) FROM ad_events ae WHERE ae.user_id = u.id AND ae.kind = 'click' AND ae.created_at >= ?), 0) AS adClicks,
         COALESCE((SELECT COUNT(*) FROM ad_events ae WHERE ae.user_id = u.id AND ae.kind = 'served' AND ae.created_at >= ?), 0) AS adServed
       FROM users u
       WHERE u.id IN (
         SELECT user_id FROM session_usage WHERE period_start = ?
         UNION SELECT user_id FROM usage_events WHERE created_at >= ?
         UNION SELECT user_id FROM ad_events WHERE created_at >= ?
       )
       ORDER BY modelSpendUsd DESC`,
    )
    .all(startMs, startMs, startMs, startMs, startMs, startMs, startMs, startMs, startMs, startMs) as Array<
    Record<string, unknown>
  >

  const users: UserDailyStats[] = rows.map((row) => {
    const adImpressions = Number(row.adImpressions ?? 0)
    return {
      userId: String(row.userId),
      email: String(row.email),
      authProvider: String(row.authProvider ?? 'email'),
      trustTier: String(row.trustTier ?? 'standard'),
      signupIp: String(row.signupIp ?? '-'),
      sessionsUsed: Number(row.sessionsUsed ?? 0),
      modelSpendUsd: Number(row.modelSpendUsd ?? 0),
      inputTokens: Number(row.inputTokens ?? 0),
      outputTokens: Number(row.outputTokens ?? 0),
      adImpressions,
      adClicks: Number(row.adClicks ?? 0),
      adServed: Number(row.adServed ?? 0),
      adRevenueUsd: adImpressions * config.adRevenuePerImpressionUsd,
    }
  })

  const totals: DailyStats['totals'] = {
    sessionsUsed: 0,
    modelSpendUsd: 0,
    adImpressions: 0,
    adClicks: 0,
    adRevenueUsd: 0,
    netUsd: 0,
  }
  for (const u of users) {
    totals.sessionsUsed += u.sessionsUsed
    totals.modelSpendUsd += u.modelSpendUsd
    totals.adImpressions += u.adImpressions
    totals.adClicks += u.adClicks
    totals.adRevenueUsd += u.adRevenueUsd
  }
  totals.netUsd = totals.adRevenueUsd - totals.modelSpendUsd

  return { periodStartMs: startMs, resetAt, users, totals }
}

// ─── Admin dashboard redirect ───────────────────────────────────────────────
// The admin dashboard now lives in a separate Next.js app.
// Redirect /admin to the Next.js dashboard (port 3000).

adminRoutes.get('/admin', (c) => {
  return c.redirect('http://localhost:3000/auth/v1/login')
})

// ─── API: JSON stats (existing) ─────────────────────────────────────────────

adminRoutes.get('/api/v1/admin/stats', (c) => {
  if (!isAdmin(c)) {
    c.status(401)
    return c.json({ error: 'unauthorized' })
  }
  const db = c.get('db')
  const config = c.get('config')
  const stats = dailyStats(c)
  const waitlist = getWaitlistSummary(db)
  const demographics = getUserDemographicsSummary(db)

  return c.json({
    periodStart: new Date(stats.periodStartMs).toISOString(),
    resetAt: stats.resetAt,
    waitlistMode: config.waitlistMode,
    totals: stats.totals,
    users: stats.users,
    waitlist,
    demographics,
  })
})

// ─── API: All users (comprehensive) ─────────────────────────────────────────

adminRoutes.get('/api/v1/admin/users', (c) => {
  if (!isAdmin(c)) return c.json({ error: 'unauthorized' }, 401)
  const db = c.get('db')
  const config = c.get('config')
  const nowMs = Date.now()
  const { startMs } = getResetPeriod(nowMs, config.resetOffsetHoursUtc)

  const users = db
    .query(
      `SELECT
         u.id, u.email, u.name, u.username, u.avatar_url,
         COALESCE(u.auth_provider, 'email') AS authProvider,
         COALESCE(u.trust_tier, 'standard') AS trustTier,
         u.signup_ip, u.created_at,
         (SELECT su.units FROM session_usage su WHERE su.user_id = u.id AND su.period_start = ?) AS todaySessions,
         (SELECT COALESCE(SUM(ue.cost_usd),0) FROM usage_events ue WHERE ue.user_id = u.id) AS totalCost,
         (SELECT COALESCE(SUM(ue.input_tokens),0) FROM usage_events ue WHERE ue.user_id = u.id) AS totalInputTokens,
         (SELECT COALESCE(SUM(ue.output_tokens),0) FROM usage_events ue WHERE ue.user_id = u.id) AS totalOutputTokens,
         (SELECT COUNT(*) FROM sessions s WHERE s.user_id = u.id) AS totalSessions,
         (SELECT COUNT(*) FROM sessions s WHERE s.user_id = u.id AND s.ended_at IS NULL) AS activeSessions,
         COALESCE((SELECT sub.status FROM subscriptions sub WHERE sub.user_id = u.id), 'none') AS subStatus,
         COALESCE((SELECT sub.plan FROM subscriptions sub WHERE sub.user_id = u.id), 'free') AS subPlan
       FROM users u
       ORDER BY u.created_at DESC`,
    )
    .all(startMs) as Array<Record<string, unknown>>

  return c.json({
    users: users.map((r) => ({
      id: String(r.id),
      email: String(r.email),
      name: String(r.name ?? ''),
      username: r.username ? String(r.username) : null,
      avatarUrl: r.avatar_url ? String(r.avatar_url) : null,
      authProvider: String(r.authProvider),
      trustTier: String(r.trustTier),
      signupIp: String(r.signup_ip ?? '-'),
      createdAt: Number(r.created_at),
      todaySessions: Number(r.todaySessions ?? 0),
      totalCost: Number(r.totalCost ?? 0),
      totalInputTokens: Number(r.totalInputTokens ?? 0),
      totalOutputTokens: Number(r.totalOutputTokens ?? 0),
      totalSessions: Number(r.totalSessions ?? 0),
      activeSessions: Number(r.activeSessions ?? 0),
      subStatus: String(r.subStatus),
      subPlan: String(r.subPlan),
    })),
  })
})

// ─── API: User detail ───────────────────────────────────────────────────────

adminRoutes.get('/api/v1/admin/users/:userId', (c) => {
  if (!isAdmin(c)) return c.json({ error: 'unauthorized' }, 401)
  const db = c.get('db')
  const userId = c.req.param('userId')

  const user = db.query('SELECT * FROM users WHERE id = ?').get(userId) as Record<string, unknown> | undefined
  if (!user) return c.json({ error: 'not_found' }, 404)

  const sessions = db
    .query('SELECT * FROM sessions WHERE user_id = ? ORDER BY admitted_at DESC LIMIT 50')
    .all(userId) as Array<Record<string, unknown>>

  const usage = db
    .query(
      `SELECT model,
              SUM(input_tokens) AS inputTokens,
              SUM(output_tokens) AS outputTokens,
              SUM(cached_input_tokens) AS cachedTokens,
              SUM(cost_usd) AS costUsd,
              COUNT(*) AS eventCount
       FROM usage_events WHERE user_id = ? GROUP BY model ORDER BY costUsd DESC`,
    )
    .all(userId) as Array<Record<string, unknown>>

  const dailyUsage = db
    .query(
      `SELECT DATE(created_at / 1000, 'unixepoch') AS day,
              SUM(input_tokens) AS inputTokens,
              SUM(output_tokens) AS outputTokens,
              SUM(cost_usd) AS costUsd
       FROM usage_events WHERE user_id = ? GROUP BY day ORDER BY day DESC LIMIT 30`,
    )
    .all(userId) as Array<Record<string, unknown>>

  const sub = db.query('SELECT * FROM subscriptions WHERE user_id = ?').get(userId) as Record<string, unknown> | undefined
  const adEvents = db
    .query(
      `SELECT kind, COUNT(*) AS count FROM ad_events WHERE user_id = ? GROUP BY kind`,
    )
    .all(userId) as Array<Record<string, unknown>>

  return c.json({
    user: {
      id: String(user.id),
      email: String(user.email),
      name: String(user.name ?? ''),
      username: user.username ? String(user.username) : null,
      avatarUrl: user.avatar_url ? String(user.avatar_url) : null,
      authProvider: String(user.auth_provider ?? 'email'),
      trustTier: String(user.trust_tier ?? 'standard'),
      signupIp: String(user.signup_ip ?? '-'),
      createdAt: Number(user.created_at),
    },
    sessions: sessions.map((s) => ({
      instanceId: String(s.instance_id),
      model: String(s.model),
      admittedAt: Number(s.admitted_at),
      expiresAt: Number(s.expires_at),
      endedAt: s.ended_at ? Number(s.ended_at) : null,
    })),
    usageByModel: usage.map((u) => ({
      model: String(u.model ?? 'unknown'),
      inputTokens: Number(u.inputTokens ?? 0),
      outputTokens: Number(u.outputTokens ?? 0),
      cachedTokens: Number(u.cachedTokens ?? 0),
      costUsd: Number(u.costUsd ?? 0),
      eventCount: Number(u.eventCount ?? 0),
    })),
    dailyUsage: dailyUsage.map((d) => ({
      day: String(d.day),
      inputTokens: Number(d.inputTokens ?? 0),
      outputTokens: Number(d.outputTokens ?? 0),
      costUsd: Number(d.costUsd ?? 0),
    })),
    subscription: sub
      ? {
          paddleSubscriptionId: String(sub.paddle_subscription_id ?? ''),
          status: String(sub.status),
          plan: String(sub.plan),
          currentPeriodEnd: sub.current_period_end ? Number(sub.current_period_end) : null,
          gracePeriodEnd: sub.grace_period_end ? Number(sub.grace_period_end) : null,
        }
      : null,
    adEvents: adEvents.map((a) => ({
      kind: String(a.kind),
      count: Number(a.count ?? 0),
    })),
  })
})

// ─── API: Update user trust tier ────────────────────────────────────────────

adminRoutes.post('/api/v1/admin/users/:userId/trust', async (c) => {
  if (!isAdmin(c)) return c.json({ error: 'unauthorized' }, 401)
  const db = c.get('db')
  const userId = c.req.param('userId')
  const body = (await c.req.json().catch(() => ({}))) as { trustTier?: string }
  const tier = body.trustTier
  if (!tier || !['low', 'standard', 'trusted'].includes(tier)) {
    return c.json({ error: 'invalid trust tier' }, 400)
  }
  db.query('UPDATE users SET trust_tier = ? WHERE id = ?').run(tier, userId)
  return c.json({ updated: true, trustTier: tier })
})

// ─── API: Kill user session ─────────────────────────────────────────────────

adminRoutes.post('/api/v1/admin/sessions/:instanceId/kill', (c) => {
  if (!isAdmin(c)) return c.json({ error: 'unauthorized' }, 401)
  const db = c.get('db')
  const instanceId = c.req.param('instanceId')
  db.query('UPDATE sessions SET ended_at = ? WHERE instance_id = ? AND ended_at IS NULL').run(Date.now(), instanceId)
  return c.json({ killed: true })
})

// ─── API: All sessions ──────────────────────────────────────────────────────

adminRoutes.get('/api/v1/admin/sessions', (c) => {
  if (!isAdmin(c)) return c.json({ error: 'unauthorized' }, 401)
  const db = c.get('db')
  const limit = Math.min(Number(c.req.query('limit') ?? 200), 1000)

  const sessions = db
    .query(
      `SELECT s.instance_id, s.user_id, s.model, s.admitted_at, s.expires_at, s.ended_at,
              u.email
       FROM sessions s LEFT JOIN users u ON u.id = s.user_id
       ORDER BY s.admitted_at DESC LIMIT ?`,
    )
    .all(limit) as Array<Record<string, unknown>>

  return c.json({
    sessions: sessions.map((s) => ({
      instanceId: String(s.instance_id),
      userId: String(s.user_id),
      email: String(s.email ?? 'unknown'),
      model: String(s.model),
      admittedAt: Number(s.admitted_at),
      expiresAt: Number(s.expires_at),
      endedAt: s.ended_at ? Number(s.ended_at) : null,
      active: s.ended_at == null && Number(s.expires_at) > Date.now(),
    })),
  })
})

// ─── API: Usage timeseries ──────────────────────────────────────────────────

adminRoutes.get('/api/v1/admin/usage/timeseries', (c) => {
  if (!isAdmin(c)) return c.json({ error: 'unauthorized' }, 401)
  const db = c.get('db')
  const days = Math.min(Number(c.req.query('days') ?? 30), 90)
  const sinceMs = Date.now() - days * 86_400_000

  const daily = db
    .query(
      `SELECT DATE(created_at / 1000, 'unixepoch') AS day,
              SUM(input_tokens) AS inputTokens,
              SUM(output_tokens) AS outputTokens,
              SUM(cached_input_tokens) AS cachedTokens,
              SUM(cost_usd) AS costUsd,
              COUNT(DISTINCT user_id) AS uniqueUsers,
              COUNT(*) AS eventCount
       FROM usage_events WHERE created_at >= ?
       GROUP BY day ORDER BY day`,
    )
    .all(sinceMs) as Array<Record<string, unknown>>

  const byModel = db
    .query(
      `SELECT model,
              SUM(input_tokens) AS inputTokens,
              SUM(output_tokens) AS outputTokens,
              SUM(cost_usd) AS costUsd,
              COUNT(*) AS eventCount
       FROM usage_events WHERE created_at >= ?
       GROUP BY model ORDER BY costUsd DESC`,
    )
    .all(sinceMs) as Array<Record<string, unknown>>

  const byUser = db
    .query(
      `SELECT u.email,
              SUM(ue.input_tokens) AS inputTokens,
              SUM(ue.output_tokens) AS outputTokens,
              SUM(ue.cost_usd) AS costUsd
       FROM usage_events ue JOIN users u ON u.id = ue.user_id
       WHERE ue.created_at >= ?
       GROUP BY ue.user_id ORDER BY costUsd DESC LIMIT 20`,
    )
    .all(sinceMs) as Array<Record<string, unknown>>

  return c.json({
    daily: daily.map((d) => ({
      day: String(d.day),
      inputTokens: Number(d.inputTokens ?? 0),
      outputTokens: Number(d.outputTokens ?? 0),
      cachedTokens: Number(d.cachedTokens ?? 0),
      costUsd: Number(d.costUsd ?? 0),
      uniqueUsers: Number(d.uniqueUsers ?? 0),
      eventCount: Number(d.eventCount ?? 0),
    })),
    byModel: byModel.map((m) => ({
      model: String(m.model ?? 'unknown'),
      inputTokens: Number(m.inputTokens ?? 0),
      outputTokens: Number(m.outputTokens ?? 0),
      costUsd: Number(m.costUsd ?? 0),
      eventCount: Number(m.eventCount ?? 0),
    })),
    byUser: byUser.map((u) => ({
      email: String(u.email),
      inputTokens: Number(u.inputTokens ?? 0),
      outputTokens: Number(u.outputTokens ?? 0),
      costUsd: Number(u.costUsd ?? 0),
    })),
  })
})

// ─── API: Subscriptions ─────────────────────────────────────────────────────

adminRoutes.get('/api/v1/admin/subscriptions', (c) => {
  if (!isAdmin(c)) return c.json({ error: 'unauthorized' }, 401)
  const db = c.get('db')

  const subs = db
    .query(
      `SELECT sub.*, u.email, u.name
       FROM subscriptions sub LEFT JOIN users u ON u.id = sub.user_id
       ORDER BY sub.created_at DESC`,
    )
    .all() as Array<Record<string, unknown>>

  const summary = db
    .query(
      `SELECT status, plan, COUNT(*) AS count FROM subscriptions GROUP BY status, plan`,
    )
    .all() as Array<Record<string, unknown>>

  return c.json({
    subscriptions: subs.map((s) => ({
      userId: String(s.user_id),
      email: String(s.email ?? 'unknown'),
      name: String(s.name ?? ''),
      paddleSubscriptionId: String(s.paddle_subscription_id ?? ''),
      status: String(s.status),
      plan: String(s.plan),
      priceId: s.price_id ? String(s.price_id) : null,
      currentPeriodEnd: s.current_period_end ? Number(s.current_period_end) : null,
      gracePeriodEnd: s.grace_period_end ? Number(s.grace_period_end) : null,
      createdAt: Number(s.created_at),
      updatedAt: Number(s.updated_at),
    })),
    summary: summary.map((s) => ({
      status: String(s.status),
      plan: String(s.plan),
      count: Number(s.count),
    })),
  })
})

// ─── API: Ad performance ────────────────────────────────────────────────────

adminRoutes.get('/api/v1/admin/ads', (c) => {
  if (!isAdmin(c)) return c.json({ error: 'unauthorized' }, 401)
  const db = c.get('db')
  const sinceMs = Date.now() - 30 * 86_400_000

  const byAd = db
    .query(
      `SELECT ad_title, kind, COUNT(*) AS count
       FROM ad_events WHERE created_at >= ?
       GROUP BY ad_title, kind ORDER BY ad_title, kind`,
    )
    .all(sinceMs) as Array<Record<string, unknown>>

  const daily = db
    .query(
      `SELECT DATE(created_at / 1000, 'unixepoch') AS day,
              SUM(CASE WHEN kind='impression' THEN 1 ELSE 0 END) AS impressions,
              SUM(CASE WHEN kind='click' THEN 1 ELSE 0 END) AS clicks,
              SUM(CASE WHEN kind='served' THEN 1 ELSE 0 END) AS served
       FROM ad_events WHERE created_at >= ?
       GROUP BY day ORDER BY day`,
    )
    .all(sinceMs) as Array<Record<string, unknown>>

  return c.json({
    byAd: byAd.map((a) => ({
      title: String(a.ad_title),
      kind: String(a.kind),
      count: Number(a.count),
    })),
    daily: daily.map((d) => ({
      day: String(d.day),
      impressions: Number(d.impressions ?? 0),
      clicks: Number(d.clicks ?? 0),
      served: Number(d.served ?? 0),
    })),
  })
})

// ─── API: Server config (sanitized) ─────────────────────────────────────────

adminRoutes.get('/api/v1/admin/config', (c) => {
  if (!isAdmin(c)) return c.json({ error: 'unauthorized' }, 401)
  const config = c.get('config')
  return c.json({
    waitlistMode: config.waitlistMode,
    freeSessionsPerDay: config.freeSessionsPerDay,
    paidSessionsPerDay: config.paidSessionsPerDay,
    sessionDurationMs: config.sessionDurationMs,
    resetTimeZone: config.resetTimeZone,
    resetOffsetHoursUtc: config.resetOffsetHoursUtc,
    freeDailySpendCapUsd: config.freeDailySpendCapUsd,
    lowTrustFreeSessionsPerDay: config.lowTrustFreeSessionsPerDay,
    maxSignupsPerIp24h: config.maxSignupsPerIp24h,
    subscriptionGracePeriodDays: config.subscriptionGracePeriodDays,
    paidAdsEnabled: config.paidAdsEnabled,
    logShippingEnabled: config.logShippingEnabled,
    pricing: config.pricing,
    adRevenuePerImpressionUsd: config.adRevenuePerImpressionUsd,
    adInventoryCount: config.adInventory.length,
    adInventory: config.adInventory.map((a) => ({
      title: a.title,
      cta: a.cta,
      url: a.url,
      weight: a.weight,
    })),
  })
})

// ─── API: Recent logs ───────────────────────────────────────────────────────

adminRoutes.get('/api/v1/admin/logs', (c) => {
  if (!isAdmin(c)) return c.json({ error: 'unauthorized' }, 401)
  const db = c.get('db')
  const limit = Math.min(Number(c.req.query('limit') ?? 100), 500)

  const logs = db
    .query(
      `SELECT lr.id, lr.user_id, lr.body, lr.created_at, u.email
       FROM log_records lr LEFT JOIN users u ON u.id = lr.user_id
       ORDER BY lr.created_at DESC LIMIT ?`,
    )
    .all(limit) as Array<Record<string, unknown>>

  return c.json({
    logs: logs.map((l) => ({
      id: Number(l.id),
      userId: l.user_id ? String(l.user_id) : null,
      email: l.email ? String(l.email) : null,
      body: String(l.body ?? ''),
      createdAt: Number(l.created_at),
    })),
  })
})

// ─── API: SSE activity feed ─────────────────────────────────────────────────

adminRoutes.get('/api/v1/admin/activity', (c) => {
  if (!isAdmin(c)) return c.json({ error: 'unauthorized' }, 401)
  const db = c.get('db')
  const limit = Math.min(Number(c.req.query('limit') ?? 50), 200)
  const since = Number(c.req.query('since') ?? 0)

  const events: Array<Record<string, unknown>> = []

  const sessions = db
    .query(
      `SELECT s.instance_id, s.user_id, s.model, s.admitted_at, s.ended_at, u.email
       FROM sessions s LEFT JOIN users u ON u.id = s.user_id
       WHERE s.admitted_at >= ? ORDER BY s.admitted_at DESC LIMIT ?`,
    )
    .all(since, limit) as Array<Record<string, unknown>>
  for (const s of sessions) {
    events.push({
      type: s.ended_at ? 'session_ended' : 'session_started',
      timestamp: Number(s.admitted_at),
      email: String(s.email ?? 'unknown'),
      model: String(s.model),
      sessionId: String(s.instance_id).slice(0, 8),
    })
  }

  const usageEvents = db
    .query(
      `SELECT ue.created_at, ue.model, ue.input_tokens, ue.output_tokens, ue.cost_usd, u.email
       FROM usage_events ue LEFT JOIN users u ON u.id = ue.user_id
       WHERE ue.created_at >= ? ORDER BY ue.created_at DESC LIMIT ?`,
    )
    .all(since, limit) as Array<Record<string, unknown>>
  for (const e of usageEvents) {
    events.push({
      type: 'usage_reported',
      timestamp: Number(e.created_at),
      email: String(e.email ?? 'unknown'),
      model: String(e.model ?? 'unknown'),
      inputTokens: Number(e.input_tokens ?? 0),
      outputTokens: Number(e.output_tokens ?? 0),
      costUsd: Number(e.cost_usd ?? 0),
    })
  }

  const adEvents = db
    .query(
      `SELECT ae.created_at, ae.kind, ae.ad_title, ae.user_id, u.email
       FROM ad_events ae LEFT JOIN users u ON u.id = ae.user_id
       WHERE ae.created_at >= ? ORDER BY ae.created_at DESC LIMIT ?`,
    )
    .all(since, limit) as Array<Record<string, unknown>>
  for (const a of adEvents) {
    events.push({
      type: 'ad_' + String(a.kind),
      timestamp: Number(a.created_at),
      email: a.email ? String(a.email) : null,
      adTitle: String(a.ad_title),
    })
  }

  events.sort((a, b) => Number(b.timestamp) - Number(a.timestamp))
  return c.json({ events: events.slice(0, limit) })
})

// ─── API: SSE live event stream ─────────────────────────────────────────────

adminRoutes.get('/api/v1/admin/activity/stream', (c) => {
  if (!isAdmin(c)) return c.json({ error: 'unauthorized' }, 401)
  const db = c.get('db')
  let lastCheck = Date.now()
  let closed = false

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()
      const send = (data: Record<string, unknown>) => {
        if (closed) return
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }
      send({ type: 'connected', timestamp: Date.now() })

      const interval = setInterval(() => {
        if (closed) { clearInterval(interval); return }
        const now = Date.now()
        const newSessions = db
          .query(`SELECT s.instance_id, s.model, s.admitted_at, u.email
                  FROM sessions s LEFT JOIN users u ON u.id = s.user_id
                  WHERE s.admitted_at >= ? ORDER BY s.admitted_at DESC LIMIT 10`)
          .all(lastCheck) as Array<Record<string, unknown>>
        for (const s of newSessions) {
          send({ type: 'session_started', timestamp: Number(s.admitted_at), email: String(s.email ?? '?'), model: String(s.model) })
        }
        const newUsage = db
          .query(`SELECT ue.created_at, ue.model, ue.cost_usd, u.email
                  FROM usage_events ue LEFT JOIN users u ON u.id = ue.user_id
                  WHERE ue.created_at >= ? ORDER BY ue.created_at DESC LIMIT 10`)
          .all(lastCheck) as Array<Record<string, unknown>>
        for (const e of newUsage) {
          send({ type: 'usage_reported', timestamp: Number(e.created_at), email: String(e.email ?? '?'), model: String(e.model ?? '?'), costUsd: Number(e.cost_usd ?? 0) })
        }
        const newAds = db
          .query(`SELECT ae.created_at, ae.kind, ae.ad_title, u.email
                  FROM ad_events ae LEFT JOIN users u ON u.id = ae.user_id
                  WHERE ae.created_at >= ? ORDER BY ae.created_at DESC LIMIT 10`)
          .all(lastCheck) as Array<Record<string, unknown>>
        for (const a of newAds) {
          send({ type: 'ad_' + String(a.kind), timestamp: Number(a.created_at), email: a.email ? String(a.email) : null, adTitle: String(a.ad_title) })
        }
        lastCheck = now
      }, 3000)

      const ping = setInterval(() => {
        if (closed) { clearInterval(ping); return }
        send({ type: 'ping', timestamp: Date.now() })
      }, 15000)

      setTimeout(() => { closed = true; clearInterval(interval); clearInterval(ping); try { controller.close() } catch {} }, 300_000)
    },
    cancel() { closed = true },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
})

// ─── API: Bulk trust update ─────────────────────────────────────────────────

adminRoutes.post('/api/v1/admin/users/bulk-trust', async (c) => {
  if (!isAdmin(c)) return c.json({ error: 'unauthorized' }, 401)
  const db = c.get('db')
  const body = (await c.req.json().catch(() => ({}))) as { userIds?: string[]; trustTier?: string }
  const tier = body.trustTier
  const ids = body.userIds
  if (!tier || !['low', 'standard', 'trusted'].includes(tier)) {
    return c.json({ error: 'invalid trust tier' }, 400)
  }
  if (!Array.isArray(ids) || ids.length === 0) {
    return c.json({ error: 'no users selected' }, 400)
  }
  const placeholders = ids.map(() => '?').join(',')
  db.query(`UPDATE users SET trust_tier = ? WHERE id IN (${placeholders})`).run(tier, ...ids)
  return c.json({ updated: ids.length, trustTier: tier })
})

// ─── API: Force-logout all sessions for user(s) ────────────────────────────

adminRoutes.post('/api/v1/admin/users/bulk-kill-sessions', async (c) => {
  if (!isAdmin(c)) return c.json({ error: 'unauthorized' }, 401)
  const db = c.get('db')
  const body = (await c.req.json().catch(() => ({}))) as { userIds?: string[] }
  const ids = body.userIds
  if (!Array.isArray(ids) || ids.length === 0) {
    return c.json({ error: 'no users selected' }, 400)
  }
  const now = Date.now()
  const placeholders = ids.map(() => '?').join(',')
  const result = db
    .query(`UPDATE sessions SET ended_at = ? WHERE user_id IN (${placeholders}) AND ended_at IS NULL`)
    .run(now, ...ids)
  return c.json({ killed: result.changes, userIds: ids })
})

// ─── API: System health ─────────────────────────────────────────────────────

adminRoutes.get('/api/v1/admin/health', (c) => {
  if (!isAdmin(c)) return c.json({ error: 'unauthorized' }, 401)
  const db = c.get('db')
  const config = c.get('config')

  const uptime = process.uptime()
  const mem = process.memoryUsage()
  const dbSize = db.query('SELECT page_count * page_size AS size FROM pragma_page_count(), pragma_page_size()').get() as { size: number } | undefined

  const totalUsers = (db.query('SELECT COUNT(*) AS c FROM users').get() as { c: number }).c
  const activeSessions = (db.query('SELECT COUNT(*) AS c FROM sessions WHERE ended_at IS NULL').get() as { c: number }).c
  const totalSessions = (db.query('SELECT COUNT(*) AS c FROM sessions').get() as { c: number }).c
  const totalUsageEvents = (db.query('SELECT COUNT(*) AS c FROM usage_events').get() as { c: number }).c
  const totalAdEvents = (db.query('SELECT COUNT(*) AS c FROM ad_events').get() as { c: number }).c
  const totalLogRecords = (db.query('SELECT COUNT(*) AS c FROM log_records').get() as { c: number }).c
  const totalWaitlist = (db.query('SELECT COUNT(*) AS c FROM waitlist').get() as { c: number }).c
  const totalSubscriptions = (db.query('SELECT COUNT(*) AS c FROM subscriptions').get() as { c: number }).c
  const activeSubscriptions = (db.query("SELECT COUNT(*) AS c FROM subscriptions WHERE status IN ('active','trialing')").get() as { c: number }).c

  const modelUsage = db
    .query(`SELECT model, COUNT(*) AS events, SUM(cost_usd) AS cost
            FROM usage_events GROUP BY model ORDER BY cost DESC`)
    .all() as Array<Record<string, unknown>>

  const oneHourAgo = Date.now() - 3_600_000
  const recentSessions = (db.query('SELECT COUNT(*) AS c FROM sessions WHERE admitted_at >= ?').get(oneHourAgo) as { c: number }).c
  const recentUsage = (db.query('SELECT COUNT(*) AS c FROM usage_events WHERE created_at >= ?').get(oneHourAgo) as { c: number }).c

  return c.json({
    uptime,
    memory: {
      rss: Math.round(mem.rss / 1024 / 1024),
      heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
      external: Math.round(mem.external / 1024 / 1024),
    },
    database: {
      sizeBytes: dbSize?.size ?? 0,
      sizeMB: ((dbSize?.size ?? 0) / 1024 / 1024).toFixed(2),
    },
    counts: {
      users: totalUsers,
      activeSessions,
      totalSessions,
      usageEvents: totalUsageEvents,
      adEvents: totalAdEvents,
      logRecords: totalLogRecords,
      waitlist: totalWaitlist,
      totalSubscriptions,
      activeSubscriptions,
    },
    recentActivity: {
      sessionsLastHour: recentSessions,
      usageEventsLastHour: recentUsage,
    },
    modelBreakdown: modelUsage.map((m) => ({
      model: String(m.model ?? 'unknown'),
      events: Number(m.events ?? 0),
      totalCost: Number(m.cost ?? 0),
    })),
    config: {
      port: config.port,
      freeSessionsPerDay: config.freeSessionsPerDay,
      waitlistMode: config.waitlistMode,
    },
  })
})
