import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { beforeAll, describe, expect, test } from 'bun:test'

import { createApp } from '../src/app'
import { loadConfig } from '../src/config'
import { getDb } from '../src/db'
import {
  endAllSessionsForUser,
  getSubscriptionByUserId,
  isPaidUser,
  upsertSubscription,
  upsertUserByEmail,
} from '../src/store'

const tmp = mkdtempSync(path.join(tmpdir(), 'freeport-phase3-'))
const config = loadConfig({
  dbPath: path.join(tmp, 'phase3.db'),
  appUrl: 'http://localhost:8787',
  freeSessionsPerDay: 3,
  paidSessionsPerDay: 6,
  freeDailySpendCapUsd: 0.05,
  subscriptionGracePeriodDays: 7,
  adminToken: 'test-admin-token',
})
const app = createApp(config)
const db = getDb(config)

function auth(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` }
}

async function login(fingerprintId: string, email: string): Promise<string> {
  const codeResp = await app.request('/api/auth/cli/code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fingerprintId }),
  })
  const { loginUrl } = (await codeResp.json()) as { loginUrl: string }
  const device = new URL(loginUrl).searchParams.get('device')!
  await app.request('/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ device, email, name: email }).toString(),
  })
  const statusResp = await app.request(
    `/api/auth/cli/status?fingerprintId=${encodeURIComponent(fingerprintId)}`,
  )
  const data = (await statusResp.json()) as { user: { authToken: string } }
  return data.user.authToken
}

/** Admit + immediately end a session; returns the admission response. */
async function admitAndEnd(
  token: string,
  model = 'deepseek/deepseek-v4-flash',
): Promise<{ status: number; body: Record<string, unknown> }> {
  const resp = await app.request('/api/v1/FREEPORT/session', {
    method: 'POST',
    headers: { ...auth(token), 'x-FREEPORT-model': model },
  })
  const body = (await resp.json()) as Record<string, unknown>
  if (resp.status === 200) {
    await app.request('/api/v1/FREEPORT/session', {
      method: 'DELETE',
      headers: auth(token),
    })
  }
  return { status: resp.status, body }
}

beforeAll(async () => {})

// ---------------------------------------------------------------------------

describe('plan structure: Public Utility (free)', () => {
  test('free quota is 3 sessions/day; 4th admission is rate-limited', async () => {
    const token = await login('fp-free-quota', 'free-quota@example.com')

    for (let i = 0; i < 3; i++) {
      const { status, body } = await admitAndEnd(token)
      expect(status).toBe(200)
      expect(body.status).toBe('active')
    }

    const { status, body } = await admitAndEnd(token)
    expect(status).toBe(429)
    expect(body.status).toBe('rate_limited')
    expect(body.limit).toBe(3)
  })

  test('daily spend cap ($0.05): heavy usage blocks further admissions', async () => {
    const token = await login('fp-spend-cap', 'spend-cap@example.com')

    // Admit one session so we have a realistic flow.
    const first = await admitAndEnd(token)
    expect(first.status).toBe(200)

    // 300K in @ $0.10/M + 150K out @ $0.20/M = $0.06 > $0.05 cap.
    const report = await app.request('/api/v1/usage/report', {
      method: 'POST',
      headers: { ...auth(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'sess-spend-cap',
        inputTokens: 300_000,
        outputTokens: 150_000,
      }),
    })
    expect(report.status).toBe(200)
    const reported = (await report.json()) as { costUsd: number }
    expect(reported.costUsd).toBeCloseTo(0.06, 4)

    const { status, body } = await admitAndEnd(token)
    expect(status).toBe(429)
    expect(body.reason).toBe('daily_spend_cap')
    expect(body.spendCapUsd).toBe(0.05)
  })

  test('subscription status for a free user has no subscription', async () => {
    const token = await login('fp-sub-free', 'sub-free@example.com')
    const resp = await app.request('/api/v1/subscription', {
      headers: auth(token),
    })
    expect(resp.status).toBe(200)
    const data = (await resp.json()) as { hasSubscription: boolean }
    expect(data.hasSubscription).toBe(false)
  })
})

describe('access helper rules (mirrored Paddle state)', () => {
  const userId = upsertUserByEmail(db, {
    email: 'access-rules@example.com',
    name: 'Access Rules',
  }).id

  function setState(status: string, opts: { graceEnd?: number | null } = {}) {
    upsertSubscription(db, {
      userId,
      paddleSubscriptionId: 'sub_access_rules',
      paddleCustomerId: 'cust_access_rules',
      status,
      plan: status === 'canceled' ? 'free' : 'pro',
      gracePeriodEnd: opts.graceEnd ?? null,
    })
  }

  test('active grants access', () => {
    setState('active')
    expect(isPaidUser(db, userId)).toBe(true)
  })

  test('trialing grants access', () => {
    setState('trialing')
    expect(isPaidUser(db, userId)).toBe(true)
  })

  test('scheduled cancellation does NOT revoke while status is still active', () => {
    setState('active')
    const sub = getSubscriptionByUserId(db, userId)!
    db.query(
      'UPDATE subscriptions SET scheduled_change_action = ?, scheduled_change_at = ? WHERE user_id = ?',
    ).run('cancel', Date.now() + 86_400_000, userId)
    void sub
    expect(isPaidUser(db, userId)).toBe(true)
  })

  test('past_due grants within the grace window, denies after it expires', () => {
    setState('past_due', { graceEnd: Date.now() + 86_400_000 })
    expect(isPaidUser(db, userId)).toBe(true)

    setState('past_due', { graceEnd: Date.now() - 1000 })
    expect(isPaidUser(db, userId)).toBe(false)
  })

  test('paused and canceled deny access', () => {
    setState('paused')
    expect(isPaidUser(db, userId)).toBe(false)

    setState('canceled')
    expect(isPaidUser(db, userId)).toBe(false)
  })
})

describe('Pro Supporter (paid) behavior', () => {
  let token = ''

  beforeAll(async () => {
    token = await login('fp-paid', 'paid@example.com')
    // Simulate what the verified transaction.completed / subscription.created
    // webhook handlers do.
    const user = db
      .query('SELECT id FROM users WHERE email = ?')
      .get('paid@example.com') as { id: string }
    upsertSubscription(db, {
      userId: user.id,
      paddleSubscriptionId: 'sub_paid_test',
      paddleCustomerId: 'cust_paid_test',
      status: 'active',
      plan: 'pro',
      priceId: 'pri_test_monthly',
      productId: 'pro_test',
    })
  })

  test('subscription endpoint reports an active subscription', async () => {
    const resp = await app.request('/api/v1/subscription', {
      headers: auth(token),
    })
    expect(resp.status).toBe(200)
    const data = (await resp.json()) as {
      hasSubscription: boolean
      rateLimit: { blockLimit: number }
    }
    expect(data.hasSubscription).toBe(true)
    expect(data.rateLimit.blockLimit).toBe(6)
  })

  test('paid quota is 6 sessions/day; 7th is rate-limited at 6', async () => {
    for (let i = 0; i < 6; i++) {
      const { status } = await admitAndEnd(token)
      expect(status).toBe(200)
    }
    const { status, body } = await admitAndEnd(token)
    expect(status).toBe(429)
    expect(body.limit).toBe(6)
  })

  test('paid users receive no ads', async () => {
    const resp = await app.request('/api/v1/ads', {
      method: 'POST',
      headers: { ...auth(token), 'Content-Type': 'application/json' },
      body: '{}',
    })
    expect(resp.status).toBe(200)
    const data = (await resp.json()) as { ads: unknown[] }
    expect(data.ads).toEqual([])
  })

  test('portal returns 404-shaped error only when customer record missing', async () => {
    // paid@example.com HAS a customer record stub? No — we never mirrored a
    // customers row for them, so portal must refuse cleanly.
    const resp = await app.request('/api/v1/subscription/portal', {
      headers: auth(token),
    })
    expect([404, 502]).toContain(resp.status)
  })
})

describe('pricing page', () => {
  test('fails loudly when PADDLE_CLIENT_TOKEN is unset', async () => {
    const untokenedConfig = loadConfig({
      dbPath: path.join(tmp, 'untokened.db'),
      paddleClientToken: '',
    })
    const untokenedApp = createApp(untokenedConfig)
    const resp = await untokenedApp.request('/pricing')
    expect(resp.status).toBe(503)
  })

  test('renders all three tiers with checkout wiring when configured', async () => {
    const pricedConfig = loadConfig({
      dbPath: path.join(tmp, 'priced.db'),
      paddleClientToken: 'test_token_placeholder',
      paddleEnv: 'sandbox',
    })
    const pricedApp = createApp(pricedConfig)
    const resp = await pricedApp.request('/pricing', {
      headers: { 'x-vercel-ip-country': 'DE' },
    })
    expect(resp.status).toBe(200)
    const html = await resp.text()
    expect(html).toContain('Public Utility')
    expect(html).toContain('Pro Supporter')
    expect(html).toContain('Power User')
    expect(html).toContain('paddle.js')
    expect(html).toContain("displayMode: 'overlay'")
    expect(html).toContain("variant: 'one-page'")
    expect(html).toContain('/welcome')
    expect(html).toContain(JSON.stringify('DE')) // country passed through
  })
})
