import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { Database } from 'bun:sqlite'
import { Hono } from 'hono'

import { loadConfig } from '../src/config'
import { migrate } from '../src/db'
import { calculateGitHubTrustTier, calculateGoogleTrustTier } from '../src/lib/trust-tier'
import { attachUser } from '../src/middleware/auth'
import { adminRoutes } from '../src/routes/admin'
import { authRoutes } from '../src/routes/auth'
import { sessionRoutes } from '../src/routes/session'
import {
  createApiToken,
  createLoginAttempt,
  createUser,
  getSignupCountForIp,
  getUserById,
  hashFingerprint,
  recordSignupIp,
  upsertOAuthUser,
} from '../src/store'

function buildTestApp() {
  const db = new Database(':memory:')
  migrate(db)

  const config = loadConfig({
    dbPath: ':memory:',
    adminToken: 'test-admin',
    githubClientId: 'gh_client_123',
    githubClientSecret: 'gh_secret_456',
    googleClientId: 'google_client_789',
    googleClientSecret: 'google_secret_012',
    lowTrustFreeSessionsPerDay: 1,
    freeSessionsPerDay: 3,
    paidSessionsPerDay: 6,
    maxSignupsPerIp24h: 3,
  })

  const app = new Hono()
  app.use('*', async (c, next) => {
    c.set('config', config)
    c.set('db', db)
    await next()
  })
  app.use('*', attachUser)
  app.route('/', authRoutes)
  app.route('/', sessionRoutes)
  app.route('/', adminRoutes)

  return { app, db, config }
}

describe('Trust Tier Calculations', () => {
  const MS_PER_DAY = 24 * 60 * 60 * 1000

  test('GitHub account >= 1 year is classified as trusted', () => {
    const twoYearsAgo = new Date(Date.now() - 730 * MS_PER_DAY).toISOString()
    const result = calculateGitHubTrustTier({
      createdAt: twoYearsAgo,
      publicRepos: 10,
      followers: 5,
    })
    expect(result.trustTier).toBe('trusted')
    expect(result.ageDays).toBeGreaterThanOrEqual(729)
  })

  test('GitHub account >= 30 days is classified as standard', () => {
    const sixtyDaysAgo = new Date(Date.now() - 60 * MS_PER_DAY).toISOString()
    const result = calculateGitHubTrustTier({
      createdAt: sixtyDaysAgo,
      publicRepos: 1,
      followers: 0,
    })
    expect(result.trustTier).toBe('standard')
  })

  test('GitHub account < 30 days is classified as low trust', () => {
    const fiveDaysAgo = new Date(Date.now() - 5 * MS_PER_DAY).toISOString()
    const result = calculateGitHubTrustTier({
      createdAt: fiveDaysAgo,
      publicRepos: 0,
      followers: 0,
    })
    expect(result.trustTier).toBe('low')
  })

  test('IP signup velocity throttling forces low trust tier', () => {
    const fiveYearsAgo = new Date(Date.now() - 1800 * MS_PER_DAY).toISOString()
    const result = calculateGitHubTrustTier(
      { createdAt: fiveYearsAgo, publicRepos: 50, followers: 20 },
      true, // isIpThrottled
    )
    expect(result.trustTier).toBe('low')
  })

  test('Google account defaults to standard, demoted to low on IP throttle', () => {
    expect(calculateGoogleTrustTier(false).trustTier).toBe('standard')
    expect(calculateGoogleTrustTier(true).trustTier).toBe('low')
  })
})

describe('IP Velocity Logging', () => {
  let db: Database

  beforeEach(() => {
    db = new Database(':memory:')
    migrate(db)
  })

  test('records and queries IP signups within 24h window', () => {
    const ip = '198.51.100.42'
    expect(getSignupCountForIp(db, ip)).toBe(0)

    recordSignupIp(db, ip)
    recordSignupIp(db, ip)
    recordSignupIp(db, ip)

    expect(getSignupCountForIp(db, ip)).toBe(3)
    expect(getSignupCountForIp(db, '1.2.3.4')).toBe(0)
  })
})

describe('OAuth User Storage & Device Pairing Flow', () => {
  test('upsertOAuthUser creates user with trust tier and metadata', () => {
    const { db } = buildTestApp()
    const user = upsertOAuthUser(db, {
      authProvider: 'github',
      providerUserId: '1234567',
      email: 'octocat@github.com',
      name: 'The Octocat',
      username: 'octocat',
      avatarUrl: 'https://avatars.githubusercontent.com/u/583231',
      providerAccountCreatedAt: Date.now() - 500 * 86400000,
      trustTier: 'trusted',
      signupIp: '127.0.0.1',
    })

    expect(user.auth_provider).toBe('github')
    expect(user.provider_user_id).toBe('1234567')
    expect(user.trust_tier).toBe('trusted')
    expect(user.username).toBe('octocat')

    const fetched = getUserById(db, user.id)
    expect(fetched?.email).toBe('octocat@github.com')
    expect(fetched?.trust_tier).toBe('trusted')
  })

  test('OAuth endpoints start redirects with state', async () => {
    const { app } = buildTestApp()

    const ghRes = await app.request('/api/auth/github/start?device=PAIR-9999')
    expect(ghRes.status).toBe(302)
    const ghLocation = ghRes.headers.get('location') || ''
    expect(ghLocation).toContain('https://github.com/login/oauth/authorize')
    expect(ghLocation).toContain('client_id=gh_client_123')

    const googleRes = await app.request('/api/auth/google/start?device=PAIR-9999')
    expect(googleRes.status).toBe(302)
    const googleLocation = googleRes.headers.get('location') || ''
    expect(googleLocation).toContain('https://accounts.google.com/o/oauth2/v2/auth')
    expect(googleLocation).toContain('client_id=google_client_789')
  })
})

