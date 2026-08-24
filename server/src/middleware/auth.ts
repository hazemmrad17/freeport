import type { Database } from 'bun:sqlite'
import type { Context, Next } from 'hono'

import type { ServerConfig } from '../config'
import type { UserRow } from '../db'
import { findUserByToken } from '../store'

export interface AppBindings {
  Variables: {
    config: ServerConfig
    db: Database
    user: UserRow | null
  }
}

/** Extract the bearer token from a request. */
export function bearerToken(c: Context<AppBindings>): string | undefined {
  const header = c.req.header('authorization')
  if (!header) return undefined
  const match = /^Bearer\s+(.+)$/i.exec(header)
  return match?.[1] ?? undefined
}

/**
 * Resolve the caller from the bearer token and attach it as `user`.
 * Does NOT reject when missing — routes decide (the session endpoints require
 * auth; the login endpoints are public).
 */
export async function attachUser(c: Context<AppBindings>, next: Next): Promise<void> {
  const db = c.get('db')
  const token = bearerToken(c)
  c.set('user', token ? findUserByToken(db, token) : null)
  await next()
}

/** Require an authenticated user; responds 401 when missing/invalid. */
export async function requireUser(
  c: Context<AppBindings>,
  next: Next,
): Promise<Response | void> {
  const user = c.get('user')
  if (!user) {
    c.status(401)
    return c.json({ error: 'unauthorized', message: 'Missing or invalid auth token' })
  }
  return next()
}