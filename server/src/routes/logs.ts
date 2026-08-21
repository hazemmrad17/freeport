import { Hono } from 'hono'

import type { AppBindings } from '../middleware/auth'
import { attachUser } from '../middleware/auth'
import { insertLogRecord } from '../store'

const MAX_RECORDS = 500
const MAX_RECORD_JSON_BYTES = 64_000
const MAX_BODY_BYTES = 1_000_000

export const logRoutes = new Hono<AppBindings>()

logRoutes.post('/api/logs', attachUser, async (c) => {
  const config = c.get('config')
  const db = c.get('db')
  const user = c.get('user')

  if (!config.logShippingEnabled) {
    return c.json({ received: false, reason: 'log_shipping_disabled' })
  }

  const contentLength = Number(c.req.header('content-length') ?? 0)
  if (contentLength > MAX_BODY_BYTES) {
    c.status(413)
    return c.json({ error: 'payload_too_large' })
  }

  const body = (await c.req.json().catch(() => null)) as {
    records?: Array<Record<string, unknown>>
  } | null
  const records = Array.isArray(body?.records) ? body.records : []
  if (records.length === 0 || records.length > MAX_RECORDS) {
    return c.json({ received: false })
  }

  for (const record of records) {
    let serialized: string
    try {
      serialized = JSON.stringify(record)
    } catch {
      continue
    }
    if (serialized.length > MAX_RECORD_JSON_BYTES) {
      serialized = serialized.slice(0, MAX_RECORD_JSON_BYTES)
    }
    insertLogRecord(db, { user_id: user?.id ?? null, body: serialized })
  }

  return c.json({ received: true })
})