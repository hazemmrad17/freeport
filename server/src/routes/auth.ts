import { randomBytes } from 'node:crypto'
import { Hono } from 'hono'

import type { UserRow } from '../db'
import { calculateGitHubTrustTier, calculateGoogleTrustTier } from '../lib/trust-tier'
import type { AppBindings } from '../middleware/auth'
import { bearerToken, requireUser } from '../middleware/auth'
import {
  approveAttempt,
  createApiToken,
  createLoginAttempt,
  findApprovedAttemptByFingerprint,
  findPendingAttemptByDeviceCode,
  findPendingAttemptByFingerprint,
  getSignupCountForIp,
  hashFingerprint,
  recordSignupIp,
  revokeToken,
  upsertOAuthUser,
  upsertUserByEmail,
} from '../store'

const LOGIN_EXPIRY_MS = 15 * 60 * 1000

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export const authRoutes = new Hono<AppBindings>()

// ---------------------------------------------------------------------------
// CLI device-code login
// ---------------------------------------------------------------------------

authRoutes.post('/api/auth/cli/code', async (c) => {
  const config = c.get('config')
  const db = c.get('db')
  const body = await c.req.json().catch(() => null)
  const fingerprintId =
    typeof body?.fingerprintId === 'string' ? body.fingerprintId.trim() : ''
  if (!fingerprintId) {
    return c.json({ error: 'invalid_request', message: 'fingerprintId is required' }, 400)
  }

  const fingerprintHash = hashFingerprint(fingerprintId)
  const expiresAtMs = Date.now() + LOGIN_EXPIRY_MS

  // Reuse a still-valid pending attempt so re-requesting a login URL keeps the
  // same device code and the user can't accumulate dead rows.
  const existing = findPendingAttemptByFingerprint(db, fingerprintId)
  const attempt =
    existing ?? createLoginAttempt(db, { fingerprintId, fingerprintHash, expiresAtMs })

  const loginUrl = `${config.appUrl}/login?device=${encodeURIComponent(attempt.device_code)}`
  return c.json({
    loginUrl,
    fingerprintHash,
    expiresAt: new Date(attempt.expires_at).toISOString(),
  })
})

authRoutes.get('/api/auth/cli/status', (c) => {
  const db = c.get('db')
  const fingerprintId = c.req.query('fingerprintId') ?? ''
  if (!fingerprintId) {
    return c.json({ user: null })
  }

  const approved = findApprovedAttemptByFingerprint(db, fingerprintId)
  if (!approved?.user_id || !approved.token_secret) {
    return c.json({ user: null })
  }

  // Re-fetch the user (fingerprint may have been updated on the row).
  const user = db
    .query('SELECT * FROM users WHERE id = ?')
    .get(approved.user_id) as UserRow | undefined
  if (!user) return c.json({ user: null })

  return c.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      authToken: approved.token_secret,
      fingerprintId,
      fingerprintHash: approved.fingerprint_hash,
      trustTier: user.trust_tier,
      authProvider: user.auth_provider,
      credits: 0,
    },
  })
})

authRoutes.post('/api/auth/cli/logout', requireUser, async (c) => {
  const db = c.get('db')
  const token = bearerToken(c)
  if (token) revokeToken(db, token)
  return c.json({ success: true })
})

// ---------------------------------------------------------------------------
// GitHub OAuth
// ---------------------------------------------------------------------------

authRoutes.get('/api/auth/github/start', (c) => {
  const config = c.get('config')
  const device = c.req.query('device') ?? ''
  if (!config.githubClientId) {
    return c.html(
      loginPageHtml(
        device,
        'GitHub OAuth is not yet configured on this deployment (GITHUB_CLIENT_ID missing). Use email sign-in or configure environment.',
      ),
      500,
    )
  }
  const stateObj = { device, nonce: randomBytes(16).toString('hex') }
  const state = Buffer.from(JSON.stringify(stateObj)).toString('base64url')
  const url = `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(
    config.githubClientId,
  )}&redirect_uri=${encodeURIComponent(config.githubRedirectUri)}&scope=read:user,user:email&state=${encodeURIComponent(
    state,
  )}`
  return c.redirect(url)
})

