import { createHash, randomBytes, randomUUID } from 'node:crypto'

import type { Database } from 'bun:sqlite'

import type {
  AdEventRow,
  ApiTokenRow,
  CustomerRow,
  LoginAttemptRow,
  LogRecordRow,
  SessionRow,
  SessionUsageRow,
  SubscriptionRow,
  UsageEventRow,
  UserRow,
} from './db'

// ---------------------------------------------------------------------------
// Ids / hashing
// ---------------------------------------------------------------------------

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function newToken(): string {
  return randomBytes(24).toString('base64url')
}

/** Human-friendly device code, e.g. `XM4K-7Q2P`. */
export function newDeviceCode(): string {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  const pick = (n: number) =>
    Array.from({ length: n }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('')
  return `${pick(4)}-${pick(4)}`
}

export function hashFingerprint(fingerprintId: string): string {
  return createHash('sha256').update(fingerprintId).digest('base64url')
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export function getUserByEmail(db: Database, email: string): UserRow | null {
  return (db.query('SELECT * FROM users WHERE email = ?').get(email) as UserRow | undefined) ?? null
}

export function getUserById(db: Database, id: string): UserRow | null {
  return (db.query('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined) ?? null
}

export function createUser(
  db: Database,
  params: { email: string; name: string; fingerprintId?: string },
): UserRow {
  const id = randomUUID()
  const now = Date.now()
  db.query(
    'INSERT INTO users (id, email, name, fingerprint_id, created_at) VALUES (?, ?, ?, ?, ?)',
  ).run(id, params.email.trim().toLowerCase(), params.name.trim() || params.email, params.fingerprintId ?? null, now)
  return { id, email: params.email, name: params.name, fingerprint_id: params.fingerprintId ?? null, created_at: now }
}

export function upsertUserByEmail(
  db: Database,
  params: { email: string; name: string; fingerprintId?: string },
): UserRow {
  const existing = getUserByEmail(db, params.email)
  if (existing) {
    if (params.fingerprintId && existing.fingerprint_id !== params.fingerprintId) {
      db.query('UPDATE users SET fingerprint_id = ? WHERE id = ?').run(
        params.fingerprintId,
        existing.id,
      )
    }
    return { ...existing, fingerprint_id: params.fingerprintId ?? existing.fingerprint_id }
  }
  return createUser(db, params)
}

// ---------------------------------------------------------------------------
// API tokens
// ---------------------------------------------------------------------------

export function createApiToken(db: Database, userId: string): { token: string; hash: string } {
  const token = newToken()
  const hash = hashToken(token)
  db.query('INSERT INTO api_tokens (token_hash, user_id, created_at) VALUES (?, ?, ?)').run(
    hash,
    userId,
    Date.now(),
  )
  return { token, hash }
}

export function findUserByToken(db: Database, token: string): UserRow | null {
  const row = db
    .query(
      'SELECT * FROM api_tokens WHERE token_hash = ? AND revoked = 0',
    )
    .get(hashToken(token)) as ApiTokenRow | undefined
  if (!row) return null
  db.query('UPDATE api_tokens SET last_used_at = ? WHERE token_hash = ?').run(Date.now(), row.token_hash)
  return getUserById(db, row.user_id)
}

export function revokeToken(db: Database, token: string): void {
  db.query('UPDATE api_tokens SET revoked = 1 WHERE token_hash = ?').run(hashToken(token))
}

// ---------------------------------------------------------------------------
// Login attempts (device-code flow)
// ---------------------------------------------------------------------------

export function findPendingAttemptByFingerprint(
  db: Database,
  fingerprintId: string,
): LoginAttemptRow | null {
  return (
    db
      .query(
        "SELECT * FROM login_attempts WHERE fingerprint_id = ? AND status = 'pending' AND expires_at > ? ORDER BY created_at DESC LIMIT 1",
      )
      .get(fingerprintId, Date.now()) as LoginAttemptRow | undefined
  ) ?? null
}

export function createLoginAttempt(
  db: Database,
  params: { fingerprintId: string; fingerprintHash: string; expiresAtMs: number },
): LoginAttemptRow {
  const row: LoginAttemptRow = {
    id: randomUUID(),
    fingerprint_id: params.fingerprintId,
    fingerprint_hash: params.fingerprintHash,
    device_code: newDeviceCode(),
    status: 'pending',
    user_id: null,
    token_secret: null,
    expires_at: params.expiresAtMs,
    created_at: Date.now(),
  }
  db.query(
    `INSERT INTO login_attempts (id, fingerprint_id, fingerprint_hash, device_code, status, user_id, token_secret, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(row.id, row.fingerprint_id, row.fingerprint_hash, row.device_code, row.status, row.user_id, row.token_secret, row.expires_at, row.created_at)
  return row
}

export function findPendingAttemptByDeviceCode(
  db: Database,
  deviceCode: string,
): LoginAttemptRow | null {
  const code = deviceCode.trim().toUpperCase().replace(/\s+/g, '')
  return (
    db
      .query(
        "SELECT * FROM login_attempts WHERE device_code = ? AND status = 'pending' AND expires_at > ? ORDER BY created_at DESC LIMIT 1",
      )
      .get(code, Date.now()) as LoginAttemptRow | undefined
  ) ?? null
}

export function findApprovedAttemptByFingerprint(
  db: Database,
  fingerprintId: string,
): LoginAttemptRow | null {
  return (
    db
      .query(
        "SELECT * FROM login_attempts WHERE fingerprint_id = ? AND status = 'approved' AND expires_at > ? ORDER BY created_at DESC LIMIT 1",
      )
      .get(fingerprintId, Date.now()) as LoginAttemptRow | undefined
  ) ?? null
}

export function approveAttempt(
  db: Database,
  attemptId: string,
  userId: string,
  tokenSecret: string,
): void {
  db.query(
    "UPDATE login_attempts SET status = 'approved', user_id = ?, token_secret = ? WHERE id = ?",
  ).run(userId, tokenSecret, attemptId)
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

export function getActiveSessionForUser(db: Database, userId: string): SessionRow | null {
  const row = db
    .query(
      'SELECT * FROM sessions WHERE user_id = ? AND ended_at IS NULL ORDER BY admitted_at DESC LIMIT 1',
    )
    .get(userId) as SessionRow | undefined
  if (!row) return null
  if (row.expires_at + 0 <= Date.now()) {
    endSession(db, row.instance_id)
    return null
  }
  return row
}

export function getSessionByInstance(db: Database, instanceId: string): SessionRow | null {
  return (db.query('SELECT * FROM sessions WHERE instance_id = ?').get(instanceId) as SessionRow | undefined) ?? null
}

export function admitSession(
  db: Database,
  params: { userId: string; model: string; durationMs: number },
): SessionRow {
  const instanceId = randomUUID()
  const now = Date.now()
  const row: SessionRow = {
    instance_id: instanceId,
    user_id: params.userId,
    model: params.model,
    admitted_at: now,
    expires_at: now + params.durationMs,
    ended_at: null,
  }
  db.query(
    'INSERT INTO sessions (instance_id, user_id, model, admitted_at, expires_at, ended_at) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(row.instance_id, row.user_id, row.model, row.admitted_at, row.expires_at, row.ended_at)
  return row
}

export function rotateSession(
  db: Database,
  previous: SessionRow,
  model: string,
  durationMs: number,
): SessionRow {
  endSession(db, previous.instance_id)
  return admitSession(db, { userId: previous.user_id, model, durationMs })
}

export function endSession(db: Database, instanceId: string): void {
  db.query('UPDATE sessions SET ended_at = ? WHERE instance_id = ? AND ended_at IS NULL').run(
    Date.now(),
    instanceId,
  )
}

export function endAllSessionsForUser(db: Database, userId: string): void {
  db.query('UPDATE sessions SET ended_at = ? WHERE user_id = ? AND ended_at IS NULL').run(
    Date.now(),
    userId,
  )
}

// ---------------------------------------------------------------------------
// Session usage (daily quota)
// ---------------------------------------------------------------------------

export function incrementSessionUsage(db: Database, userId: string, periodStartMs: number): number {
  db.query(
    `INSERT INTO session_usage (user_id, period_start, units) VALUES (?, ?, 1)
     ON CONFLICT(user_id, period_start) DO UPDATE SET units = units + 1`,
  ).run(userId, periodStartMs)
  return getSessionUsageUnits(db, userId, periodStartMs)
}

export function getSessionUsageUnits(db: Database, userId: string, periodStartMs: number): number {
  const row = db
    .query('SELECT units FROM session_usage WHERE user_id = ? AND period_start = ?')
    .get(userId, periodStartMs) as Pick<SessionUsageRow, 'units'> | undefined
  return row?.units ?? 0
}

/** Total reported model spend (USD) for this user since `sinceMs`. */
export function getSpendSinceMs(db: Database, userId: string, sinceMs: number): number {
  const row = db
    .query(
      'SELECT COALESCE(SUM(cost_usd), 0) AS total FROM usage_events WHERE user_id = ? AND created_at >= ?',
    )
    .get(userId, sinceMs) as { total: number | null } | undefined
  return row?.total ?? 0
}

// ---------------------------------------------------------------------------
// Usage events
// ---------------------------------------------------------------------------

export function insertUsageEvent(
  db: Database,
  event: Omit<UsageEventRow, 'id' | 'created_at'>,
): void {
  db.query(
    `INSERT INTO usage_events (user_id, session_instance_id, model, input_tokens, output_tokens, cached_input_tokens, cost_usd, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    event.user_id,
    event.session_instance_id,
    event.model,
    event.input_tokens,
    event.output_tokens,
    event.cached_input_tokens,
    event.cost_usd,
    Date.now(),
  )
}

// ---------------------------------------------------------------------------
// Ad events
// ---------------------------------------------------------------------------

export function insertAdEvent(
  db: Database,
  event: Omit<AdEventRow, 'id' | 'created_at'>,
): void {
  db.query(
    'INSERT INTO ad_events (user_id, kind, ad_title, imp_url, created_at) VALUES (?, ?, ?, ?, ?)',
  ).run(event.user_id, event.kind, event.ad_title, event.imp_url, Date.now())
}

// ---------------------------------------------------------------------------
// Logs
// ---------------------------------------------------------------------------

export function insertLogRecord(
  db: Database,
  record: Omit<LogRecordRow, 'id' | 'created_at'>,
): void {
  db.query('INSERT INTO log_records (user_id, body, created_at) VALUES (?, ?, ?)').run(
    record.user_id,
    record.body,
    Date.now(),
  )
}

// ---------------------------------------------------------------------------
// Subscriptions
// ---------------------------------------------------------------------------

export function getSubscriptionByUserId(
  db: Database,
  userId: string,
): SubscriptionRow | null {
  return (
    db
      .query('SELECT * FROM subscriptions WHERE user_id = ?')
      .get(userId) as SubscriptionRow | undefined
  ) ?? null
}

export function getSubscriptionByPaddleId(
  db: Database,
  paddleSubscriptionId: string,
): SubscriptionRow | null {
  return (
    db
      .query('SELECT * FROM subscriptions WHERE paddle_subscription_id = ?')
      .get(paddleSubscriptionId) as SubscriptionRow | undefined
  ) ?? null
}

/**
 * Whether a subscription currently grants paid access.
 * - `active` and `trialing` grant access.
 * - A scheduled cancel/pause does NOT revoke — only the actual status does.
 * - `past_due` grants within the dunning grace window; `canceled`/`paused` deny.
 */
export function isPaidUser(db: Database, userId: string): boolean {
  const sub = getSubscriptionByUserId(db, userId)
  if (!sub) return false
  if (sub.status === 'active' || sub.status === 'trialing') return true
  if (
    sub.status === 'past_due' &&
    sub.grace_period_end !== null &&
    sub.grace_period_end > Date.now()
  ) {
    return true
  }
  return false
}

export function upsertSubscription(
  db: Database,
  params: {
    userId: string
    paddleSubscriptionId: string
    paddleCustomerId?: string
    status: string
    plan?: string
    priceId?: string
    productId?: string
    scheduledChangeAction?: string | null
    scheduledChangeAt?: number | null
    currentPeriodEnd?: number | null
    gracePeriodEnd?: number | null
    lastEventId?: string
  },
): SubscriptionRow {
  const now = Date.now()
  db.query(
    `INSERT INTO subscriptions (user_id, paddle_subscription_id, paddle_customer_id, status, plan, price_id, product_id, scheduled_change_action, scheduled_change_at, current_period_end, grace_period_end, last_event_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       paddle_subscription_id = excluded.paddle_subscription_id,
       paddle_customer_id = excluded.paddle_customer_id,
       status = excluded.status,
       plan = excluded.plan,
       price_id = excluded.price_id,
       product_id = excluded.product_id,
       scheduled_change_action = excluded.scheduled_change_action,
       scheduled_change_at = excluded.scheduled_change_at,
       current_period_end = excluded.current_period_end,
       grace_period_end = COALESCE(excluded.grace_period_end, subscriptions.grace_period_end),
       last_event_id = excluded.last_event_id,
       updated_at = excluded.updated_at`,
  ).run(
    params.userId,
    params.paddleSubscriptionId,
    params.paddleCustomerId ?? null,
    params.status,
    params.plan ?? 'pro',
    params.priceId ?? null,
    params.productId ?? null,
    params.scheduledChangeAction ?? null,
    params.scheduledChangeAt ?? null,
    params.currentPeriodEnd ?? null,
    params.gracePeriodEnd ?? null,
    params.lastEventId ?? null,
    now,
    now,
  )
  return getSubscriptionByUserId(db, params.userId)!
}

// ---------------------------------------------------------------------------
// Customers (Paddle mirror)
// ---------------------------------------------------------------------------

export function upsertCustomer(
  db: Database,
  params: { customerId: string; email: string; userId?: string | null },
): CustomerRow {
  const now = Date.now()
  const existing = db
    .query('SELECT * FROM customers WHERE customer_id = ?')
    .get(params.customerId) as CustomerRow | undefined

  let userId = params.userId ?? existing?.user_id ?? null
  if (!userId) {
    const user = getUserByEmail(db, params.email)
    // Auto-provision a local account for checkouts that started on the public
    // pricing page (no CLI login happened first).
    userId = user?.id ?? createUser(db, { email: params.email, name: params.email.split('@')[0] ?? params.email }).id
  }

  db.query(
    `INSERT INTO customers (customer_id, user_id, email, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(customer_id) DO UPDATE SET
       user_id = COALESCE(excluded.user_id, customers.user_id),
       email = excluded.email,
       updated_at = excluded.updated_at`,
  ).run(params.customerId, userId, params.email, now, now)

  return db
    .query('SELECT * FROM customers WHERE customer_id = ?')
    .get(params.customerId) as CustomerRow
}

export function getCustomerByPaddleId(
  db: Database,
  customerId: string,
): CustomerRow | null {
  return (
    db
      .query('SELECT * FROM customers WHERE customer_id = ?')
      .get(customerId) as CustomerRow | undefined
  ) ?? null
}

export function isEventProcessed(
  db: Database,
  eventId: string,
): boolean {
  const row = db
    .query('SELECT 1 FROM subscriptions WHERE last_event_id = ? LIMIT 1')
    .get(eventId) as unknown
  return !!row
}
