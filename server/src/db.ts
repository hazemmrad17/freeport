import { mkdirSync } from 'node:fs'
import path from 'node:path'

import { Database } from 'bun:sqlite'

import type { ServerConfig } from './config'

export type AuthProvider = 'github' | 'google' | 'email'
export type TrustTier = 'low' | 'standard' | 'trusted'

export interface UserRow {
  id: string
  auth_provider: AuthProvider
  provider_user_id: string | null
  email: string
  name: string
  username: string | null
  avatar_url: string | null
  provider_account_created_at: number | null
  trust_tier: TrustTier
  signup_ip: string | null
  fingerprint_id: string | null
  created_at: number
}

export interface SignupIpLogRow {
  id: number
  ip: string
  created_at: number
}

export interface ApiTokenRow {
  token_hash: string
  user_id: string
  created_at: number
  last_used_at: number | null
  revoked: number
}

export interface LoginAttemptRow {
  id: string
  fingerprint_id: string
  fingerprint_hash: string
  device_code: string
status: 'pending' | 'approved' | 'expired'
      user_id: string | null
      /** Raw handoff token minted at approval; consumed by the CLI on poll.
       *  Transient (row expires) so storing the raw value is acceptable. */
      token_secret: string | null
      expires_at: number
      created_at: number
}

export interface SessionRow {
  instance_id: string
  user_id: string
  model: string
  admitted_at: number
  expires_at: number
  ended_at: number | null
}

export interface SessionUsageRow {
  id: number
  user_id: string
  period_start: number
  units: number
}

export interface UsageEventRow {
  id: number
  user_id: string
  session_instance_id: string | null
  model: string | null
  input_tokens: number
  output_tokens: number
  cached_input_tokens: number
  cost_usd: number
  created_at: number
}

export interface AdEventRow {
  id: number
  user_id: string | null
  kind: 'served' | 'impression' | 'click'
  ad_title: string
  imp_url: string
  created_at: number
}

export interface LogRecordRow {
  id: number
  user_id: string | null
  body: string
  created_at: number
}

export interface SubscriptionRow {
  user_id: string
  paddle_subscription_id: string | null
  paddle_customer_id: string | null
  status: string
  plan: string
  price_id: string | null
  product_id: string | null
  scheduled_change_action: string | null
  scheduled_change_at: number | null
  current_period_end: number | null
  grace_period_end: number | null
  last_event_id: string | null
  created_at: number
  updated_at: number
}

export interface CustomerRow {
  customer_id: string
  user_id: string | null
  email: string
  created_at: number
  updated_at: number
}

export interface WaitlistRow {
  id: number
  email: string
  source: string
  created_at: number
}

let db: Database | null = null

/** Open (once) and migrate the SQLite database. Not thread-safe by design —
 *  Bun runs the server on one thread. */
export function getDb(config: ServerConfig): Database {
  if (db) return db

  if (config.dbPath !== ':memory:' && path.dirname(config.dbPath) !== '.') {
    try {
      mkdirSync(path.dirname(config.dbPath), { recursive: true })
    } catch {
      // ignore EEXIST
    }
  }
  const database = new Database(config.dbPath, { create: true })
  database.exec('PRAGMA journal_mode = WAL;')
  database.exec('PRAGMA foreign_keys = ON;')
  migrate(database)
  db = database
  return database
}

export function migrate(database: Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      fingerprint_id TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS api_tokens (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      created_at INTEGER NOT NULL,
      last_used_at INTEGER,
      revoked INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_api_tokens_user ON api_tokens(user_id);

    CREATE TABLE IF NOT EXISTS login_attempts (
      id TEXT PRIMARY KEY,
      fingerprint_id TEXT NOT NULL,
      fingerprint_hash TEXT NOT NULL,
      device_code TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'pending',
      user_id TEXT REFERENCES users(id),
      token_secret TEXT,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_login_attempts_fingerprint ON login_attempts(fingerprint_id);
    CREATE INDEX IF NOT EXISTS idx_login_attempts_device ON login_attempts(device_code);

    CREATE TABLE IF NOT EXISTS sessions (
      instance_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      model TEXT NOT NULL,
      admitted_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      ended_at INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

    CREATE TABLE IF NOT EXISTS session_usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL REFERENCES users(id),
      period_start INTEGER NOT NULL,
      units INTEGER NOT NULL DEFAULT 0,
      UNIQUE (user_id, period_start)
    );

    CREATE TABLE IF NOT EXISTS usage_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL REFERENCES users(id),
      session_instance_id TEXT,
      model TEXT,
      input_tokens INTEGER NOT NULL DEFAULT 0,
      output_tokens INTEGER NOT NULL DEFAULT 0,
      cached_input_tokens INTEGER NOT NULL DEFAULT 0,
      cost_usd REAL NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_usage_events_user_period ON usage_events(user_id, created_at);

    CREATE TABLE IF NOT EXISTS ad_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      kind TEXT NOT NULL CHECK (kind IN ('served','impression','click')),
      ad_title TEXT NOT NULL,
      imp_url TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_ad_events_user_period ON ad_events(user_id, created_at);

    CREATE TABLE IF NOT EXISTS log_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      body TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      user_id TEXT PRIMARY KEY REFERENCES users(id),
      paddle_subscription_id TEXT UNIQUE,
      paddle_customer_id TEXT,
      status TEXT NOT NULL DEFAULT 'inactive',
      plan TEXT NOT NULL DEFAULT 'free',
      price_id TEXT,
      product_id TEXT,
      scheduled_change_action TEXT,
      scheduled_change_at INTEGER,
      current_period_end INTEGER,
      grace_period_end INTEGER,
      last_event_id TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );

    CREATE TABLE IF NOT EXISTS customers (
      customer_id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id),
      email TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );

    CREATE TABLE IF NOT EXISTS waitlist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      source TEXT NOT NULL DEFAULT 'web',
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );
    CREATE INDEX IF NOT EXISTS idx_waitlist_email ON waitlist(email);

    CREATE TABLE IF NOT EXISTS signup_ip_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ip TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_signup_ip_log_ip_time ON signup_ip_log(ip, created_at);
  `)

  ensureColumn(database, 'users', 'auth_provider', "auth_provider TEXT NOT NULL DEFAULT 'email'")
  ensureColumn(database, 'users', 'provider_user_id', 'provider_user_id TEXT')
  ensureColumn(database, 'users', 'username', 'username TEXT')
  ensureColumn(database, 'users', 'avatar_url', 'avatar_url TEXT')
  ensureColumn(database, 'users', 'provider_account_created_at', 'provider_account_created_at INTEGER')
  ensureColumn(database, 'users', 'trust_tier', "trust_tier TEXT NOT NULL DEFAULT 'standard'")
  ensureColumn(database, 'users', 'signup_ip', 'signup_ip TEXT')

  ensureColumn(database, 'subscriptions', 'price_id', 'price_id TEXT')
  ensureColumn(database, 'subscriptions', 'product_id', 'product_id TEXT')
  ensureColumn(
    database,
    'subscriptions',
    'scheduled_change_action',
    'scheduled_change_action TEXT',
  )
  ensureColumn(
    database,
    'subscriptions',
    'scheduled_change_at',
    'scheduled_change_at INTEGER',
  )
}

function ensureColumn(
  database: Database,
  table: string,
  column: string,
  ddl: string,
): void {
  const cols = database.query(`PRAGMA table_info(${table})`).all() as Array<{
    name: string
  }>
  if (!cols.some((c) => c.name === column)) {
    database.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`)
  }
}