authRoutes.get('/api/auth/github/callback', async (c) => {
  const config = c.get('config')
  const db = c.get('db')
  const code = c.req.query('code')
  const stateRaw = c.req.query('state')
  const errorParam = c.req.query('error')

  let device = ''
  if (stateRaw) {
    try {
      const parsed = JSON.parse(Buffer.from(stateRaw, 'base64url').toString('utf8'))
      device = typeof parsed.device === 'string' ? parsed.device : ''
    } catch {
      // ignore
    }
  }

  if (errorParam || !code) {
    return c.html(
      loginPageHtml(
        device,
        `GitHub sign-in canceled or failed: ${errorParam ?? 'No code received from provider.'}`,
      ),
      400,
    )
  }

  try {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: config.githubClientId,
        client_secret: config.githubClientSecret,
        code,
        redirect_uri: config.githubRedirectUri,
      }),
    })
    const tokenData = (await tokenRes.json().catch(() => null)) as {
      access_token?: string
      error?: string
      error_description?: string
    } | null

    if (!tokenData?.access_token) {
      return c.html(
        loginPageHtml(
          device,
          tokenData?.error_description || tokenData?.error || 'Failed to obtain access token from GitHub.',
        ),
        400,
      )
    }

    const accessToken = tokenData.access_token

    // Fetch user profile
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': 'Freeport-CLI-Server',
        Accept: 'application/vnd.github.v3+json',
      },
    })
    if (!userRes.ok) {
      return c.html(loginPageHtml(device, 'Failed to fetch user profile from GitHub.'), 400)
    }
    const ghUser = (await userRes.json()) as {
      id: number
      login: string
      name: string | null
      email: string | null
      avatar_url: string | null
      created_at: string
      public_repos?: number
      followers?: number
    }

    let email = ghUser.email
    if (!email) {
      const emailsRes = await fetch('https://api.github.com/user/emails', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'User-Agent': 'Freeport-CLI-Server',
          Accept: 'application/vnd.github.v3+json',
        },
      })
      if (emailsRes.ok) {
        const emails = (await emailsRes.json().catch(() => [])) as Array<{
          email: string
          primary: boolean
          verified: boolean
        }>
        const primary = emails.find((e) => e.primary && e.verified) ?? emails.find((e) => e.verified) ?? emails[0]
        if (primary) email = primary.email
      }
    }

    if (!email) {
      return c.html(
        loginPageHtml(device, 'No verified email address found on your GitHub account.'),
        400,
      )
    }

    const rawIp =
      c.req.header('x-forwarded-for')?.split(',')[0].trim() ||
      c.req.header('x-real-ip') ||
      '127.0.0.1'

    const signupsToday = getSignupCountForIp(db, rawIp)
    const isIpThrottled = signupsToday >= config.maxSignupsPerIp24h

    const { trustTier } = calculateGitHubTrustTier(
      {
        createdAt: ghUser.created_at,
        publicRepos: ghUser.public_repos,
        followers: ghUser.followers,
      },
      isIpThrottled,
    )

    recordSignupIp(db, rawIp)

    let fingerprintId: string | undefined
    let attempt = device ? findPendingAttemptByDeviceCode(db, device) : null
    if (attempt) {
      fingerprintId = attempt.fingerprint_id
    }

    const user = upsertOAuthUser(db, {
      authProvider: 'github',
      providerUserId: String(ghUser.id),
      email: email.toLowerCase().trim(),
      name: ghUser.name || ghUser.login,
      username: ghUser.login,
      avatarUrl: ghUser.avatar_url,
      providerAccountCreatedAt: new Date(ghUser.created_at).getTime(),
      trustTier,
      signupIp: rawIp,
      fingerprintId,
    })

    if (attempt) {
      const { token } = createApiToken(db, user.id)
      approveAttempt(db, attempt.id, user.id, token)
      return c.html(successPageHtml(device, user))
    }

    return c.html(successPageHtml('', user))
  } catch (err) {
    return c.html(loginPageHtml(device, `GitHub OAuth authentication error: ${String(err)}`), 500)
  }
})

// ---------------------------------------------------------------------------
// Google OAuth
// ---------------------------------------------------------------------------