describe('Trust Tier Session Quota Enforcement', () => {
  test('low-trust tier user is limited to 1 free session per day', async () => {
    const { app, db } = buildTestApp()

    // Create a low-trust user (e.g. brand new github account)
    const user = createUser(db, {
      email: 'newdev@example.com',
      name: 'New Dev',
      authProvider: 'github',
      trustTier: 'low',
    })
    const { token } = createApiToken(db, user.id)

    // Check status initially
    const getRes = await app.request('/api/v1/FREEPORT/session', {
      headers: { authorization: `Bearer ${token}` },
    })
    const getJson = (await getRes.json()) as { rateLimitsByModel: Record<string, { limit: number }> }
    expect(getJson.rateLimitsByModel['deepseek/deepseek-v4-flash'].limit).toBe(1)

    // First session admission: succeeds
    const admitRes1 = await app.request('/api/v1/FREEPORT/session', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'x-FREEPORT-model': 'deepseek/deepseek-v4-flash',
      },
    })
    expect(admitRes1.status).toBe(200)

    // End the first session
    await app.request('/api/v1/FREEPORT/session', {
      method: 'DELETE',
      headers: { authorization: `Bearer ${token}` },
    })

    // Second session admission: blocked with 429 rate limited (limit is 1 for low trust)
    const admitRes2 = await app.request('/api/v1/FREEPORT/session', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'x-FREEPORT-model': 'deepseek/deepseek-v4-flash',
      },
    })
    expect(admitRes2.status).toBe(429)
  })

  test('standard-trust tier user is allowed 3 free sessions per day', async () => {
    const { app, db } = buildTestApp()

    const user = createUser(db, {
      email: 'established@example.com',
      name: 'Established Dev',
      authProvider: 'github',
      trustTier: 'standard',
    })
    const { token } = createApiToken(db, user.id)

    // Admit & end 3 sessions
    for (let i = 0; i < 3; i++) {
      const res = await app.request('/api/v1/FREEPORT/session', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'x-FREEPORT-model': 'deepseek/deepseek-v4-flash',
        },
      })
      expect(res.status).toBe(200)

      await app.request('/api/v1/FREEPORT/session', {
        method: 'DELETE',
        headers: { authorization: `Bearer ${token}` },
      })
    }

    // 4th session admission: blocked with 429
    const admitRes4 = await app.request('/api/v1/FREEPORT/session', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'x-FREEPORT-model': 'deepseek/deepseek-v4-flash',
      },
    })
    expect(admitRes4.status).toBe(429)
  })
})

describe('Admin Dashboard Visibility', () => {
  test('admin dashboard renders user trust tier and provider', async () => {
    const { app, db } = buildTestApp()

    const user = createUser(db, {
      email: 'hacker@github.com',
      name: 'Hacker',
      authProvider: 'github',
      trustTier: 'trusted',
      signupIp: '203.0.113.195',
    })
    const { token } = createApiToken(db, user.id)

    // Perform a session so the user appears in active stats
    await app.request('/api/v1/FREEPORT/session', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'x-FREEPORT-model': 'deepseek/deepseek-v4-flash',
      },
    })

    const adminRes = await app.request('/admin?token=test-admin')
    expect(adminRes.status).toBe(200)
    const adminHtml = await adminRes.text()

    expect(adminHtml).toContain('hacker@github.com')
    expect(adminHtml).toContain('GITHUB')
    expect(adminHtml).toContain('TRUSTED')
    expect(adminHtml).toContain('203.0.113.195')
  })
})

describe('Waitlist Mode Gating ($0 Launch Safety)', () => {
  test('waitlist mode blocks free sessions with 403 waitlisted status', async () => {
    const db = new Database(':memory:')
    migrate(db)

    const config = loadConfig({
      dbPath: ':memory:',
      waitlistMode: true,
    })

    const app = new Hono()
    app.use('*', async (c, next) => {
      c.set('config', config)
      c.set('db', db)
      await next()
    })
    app.use('*', attachUser)
    app.route('/', sessionRoutes)

    const user = createUser(db, {
      email: 'waitlist_tester@example.com',
      name: 'Waitlist Tester',
      trustTier: 'standard',
    })
    const { token } = createApiToken(db, user.id)

    const res = await app.request('/api/v1/FREEPORT/session', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'x-FREEPORT-model': 'deepseek/deepseek-v4-flash',
      },
    })

    expect(res.status).toBe(403)
    const json = (await res.json()) as { status: string; message: string }
    expect(json.status).toBe('waitlisted')
    expect(json.message).toContain('Waitlist Mode')
  })
})
