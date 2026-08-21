import type { Context } from 'hono'
import { Hono } from 'hono'

import type { AppBindings } from '../middleware/auth'
import { bearerToken } from '../middleware/auth'
import { getResetPeriod } from '../lib/reset-period'

type AdminCtx = Context<AppBindings>

interface UserDailyStats {
  userId: string
  email: string
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
         u.id AS userId, u.email AS email,
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

adminRoutes.get('/api/v1/admin/stats', (c) => {
  if (!isAdmin(c)) {
    c.status(401)
    return c.json({ error: 'unauthorized' })
  }
  const stats = dailyStats(c)
  return c.json({
    periodStart: new Date(stats.periodStartMs).toISOString(),
    resetAt: stats.resetAt,
    totals: stats.totals,
    users: stats.users,
  })
})

const DASHBOARD_CSS = `body{font-family:system-ui,sans-serif;max-width:960px;margin:0 auto;padding:24px;color:#111}
h1{font-size:22px}h2{font-size:16px;margin-top:28px}
table{width:100%;border-collapse:collapse;font-size:14px}
th,td{text-align:right;padding:8px;border-bottom:1px solid #e5e7eb}
th:first-child,td:first-child{text-align:left}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin:16px 0}
.kpi{background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px}
.kpi .v{font-size:20px;font-weight:700}
.kpi .l{font-size:12px;color:#6b7280}
.pos{color:#166534}.neg{color:#b91c1c}
code{background:#f3f4f6;padding:2px 6px;border-radius:4px}`

adminRoutes.get('/admin', (c) => {
  if (!isAdmin(c)) {
    c.status(401)
    return c.html(
      '<!doctype html><html><body><h1>Unauthorized</h1><p>Provide <code>?token=...</code> or a <code>Bearer</code> token.</p></body></html>',
    )
  }

  const config = c.get('config')
  const { periodStartMs, resetAt, users, totals } = dailyStats(c)

  const kpis = [
    { label: 'Active users today', value: String(users.length) },
    { label: 'Sessions used', value: String(totals.sessionsUsed) },
    { label: 'Model cost today', value: `$${totals.modelSpendUsd.toFixed(4)}` },
    { label: 'Ad impressions', value: String(totals.adImpressions) },
    { label: 'Est. ad revenue', value: `$${totals.adRevenueUsd.toFixed(4)}` },
    { label: 'Net (rev − cost)', value: `$${totals.netUsd.toFixed(4)}`, className: totals.netUsd >= 0 ? 'pos' : 'neg' },
  ]

  const rows = users
    .map(
      (u) => `<tr>
<td>${u.email}</td>
<td>${u.sessionsUsed}</td>
<td>${u.inputTokens.toLocaleString()}</td>
<td>${u.outputTokens.toLocaleString()}</td>
<td>$${u.modelSpendUsd.toFixed(4)}</td>
<td>${u.adImpressions}</td>
<td>${u.adClicks}</td>
<td>$${u.adRevenueUsd.toFixed(4)}</td>
<td class="${u.adRevenueUsd - u.modelSpendUsd >= 0 ? 'pos' : 'neg'}">$${(u.adRevenueUsd - u.modelSpendUsd).toFixed(4)}</td>
</tr>`,
    )
    .join('')

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>freeport admin</title><style>${DASHBOARD_CSS}</style></head>
<body>
<h1>freeport — daily economics</h1>
<p>Period starts <strong>${new Date(periodStartMs).toISOString()}</strong> · resets <strong>${resetAt}</strong> · sessions/day/user: <strong>${config.freeSessionsPerDay}</strong> · ad rev/impression: <strong>$${config.adRevenuePerImpressionUsd}</strong> (assumed)</p>
<div class="kpis">${kpis
    .map(
      (k) => `<div class="kpi"><div class="v ${k.className ?? ''}">${k.value}</div><div class="l">${k.label}</div></div>`,
    )
    .join('')}</div>
<h2>Per active user</h2>
<table>
<thead><tr><th>User</th><th>Sessions</th><th>Input tok</th><th>Output tok</th><th>Cost</th><th>Ad impr.</th><th>Ad clicks</th><th>Ad rev.</th><th>Net</th></tr></thead>
<tbody>${rows || '<tr><td colspan="9">No activity today.</td></tr>'}</tbody>
</table>
</body></html>`

  return c.html(html)
})