authRoutes.get('/api/auth/google/start', (c) => {
  const config = c.get('config')
  const device = c.req.query('device') ?? ''
  if (!config.googleClientId) {
    return c.html(
      loginPageHtml(
        device,
        'Google OAuth is not yet configured on this deployment (GOOGLE_CLIENT_ID missing). Use email sign-in or configure environment.',
      ),
      500,
    )
  }
  const stateObj = { device, nonce: randomBytes(16).toString('hex') }
  const state = Buffer.from(JSON.stringify(stateObj)).toString('base64url')
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
    config.googleClientId,
  )}&redirect_uri=${encodeURIComponent(config.googleRedirectUri)}&response_type=code&scope=${encodeURIComponent(
    'openid email profile',
  )}&state=${encodeURIComponent(state)}&access_type=offline&prompt=select_account`
  return c.redirect(url)
})

authRoutes.get('/api/auth/google/callback', async (c) => {
  const config = c.get('config')
  const db = c.get('db')
  const code = c.req.query('code')
  const stateRaw = c.req.query('state')
  const errorParam = c.req.query('error')

  let device = ''
  if (stateRaw) {
    try {
      const parsed = JSON.parse(Buffer.from(stateRaw, 'base64url').toString('utf8'))
      device = typeof parsed.device === 'string' ? parsed.device : ''
    } catch {
      // ignore
    }
  }

  if (errorParam || !code) {
    return c.html(
      loginPageHtml(
        device,
        `Google sign-in canceled or failed: ${errorParam ?? 'No code received from provider.'}`,
      ),
      400,
    )
  }

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: config.googleClientId,
        client_secret: config.googleClientSecret,
        redirect_uri: config.googleRedirectUri,
        grant_type: 'authorization_code',
      }).toString(),
    })
    const tokenData = (await tokenRes.json().catch(() => null)) as {
      access_token?: string
      error?: string
      error_description?: string
    } | null

    if (!tokenData?.access_token) {
      return c.html(
        loginPageHtml(
          device,
          tokenData?.error_description || tokenData?.error || 'Failed to obtain access token from Google.',
        ),
        400,
      )
    }

    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    })
    if (!userInfoRes.ok) {
      return c.html(loginPageHtml(device, 'Failed to fetch user profile from Google.'), 400)
    }
    const googleUser = (await userInfoRes.json()) as {
      sub: string
      name?: string
      email?: string
      picture?: string
      email_verified?: boolean
    }

    if (!googleUser.email) {
      return c.html(loginPageHtml(device, 'No email returned from Google account.'), 400)
    }

    const rawIp =
      c.req.header('x-forwarded-for')?.split(',')[0].trim() ||
      c.req.header('x-real-ip') ||
      '127.0.0.1'

    const signupsToday = getSignupCountForIp(db, rawIp)
    const isIpThrottled = signupsToday >= config.maxSignupsPerIp24h

    const { trustTier } = calculateGoogleTrustTier(isIpThrottled)

    recordSignupIp(db, rawIp)

    let fingerprintId: string | undefined
    let attempt = device ? findPendingAttemptByDeviceCode(db, device) : null
    if (attempt) {
      fingerprintId = attempt.fingerprint_id
    }

    const user = upsertOAuthUser(db, {
      authProvider: 'google',
      providerUserId: googleUser.sub,
      email: googleUser.email.toLowerCase().trim(),
      name: googleUser.name || googleUser.email,
      username: googleUser.email.split('@')[0],
      avatarUrl: googleUser.picture,
      trustTier,
      signupIp: rawIp,
      fingerprintId,
    })

    if (attempt) {
      const { token } = createApiToken(db, user.id)
      approveAttempt(db, attempt.id, user.id, token)
      return c.html(successPageHtml(device, user))
    }

    return c.html(successPageHtml('', user))
  } catch (err) {
    return c.html(loginPageHtml(device, `Google OAuth authentication error: ${String(err)}`), 500)
  }
})

const PAGE_CSS = `
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
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 24px;
    position: relative;
    overflow-x: hidden;
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
  .auth-wrap {
    position: relative; z-index: 1;
    width: 100%; max-width: 480px;
  }
  .auth-header {
    text-align: center; margin-bottom: 24px;
  }
  .brand-logo {
    display: inline-block; width: 44px; height: auto; margin-bottom: 12px;
  }
  .auth-card {
    background: var(--bg-card);
    border: 1px solid var(--border-accent);
    padding: 36px 32px;
    clip-path: polygon(var(--chamfer) 0, 100% 0, 100% calc(100% - var(--chamfer)), calc(100% - var(--chamfer)) 100%, 0 100%, 0 var(--chamfer));
    box-shadow: 0 0 40px rgba(255, 176, 0, 0.08);
  }
  .badge {
    display: inline-flex; align-items: center; gap: 6px;
    font-family: var(--font-mono); font-size: 0.68rem; font-weight: 700;
    letter-spacing: 0.12em; text-transform: uppercase;
    color: var(--amber); border: 1px solid rgba(255,176,0,0.3);
    padding: 0.25rem 0.6rem; background: rgba(255,176,0,0.06);
    margin-bottom: 16px;
  }
  .pulse-dot {
    width: 6px; height: 6px; background: var(--amber); border-radius: 50%;
    animation: blink 1.5s step-end infinite;
  }
  @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
  h1 { font-size: 1.65rem; font-weight: 800; letter-spacing: -0.02em; margin-bottom: 8px; line-height: 1.2; }
  .auth-desc { color: var(--paper-dim); font-size: 0.88rem; line-height: 1.55; margin-bottom: 20px; }
  .code-display {
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 14px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 24px;
  }
  .code-label { font-family: var(--font-mono); font-size: 0.72rem; color: var(--paper-muted); text-transform: uppercase; letter-spacing: 0.1em; }
  .code-val { font-family: var(--font-mono); font-size: 1.25rem; font-weight: 800; color: var(--amber); letter-spacing: 0.15em; }
  
  .oauth-group {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 20px;
  }
  .btn-oauth {
    display: flex; align-items: center; justify-content: center; gap: 12px;
    width: 100%;
    font-family: var(--font-display); font-size: 0.9rem; font-weight: 700;
    text-decoration: none; padding: 12px 18px; cursor: pointer;
    background: var(--bg-surface); color: var(--paper);
    border: 1px solid var(--border);
    clip-path: polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px);
    transition: all 0.15s ease;
  }
  .btn-oauth:hover {
    background: #1c1c24; border-color: var(--amber);
    box-shadow: 0 0 15px rgba(255, 176, 0, 0.15);
    transform: translateY(-1px);
  }
  .btn-oauth svg { width: 20px; height: 20px; fill: currentColor; }
  
  .auth-divider {
    display: flex; align-items: center; text-align: center;
    margin: 20px 0; color: var(--paper-muted);
    font-family: var(--font-mono); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em;
  }
  .auth-divider::before, .auth-divider::after {
    content: ''; flex: 1; border-bottom: 1px solid var(--border);
  }
  .auth-divider span { padding: 0 12px; }

  label {
    display: block; font-family: var(--font-mono); font-size: 0.75rem;
    letter-spacing: 0.08em; text-transform: uppercase; color: var(--paper-dim);
    margin-bottom: 6px; margin-top: 14px;
  }
  input[type="text"], input[type="email"] {
    display: block; width: 100%;
    background: var(--bg-surface);
    border: 1px solid var(--border);
    color: var(--paper);
    font-family: var(--font-mono); font-size: 0.9rem;
    padding: 12px 14px;
    clip-path: polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px);
    outline: none; transition: border-color 0.2s;
  }
  input[type="text"]:focus, input[type="email"]:focus {
    border-color: var(--amber);
  }
  .btn-chamfer {
    display: inline-flex; align-items: center; justify-content: center; gap: 8px;
    width: 100%; margin-top: 20px;
    font-family: var(--font-mono); font-size: 0.85rem; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.08em; text-decoration: none;
    padding: 0.9rem 1.8rem; cursor: pointer;
    background: var(--amber); color: #0a0a0a;
    border: none;
    clip-path: polygon(var(--chamfer) 0, 100% 0, 100% calc(100% - var(--chamfer)), calc(100% - var(--chamfer)) 100%, 0 100%, 0 var(--chamfer));
    transition: transform 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
    box-shadow: 0 0 25px var(--amber-glow);
  }
  .btn-chamfer:hover { background: #ffbe26; transform: translateY(-2px); }
  .error {
    color: #ed462d; background: rgba(237, 70, 45, 0.1);
    border: 1px solid rgba(237, 70, 45, 0.3);
    padding: 10px 14px; font-size: 0.85rem; margin-bottom: 16px;
    font-family: var(--font-mono);
  }
  .ok {
    color: #22c55e; background: rgba(34, 197, 94, 0.1);
    border: 1px solid rgba(34, 197, 94, 0.3);
    padding: 12px 16px; margin-bottom: 20px;
    font-family: var(--font-mono); font-size: 0.9rem;
  }
  .check-icon {
    width: 56px; height: 56px; border-radius: 50%;
    background: var(--amber); color: #070709;
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto 20px; font-size: 1.8rem; font-weight: 900;
    box-shadow: 0 0 25px var(--amber-glow);
  }
  .trust-badge {
    display: inline-block;
    padding: 4px 10px;
    font-family: var(--font-mono);
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    border-radius: 3px;
    margin-top: 10px;
  }
  .trust-trusted { background: rgba(34, 197, 94, 0.15); color: #22c55e; border: 1px solid rgba(34, 197, 94, 0.4); }
  .trust-standard { background: rgba(255, 176, 0, 0.15); color: var(--amber); border: 1px solid rgba(255, 176, 0, 0.4); }
  .trust-low { background: rgba(237, 70, 45, 0.15); color: #f87171; border: 1px solid rgba(237, 70, 45, 0.4); }
`

function loginPageHtml(deviceCode: string, error?: string): string {
  const code = deviceCode.trim().toUpperCase().replace(/\s+/g, '')
  const ghUrl = `/api/auth/github/start?device=${encodeURIComponent(code)}`
  const googleUrl = `/api/auth/google/start?device=${encodeURIComponent(code)}`

  return `<!doctype html><html lang="en"><head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Sign in to Freeport CLI</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Chivo+Mono:ital,wght@0,400;0,700;1,400&family=Plus+Jakarta+Sans:wght@500;700;800&display=swap" rel="stylesheet">
  <style>${PAGE_CSS}</style>
</head>
<body>
  <div class="scanlines"></div>
  <div class="noise"></div>
  <div class="auth-wrap">
    <div class="auth-header">
      <a href="/" aria-label="Freeport Home">
        <svg class="brand-logo" viewBox="0 0 218.38 248.89" fill="none" xmlns="http://www.w3.org/2000/svg">
          <polygon points="106.57 248.89 0 187.21 0 65.88 106.57 126.55 106.57 248.89" fill="#ffb000"/>
          <path d="M110.94,248.89v-122.2l107.44-59.79v119.58l-107.44,62.41Z" fill="#ffb000"/>
          <path d="M218.38,61.95l-109.54,60.25L0,61.95,108.82,0l109.56,61.95Z" fill="#ffb000"/>
        </svg>
      </a>
    </div>

    <div class="auth-card">
      <div class="badge"><div class="pulse-dot"></div> Device Pairing</div>
      <h1>Sign in to Freeport</h1>
      <p class="auth-desc">Authorize your terminal with GitHub or Google for instant access.</p>

      ${error ? `<div class="error">${error}</div>` : ''}

      <div class="code-display">
        <span class="code-label">Device Code</span>
        <span class="code-val">${code || 'PAIRING'}</span>
      </div>

      <div class="oauth-group">
        <a href="${ghUrl}" class="btn-oauth">
          <svg viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
          Continue with GitHub
        </a>
        <a href="${googleUrl}" class="btn-oauth">
          <svg viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/></svg>
          Continue with Google
        </a>
      </div>

      <div class="auth-divider"><span>or sign in with email</span></div>

      <form method="post" action="/login">
        <input type="hidden" name="device" value="${code}">
        <label for="email">Email address</label>
        <input id="email" name="email" type="email" required autocomplete="email" placeholder="dev@you.com">
        
        <label for="name">Display name <span style="opacity:.6">(optional)</span></label>
        <input id="name" name="name" type="text" autocomplete="name" placeholder="Your name">
        
        <button type="submit" class="btn-chamfer">Authorize Terminal &rarr;</button>
      </form>
    </div>
  </div>
</body></html>`
}

function successPageHtml(deviceCode: string, user?: UserRow): string {
  const trustBadgeClass =
    user?.trust_tier === 'trusted'
      ? 'trust-trusted'
      : user?.trust_tier === 'low'
        ? 'trust-low'
        : 'trust-standard'
  const trustLabel =
    user?.trust_tier === 'trusted'
      ? 'Trusted Tier (Full Quota)'
      : user?.trust_tier === 'low'
        ? 'Low Trust Tier (1 session/day)'
        : 'Standard Tier (3 sessions/day)'

  return `<!doctype html><html lang="en"><head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Signed in — Freeport</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Chivo+Mono:wght@400;700&family=Plus+Jakarta+Sans:wght@500;700;800&display=swap" rel="stylesheet">
  <style>${PAGE_CSS}</style>
</head>
<body>
  <div class="scanlines"></div>
  <div class="noise"></div>
  <div class="auth-wrap">
    <div class="auth-header">
      <a href="/" aria-label="Freeport Home">
        <svg class="brand-logo" viewBox="0 0 218.38 248.89" fill="none" xmlns="http://www.w3.org/2000/svg">
          <polygon points="106.57 248.89 0 187.21 0 65.88 106.57 126.55 106.57 248.89" fill="#ffb000"/>
          <path d="M110.94,248.89v-122.2l107.44-59.79v119.58l-107.44,62.41Z" fill="#ffb000"/>
          <path d="M218.38,61.95l-109.54,60.25L0,61.95,108.82,0l109.56,61.95Z" fill="#ffb000"/>
        </svg>
      </a>
    </div>

    <div class="auth-card" style="text-align: center;">
      <div class="check-icon">&#10003;</div>
      <div class="ok"><strong>You're signed in.</strong> ${
        deviceCode ? `Code <code>${deviceCode}</code> approved.` : 'Account verified.'
      }</div>
      <h1 style="margin-bottom: 8px;">Terminal Authorized</h1>
      <p class="auth-desc" style="margin-bottom: 12px;">You can now close this browser tab and return to your terminal to start using Freeport.</p>
      
      ${
        user
          ? `<div>
              <span class="trust-badge ${trustBadgeClass}">
                ${user.auth_provider.toUpperCase()} • ${trustLabel}
              </span>
            </div>`
          : ''
      }

      <div style="background: var(--bg-surface); border: 1px solid var(--border); border-radius: 4px; padding: 14px; margin-top: 20px; font-family: var(--font-mono); font-size: 0.8rem; color: var(--amber);">
        λ freeport "explore codebase"
      </div>
      <a href="/" class="btn-chamfer" style="margin-top: 20px;">Back to Home</a>
    </div>
  </div>
</body></html>`
}

authRoutes.get('/login', (c) => {
  const device = c.req.query('device') ?? ''
  return c.html(loginPageHtml(device))
})

authRoutes.post('/login', async (c) => {
  const db = c.get('db')
  const contentType = c.req.header('content-type') ?? ''
  let body: Record<string, unknown>
  try {
    body = contentType.includes('application/json')
      ? ((await c.req.json()) as Record<string, unknown>)
      : ((await c.req.parseBody()) as unknown as Record<string, unknown>)
  } catch {
    return c.json({ error: 'invalid_request' }, 400)
  }

  const device = String(body.device ?? '').trim()
  const email = normalizeEmail(String(body.email ?? ''))
  if (!device || !email || !email.includes('@')) {
    return c.html(loginPageHtml(device, 'Please enter a valid email.'), 400)
  }
  const name = String(body.name ?? '').trim()

  const attempt = findPendingAttemptByDeviceCode(db, device)
  if (!attempt) {
    return c.html(
      loginPageHtml(device, 'That code is invalid or has expired. Run the login command again.'),
      400,
    )
  }

  const rawIp =
    c.req.header('x-forwarded-for')?.split(',')[0].trim() ||
    c.req.header('x-real-ip') ||
    '127.0.0.1'

  recordSignupIp(db, rawIp)

  const user = upsertUserByEmail(db, {
    email,
    name: name || email,
    fingerprintId: attempt.fingerprint_id,
  })
  const { token } = createApiToken(db, user.id)
  approveAttempt(db, attempt.id, user.id, token)

  return c.html(successPageHtml(device, user))
})

// ---------------------------------------------------------------------------
// Me
// ---------------------------------------------------------------------------

const ME_FIELDS = ['id', 'email', 'discord_id', 'trust_tier', 'auth_provider'] as const
type MeField = (typeof ME_FIELDS)[number]

authRoutes.get('/api/v1/me', requireUser, (c) => {
  const user = c.get('user')!
  const requested = (c.req.query('fields') ?? '')
    .split(',')
    .filter((f): f is MeField => (ME_FIELDS as readonly string[]).includes(f))
  const fields = requested.length > 0 ? requested : [...ME_FIELDS]
  const details: Record<string, string | null> = {}
  for (const field of fields) {
    if (field === 'id') details.id = user.id
    else if (field === 'email') details.email = user.email
    else if (field === 'discord_id') details.discord_id = null
    else if (field === 'trust_tier') details.trust_tier = user.trust_tier ?? 'standard'
    else if (field === 'auth_provider') details.auth_provider = user.auth_provider ?? 'email'
  }
  return c.json(details)
})