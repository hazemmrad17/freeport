import { Hono } from 'hono'

import type { AppBindings } from '../middleware/auth'
import { bearerToken, requireUser } from '../middleware/auth'
import {
  approveAttempt,
  createApiToken,
  createLoginAttempt,
  findApprovedAttemptByFingerprint,
  findPendingAttemptByDeviceCode,
  findPendingAttemptByFingerprint,
  hashFingerprint,
  revokeToken,
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
    .get(approved.user_id) as { id: string; email: string; name: string } | undefined
  if (!user) return c.json({ user: null })

  return c.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      authToken: approved.token_secret,
      fingerprintId,
      fingerprintHash: approved.fingerprint_hash,
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
// Web login page (device-code entry)
// ---------------------------------------------------------------------------

const PAGE_CSS = `body{font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111;background:#fff}
code{background:#f3f4f6;padding:2px 6px;border-radius:4px;font-size:1.05em}
input{display:block;width:100%;box-sizing:border-box;padding:10px;margin:8px 0 16px;border:1px solid #d1d5db;border-radius:6px;font-size:16px}
button{background:#111;color:#fff;border:0;border-radius:6px;padding:10px 18px;font-size:16px;cursor:pointer}
.error{color:#b91c1c;background:#fee2e2;border:1px solid #fecaca;border-radius:6px;padding:10px 14px;margin-bottom:16px}
.ok{color:#166534;background:#dcfce7;border:1px solid #bbf7d0;border-radius:6px;padding:10px 14px;margin-bottom:16px}`

function loginPageHtml(deviceCode: string, error?: string): string {
  const code = deviceCode.trim().toUpperCase().replace(/\s+/g, '')
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sign in to the CLI</title><style>${PAGE_CSS}</style></head>
<body>
<h1>Sign in to the CLI</h1>
<p>This browser opened from the freeport coding agent. Confirm the code below matches the one shown in your terminal, then add your email to get started.</p>
<p>Device code: <code>${code}</code></p>
${error ? `<div class="error">${error}</div>` : ''}
<form method="post" action="/login">
  <input type="hidden" name="device" value="${code}">
  <label for="email">Email</label>
  <input id="email" name="email" type="email" required autocomplete="email" placeholder="you@example.com">
  <label for="name">Name <span style="opacity:.6">(optional)</span></label>
  <input id="name" name="name" type="text" autocomplete="name" placeholder="Your name">
  <button type="submit">Continue</button>
</form>
</body></html>`
}

function successPageHtml(deviceCode: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Signed in</title><style>${PAGE_CSS}</style></head>
<body>
<div class="ok"><strong>You're signed in.</strong> Code <code>${deviceCode}</code> approved.</div>
<p>You can close this tab and return to your terminal.</p>
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

  const user = upsertUserByEmail(db, {
    email,
    name: name || email,
    fingerprintId: attempt.fingerprint_id,
  })
  const { token } = createApiToken(db, user.id)
  approveAttempt(db, attempt.id, user.id, token)

  return c.html(successPageHtml(device))
})

// ---------------------------------------------------------------------------
// Me
// ---------------------------------------------------------------------------

const ME_FIELDS = ['id', 'email', 'discord_id'] as const
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
  }
  return c.json(details)
})