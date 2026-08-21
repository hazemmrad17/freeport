import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { beforeAll, describe, expect, test } from 'bun:test'

import { createApp } from '../src/app'
import { loadConfig } from '../src/config'

const tmp = mkdtempSync(path.join(tmpdir(), 'freeport-server-test-'))
const config = loadConfig({
  dbPath: path.join(tmp, 'test.db'),
  appUrl: 'http://localhost:8787',
  freeSessionsPerDay: 2,
  adminToken: 'test-admin-token',
  logShippingEnabled: true,
})
const app = createApp(config)

const fingerprintId = 'enhanced-test-fingerprint'

function auth(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` }
}

async function json(resp: Response): Promise<unknown> {
  return (await resp.json()) as unknown
}

describe('device-code login flow', () => {
  test('requests a login code and returns a usable login URL', async () => {
    const resp = await app.request('/api/auth/cli/code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fingerprintId }),
    })
    expect(resp.status).toBe(200)
    const data = (await json(resp)) as {
      loginUrl: string
      fingerprintHash: string
      expiresAt: string
    }
    expect(data.loginUrl).toContain('/login?device=')
    expect(data.fingerprintHash).toBeTruthy()
    expect(new Date(data.expiresAt).getTime()).toBeGreaterThan(Date.now())
  })

  test('status is pending before approval', async () => {
    const resp = await app.request(
      `/api/auth/cli/status?fingerprintId=${encodeURIComponent(fingerprintId)}`,
    )
    expect(resp.status).toBe(200)
    const data = (await json(resp)) as { user: unknown }
    expect(data.user).toBeNull()
  })

  test('approves via the web form', async () => {
    const codeResp = await app.request('/api/auth/cli/code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fingerprintId }),
    })
    const { loginUrl } = (await json(codeResp)) as { loginUrl: string }
    const device = new URL(loginUrl).searchParams.get('device')!

    const form = new URLSearchParams({
      device,
      email: 'tester@example.com',
      name: 'Tester',
    })
    const resp = await app.request('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    })
    expect(resp.status).toBe(200)
    expect(await resp.text()).toContain("You're signed in")
  })

  test('status returns a token once approved', async () => {
    const resp = await app.request(
      `/api/auth/cli/status?fingerprintId=${encodeURIComponent(fingerprintId)}`,
    )
    expect(resp.status).toBe(200)
    const data = (await json(resp)) as {
      user: { id: string; email: string; authToken: string }
    }
    expect(data.user).not.toBeNull()
    expect(data.user.email).toBe('tester@example.com')
    expect(data.user.authToken).toBeTruthy()
  })
})

describe('session lifecycle with daily quota', () => {
  let token = ''

  beforeAll(async () => {
    const resp = await app.request(
      `/api/auth/cli/status?fingerprintId=${encodeURIComponent(fingerprintId)}`,
    )
    const data = (await json(resp)) as { user: { authToken: string } }
    token = data.user.authToken
  })

  test('starts at status none with quota snapshots', async () => {
    const resp = await app.request('/api/v1/freebuff/session', {
      headers: auth(token),
    })
    expect(resp.status).toBe(200)
    const data = (await json(resp)) as {
      status: string
      accessTier: string
      rateLimitsByModel: Record<string, { limit: number; recentCount: number }>
    }
    expect(data.status).toBe('none')
    expect(data.accessTier).toBe('full')
    const flash = data.rateLimitsByModel['deepseek/deepseek-v4-flash']
    expect(flash.limit).toBe(2)
    expect(flash.recentCount).toBe(0)
  })

  test('admits a session on POST and reports it on GET', async () => {
    const resp = await app.request('/api/v1/freebuff/session', {
      method: 'POST',
      headers: { ...auth(token), 'x-freebuff-model': 'deepseek/deepseek-v4-flash' },
    })
    expect(resp.status).toBe(200)
    const active = (await json(resp)) as {
      status: string
      instanceId: string
      model: string
      remainingMs: number
    }
    expect(active.status).toBe('active')
    expect(active.instanceId).toBeTruthy()
    expect(active.remainingMs).toBeGreaterThan(0)

    const getResp = await app.request('/api/v1/freebuff/session', {
      headers: { ...auth(token), 'x-freebuff-instance-id': active.instanceId },
    })
    const got = (await json(getResp)) as { status: string; instanceId: string }
    expect(got.status).toBe('active')
    expect(got.instanceId).toBe(active.instanceId)
  })

  test('returns model_locked when switching models', async () => {
    const resp = await app.request('/api/v1/freebuff/session', {
      method: 'POST',
      headers: { ...auth(token), 'x-freebuff-model': 'mimo/mimo-v2.5' },
    })
    expect(resp.status).toBe(409)
    const data = (await json(resp)) as { status: string; currentModel: string; requestedModel: string }
    expect(data.status).toBe('model_locked')
    expect(data.currentModel).toBe('deepseek/deepseek-v4-flash')
    expect(data.requestedModel).toBe('mimo/mimo-v2.5')
  })

  test('releases the session on DELETE', async () => {
    const resp = await app.request('/api/v1/freebuff/session', { method: 'DELETE', headers: auth(token) })
    expect(resp.status).toBe(200)
    const data = (await json(resp)) as { status: string }
    expect(data.status).toBe('none')
  })

  test('rate-limits once the daily quota is spent', async () => {
    const admit = async () =>
      app.request('/api/v1/freebuff/session', {
        method: 'POST',
        headers: { ...auth(token), 'x-freebuff-model': 'deepseek/deepseek-v4-flash' },
      })

    // Session 2 of 2.
    const second = await admit()
    expect((await json(second)) as { status: string }).toMatchObject({ status: 'active' })
    await app.request('/api/v1/freebuff/session', { method: 'DELETE', headers: auth(token) })

    // Quota exhausted — session 3 must be refused.
    const third = await admit()
    expect(third.status).toBe(429)
    const limited = (await json(third)) as {
      status: string
      limit: number
      recentCount: number
      retryAfterMs: number
    }
    expect(limited.status).toBe('rate_limited')
    expect(limited.limit).toBe(2)
    expect(limited.recentCount).toBe(2)
    expect(limited.retryAfterMs).toBeGreaterThan(0)
  })
})

describe('ads', () => {
  let token = ''

  beforeAll(async () => {
    const resp = await app.request(
      `/api/auth/cli/status?fingerprintId=${encodeURIComponent(fingerprintId)}`,
    )
    const data = (await json(resp)) as { user: { authToken: string } }
    token = data.user.authToken
  })

  test('serves a sponsor line from inventory', async () => {
    const resp = await app.request('/api/v1/ads', {
      method: 'POST',
      headers: { ...auth(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'freeport', surface: 'cli_chat', messages: [] }),
    })
    expect(resp.status).toBe(200)
    const data = (await json(resp)) as { ads: Array<{ title: string; adText: string; impUrl: string; clickUrl: string }> }
    expect(data.ads.length).toBe(1)
    expect(data.ads[0]!.title).toBeTruthy()
    expect(data.ads[0]!.impUrl).toContain('/api/v1/ads/impression?imp=')
  })

  test('records impressions and clicks', async () => {
    const adResp = await app.request('/api/v1/ads', {
      method: 'POST',
      headers: { ...auth(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ surface: 'waiting_room' }),
    })
    const { ads } = (await json(adResp)) as { ads: Array<{ impUrl: string }> }

    const imp = await app.request('/api/v1/ads/impression', {
      method: 'POST',
      headers: { ...auth(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ impUrl: ads[0]!.impUrl }),
    })
    expect((await json(imp)) as { creditsGranted: number }).toMatchObject({ creditsGranted: 0 })

    const click = await app.request('/api/v1/ads/click', {
      method: 'POST',
      headers: { ...auth(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ impUrl: ads[0]!.impUrl }),
    })
    expect((await json(click)) as { success: boolean }).toMatchObject({ success: true })
  })
})

describe('usage + logs + admin', () => {
  let token = ''

  beforeAll(async () => {
    const resp = await app.request(
      `/api/auth/cli/status?fingerprintId=${encodeURIComponent(fingerprintId)}`,
    )
    const data = (await json(resp)) as { user: { authToken: string } }
    token = data.user.authToken
  })

  test('records usage and computes cost', async () => {
    const resp = await app.request('/api/v1/usage/report', {
      method: 'POST',
      headers: { ...auth(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'deepseek/deepseek-v4-flash',
        inputTokens: 50_000,
        outputTokens: 3_000,
      }),
    })
    expect(resp.status).toBe(200)
    const data = (await json(resp)) as { received: boolean; costUsd: number }
    expect(data.received).toBe(true)
    // 50K in @$0.10/M = $0.005, 3K out @$0.20/M = $0.0006 → $0.0056
    expect(data.costUsd).toBeCloseTo(0.0056, 6)
  })

  test('reports today usage snapshot', async () => {
    const resp = await app.request('/api/v1/usage', {
      method: 'POST',
      headers: { ...auth(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    const data = (await json(resp)) as { type: string; usage: number; balanceBreakdown: { spend_today_usd: number } }
    expect(data.type).toBe('usage-response')
    expect(data.usage).toBeGreaterThanOrEqual(2) // 2 admitted sessions counted today
    expect(data.balanceBreakdown.spend_today_usd).toBeCloseTo(0.0056, 6)
  })

  test('ingests log batches', async () => {
    const resp = await app.request('/api/logs', {
      method: 'POST',
      headers: { ...auth(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        records: [{ level: 'info', event: 'app_launched', message: 'hello', timestamp: new Date().toISOString() }],
      }),
    })
    expect(resp.status).toBe(200)
    expect((await json(resp)) as { received: boolean }).toMatchObject({ received: true })
  })

  test('admin stats require the admin token and show economics', async () => {
    const denied = await app.request('/api/v1/admin/stats')
    expect(denied.status).toBe(401)

    const ok = await app.request('/api/v1/admin/stats', {
      headers: auth('test-admin-token'),
    })
    expect(ok.status).toBe(200)
    const data = (await json(ok)) as {
      totals: { modelSpendUsd: number; adImpressions: number; netUsd: number }
      users: Array<{ email: string }>
    }
    expect(data.totals.modelSpendUsd).toBeGreaterThan(0)
    expect(data.totals.adImpressions).toBeGreaterThan(0)
    expect(data.users.some((u) => u.email === 'tester@example.com')).toBe(true)
  })

  test('admin dashboard renders HTML', async () => {
    const resp = await app.request('/admin?token=test-admin-token')
    expect(resp.status).toBe(200)
    const html = await resp.text()
    expect(html).toContain('freeport — daily economics')
    expect(html).toContain('tester@example.com')
  })
})