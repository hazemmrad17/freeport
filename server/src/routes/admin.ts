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

const DASHBOARD_CSS = `
  :root {
    --amber: #ffb000;
    --amber-glow: rgba(255, 176, 0, 0.3);
    --bg: #070709;
    --bg-card: #0e0e12;
    --bg-surface: #14141a;
    --border: rgba(240, 237, 230, 0.12);
    --border-accent: rgba(255, 176, 0, 0.4);
    --paper: #f0ede6;
    --paper-dim: rgba(240, 237, 230, 0.7);
    --paper-muted: rgba(240, 237, 230, 0.45);
    --chamfer: 8px;
    --font-mono: 'Chivo Mono', monospace;
    --font-display: 'Plus Jakarta Sans', sans-serif;
  }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: var(--font-display);
    background: var(--bg);
    color: var(--paper);
    padding: 36px 24px;
    min-height: 100vh;
    position: relative;
  }
  .scanlines {
    position: fixed; inset: 0; pointer-events: none; z-index: 9990;
    background: repeating-linear-gradient(to bottom, transparent 0px, transparent 3px, rgba(0,0,0,0.22) 3px, rgba(0,0,0,0.22) 4px);
  }
  .noise {
    position: fixed; inset: 0; pointer-events: none; z-index: 9989;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.08'/%3E%3C/svg%3E");
    opacity: 0.45;
  }
  .admin-container { max-width: 1200px; margin: 0 auto; position: relative; z-index: 1; }
  .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 28px; }
  .brand { display: flex; align-items: center; gap: 12px; text-decoration: none; color: var(--paper); }
  .brand svg { width: 32px; height: 32px; }
  .brand-title { font-family: var(--font-mono); font-weight: 800; font-size: 1.1rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--amber); }
  .badge {
    font-family: var(--font-mono); font-size: 0.72rem; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.1em;
    padding: 4px 10px; border: 1px solid var(--border-accent);
    color: var(--amber); background: rgba(255, 176, 0, 0.08);
  }
  h1 { font-size: 1.75rem; font-weight: 900; letter-spacing: -0.02em; margin-bottom: 6px; }
  .meta-bar { font-family: var(--font-mono); font-size: 0.78rem; color: var(--paper-dim); margin-bottom: 24px; }
  .meta-bar strong { color: var(--amber); }
  .kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 14px; margin: 20px 0 32px; }
  .kpi {
    background: var(--bg-card);
    border: 1px solid var(--border);
    padding: 18px 16px;
    clip-path: polygon(var(--chamfer) 0, 100% 0, 100% calc(100% - var(--chamfer)), calc(100% - var(--chamfer)) 100%, 0 100%, 0 var(--chamfer));
  }
  .kpi .v { font-family: var(--font-mono); font-size: 1.5rem; font-weight: 800; color: var(--paper); }
  .kpi .l { font-family: var(--font-mono); font-size: 0.68rem; color: var(--paper-muted); text-transform: uppercase; letter-spacing: 0.08em; margin-top: 4px; }
  .pos { color: #22c55e !important; }
  .neg { color: #ed462d !important; }
  h2 { font-size: 1.15rem; font-weight: 800; margin: 32px 0 14px; letter-spacing: -0.01em; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
  .stat-card {
    background: var(--bg-card); border: 1px solid var(--border);
    padding: 20px; border-radius: 4px;
  }
  .stat-card h3 { font-size: 0.95rem; font-weight: 700; margin-bottom: 12px; color: var(--amber); }
  .stat-pill-list { display: flex; flex-wrap: wrap; gap: 8px; }
  .stat-pill {
    background: var(--bg-surface); border: 1px solid var(--border);
    padding: 6px 12px; font-family: var(--font-mono); font-size: 0.75rem;
    display: flex; gap: 6px; align-items: center; border-radius: 3px;
  }
  .stat-pill strong { color: var(--amber); }
  .table-wrap {
    background: var(--bg-card); border: 1px solid var(--border);
    border-radius: 4px; overflow-x: auto;
  }
  table { width: 100%; border-collapse: collapse; font-family: var(--font-mono); font-size: 0.8rem; }
  th, td { padding: 12px 14px; border-bottom: 1px solid var(--border); text-align: right; }
  th { background: var(--bg-surface); color: var(--paper-muted); font-weight: 700; text-transform: uppercase; font-size: 0.68rem; letter-spacing: 0.08em; }
  th:first-child, td:first-child { text-align: left; }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: rgba(255, 176, 0, 0.03); }
  code { background: var(--bg-surface); border: 1px solid var(--border); padding: 2px 6px; border-radius: 3px; color: var(--amber); }
`

adminRoutes.get('/admin', (c) => {
  if (!isAdmin(c)) {
    c.status(401)
    return c.html(
      `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Unauthorized — Freeport</title>
      <style>body{background:#070709;color:#f0ede6;font-family:'Plus Jakarta Sans',sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;}
      .card{background:#0e0e12;border:1px solid rgba(237,70,45,0.4);padding:40px;text-align:center;border-radius:8px;}
      code{font-family:monospace;color:#ffb000;}</style></head>
      <body><div class="card"><h1 style="color:#ed462d">Unauthorized</h1><p>Provide <code>?token=...</code> or a <code>Bearer</code> token.</p></div></body></html>`,
    )
  }

  const config = c.get('config')
  const db = c.get('db')
  const { periodStartMs, resetAt, users, totals } = dailyStats(c)
  const waitlist = getWaitlistSummary(db)
  const demographics = getUserDemographicsSummary(db)

  const kpis = [
    { label: 'Waitlist Signups', value: String(waitlist.total) },
    { label: 'Registered Devs', value: String(demographics.total) },
    { label: 'Active users today', value: String(users.length) },
    { label: 'Sessions used', value: String(totals.sessionsUsed) },
    { label: 'Model cost today', value: `$${totals.modelSpendUsd.toFixed(4)}` },
    { label: 'Net (rev − cost)', value: `$${totals.netUsd.toFixed(4)}`, className: totals.netUsd >= 0 ? 'pos' : 'neg' },
  ]

  const rows = users
    .map(
      (u) => `<tr>
<td>
  <strong>${u.email}</strong>
  <div style="font-size:0.68rem; color:var(--paper-muted); margin-top:2px;">
    ${u.authProvider.toUpperCase()} · ${u.signupIp}
  </div>
</td>
<td><span style="font-weight:700; color:${u.trustTier === 'trusted' ? '#22c55e' : u.trustTier === 'low' ? '#f87171' : 'var(--amber)'}">${u.trustTier.toUpperCase()}</span></td>
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

  const waitlistPills = waitlist.bySource.length
    ? waitlist.bySource
        .map((s) => `<div class="stat-pill"><span>${s.source}:</span> <strong>${s.count}</strong></div>`)
        .join('')
    : '<span style="color:var(--paper-muted);font-size:0.8rem">No waitlist entries yet.</span>'

  const providerPills = demographics.byProvider.length
    ? demographics.byProvider
        .map((p) => `<div class="stat-pill"><span>${p.provider.toUpperCase()}:</span> <strong>${p.count}</strong></div>`)
        .join('')
    : '<span style="color:var(--paper-muted);font-size:0.8rem">No users yet.</span>'

  const trustPills = demographics.byTrustTier.length
    ? demographics.byTrustTier
        .map((t) => `<div class="stat-pill"><span>${t.trustTier.toUpperCase()}:</span> <strong>${t.count}</strong></div>`)
        .join('')
    : ''

  const html = `<!doctype html><html lang="en"><head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Admin Dashboard — Freeport</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Chivo+Mono:wght@400;600;700&family=Plus+Jakarta+Sans:wght@500;700;800&display=swap" rel="stylesheet">
  <style>${DASHBOARD_CSS}</style>
</head>
<body>
  <div class="scanlines"></div>
  <div class="noise"></div>
  <div class="admin-container">
    <div class="header">
      <a href="/" class="brand">
        <svg viewBox="0 0 218.38 248.89" fill="none" xmlns="http://www.w3.org/2000/svg">
          <polygon points="106.57 248.89 0 187.21 0 65.88 106.57 126.55 106.57 248.89" fill="#ffb000"/>
          <path d="M110.94,248.89v-122.2l107.44-59.79v119.58l-107.44,62.41Z" fill="#ffb000"/>
          <path d="M218.38,61.95l-109.54,60.25L0,61.95,108.82,0l109.56,61.95Z" fill="#ffb000"/>
        </svg>
        <span class="brand-title">Freeport Admin</span>
      </a>
      <span class="badge">${config.waitlistMode ? 'Waitlist Gated ($0 Spend Mode)' : 'Live Model Serving'}</span>
    </div>

    <h1>freeport — daily economics & launch analytics</h1>
    <p class="meta-bar">Period starts <strong>${new Date(periodStartMs).toISOString()}</strong> · resets <strong>${resetAt}</strong> · mode: <strong>${config.waitlistMode ? 'WAITLIST_ONLY' : 'OPEN_INFERENCE'}</strong></p>
    
    <div class="kpis">${kpis
    .map(
      (k) => `<div class="kpi"><div class="v ${k.className ?? ''}">${k.value}</div><div class="l">${k.label}</div></div>`,
    )
    .join('')}</div>
    
    <div class="grid-2">
      <div class="stat-card">
        <h3>Waitlist Acquisition by Source / Community</h3>
        <div class="stat-pill-list">${waitlistPills}</div>
      </div>
      <div class="stat-card">
        <h3>Registered Developers by Provider & Trust Tier</h3>
        <div class="stat-pill-list">${providerPills} ${trustPills}</div>
      </div>
    </div>

    <h2>Daily active session activity</h2>
    <div class="table-wrap">
      <table>
        <thead><tr><th>User / Provider</th><th>Trust</th><th>Sessions</th><th>Input tok</th><th>Output tok</th><th>Cost</th><th>Ad impr.</th><th>Ad clicks</th><th>Ad rev.</th><th>Net</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="10" style="text-align:center;padding:24px;color:var(--paper-muted)">No inference sessions active today.</td></tr>'}</tbody>
      </table>
    </div>
  </div>
</body></html>`

  return c.html(html)
})