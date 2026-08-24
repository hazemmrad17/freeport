import { Hono } from 'hono'

import type { AppBindings } from '../middleware/auth'
import { verifyWebhookEvent } from '../lib/paddle'
import {
  getSubscriptionByPaddleId,
  getUserById,
  isEventProcessed,
  upsertCustomer,
  upsertSubscription,
  upsertUserByEmail,
} from '../store'

interface PaddleEvent {
  eventType?: string
  eventId?: string
  occurredAt?: string
  data?: Record<string, unknown>
}

function str(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function ms(iso: unknown): number | null {
  if (typeof iso !== 'string') return null
  const t = new Date(iso).getTime()
  return Number.isFinite(t) ? t : null
}

/** Resolve the local user for an event: customData.userId → customers mirror → email. */
function resolveUserId(
  db: AppBindings['Variables']['db'],
  data: Record<string, unknown>,
  email: string | undefined,
): string | null {
  const customData = data.customData as Record<string, unknown> | undefined
  const viaCustom = str(customData?.userId)
  if (viaCustom && getUserById(db, viaCustom)) return viaCustom

  const customerId = str(data.customerId)
  if (customerId) {
    const row = db
      .query('SELECT user_id FROM customers WHERE customer_id = ?')
      .get(customerId) as { user_id: string | null } | undefined
    if (row?.user_id) return row.user_id
  }

  if (email) {
    // Auto-provision: pricing-page checkouts have no local user yet.
    const user = upsertUserByEmail(db, {
      email,
      name: email.split('@')[0] ?? email,
    })
    return user.id
  }
  return null
}

export const paddleWebhookRoutes = new Hono<AppBindings>()

paddleWebhookRoutes.post('/api/paddle/webhook', async (c) => {
  const config = c.get('config')
  const db = c.get('db')

  const signature = c.req.header('paddle-signature') ?? ''
  if (!signature) {
    c.status(400)
    return c.json({ error: 'missing_signature' })
  }

  // RAW body only — a parsed body fails HMAC verification.
  const rawBody = await c.req.text()
  let event: PaddleEvent | null
  try {
    event = (await verifyWebhookEvent(config, rawBody, signature)) as PaddleEvent | null
  } catch (err) {
    if ((err as Error & { code?: string }).code === 'VERIFIED_UNPARSEABLE') {
      // Signature valid but SDK entities choked — ACK so Paddle stops
      // retrying an undeliverable-to-us payload; logged loudly for review.
      console.error('[paddle] VERIFIED but unparseable delivery', { rawBody: rawBody.slice(0, 500), err })
      return c.json({ ok: true, skipped: 'unparseable' })
    }
    throw err
  }
  if (!event) {
    // Non-2xx so Paddle retries; never acknowledge an unverified delivery.
    c.status(401)
    return c.json({ error: 'invalid_signature' })
  }

  const { eventType, eventId } = event
  const data = event.data ?? {}
  if (!eventType || !eventId) {
    c.status(400)
    return c.json({ error: 'invalid_event' })
  }

  if (isEventProcessed(db, eventId)) {
    return c.json({ ok: true, skipped: 'duplicate' })
  }

  try {
    switch (eventType) {
      case 'customer.created':
      case 'customer.updated':
        handleCustomer(db, data)
        break

      case 'transaction.completed':
        await handleTransactionCompleted(config, db, data, eventId)
        break

      case 'subscription.created':
      case 'subscription.activated':
      case 'subscription.trialing':
      case 'subscription.updated':
      case 'subscription.resumed':
      case 'subscription.past_due':
      case 'subscription.paused':
      case 'subscription.canceled':
        handleSubscriptionEvent(config, db, eventType, data, eventId)
        break

      default:
        // Verified but unhandled event types are acknowledged and ignored.
        break
    }
  } catch (err) {
    console.error('[paddle] handler failed', { eventType, eventId, err })
    c.status(500)
    return c.json({ error: 'handler_failed' })
  }

  return c.json({ ok: true })
})

// ---------------------------------------------------------------------------

function handleCustomer(
  db: AppBindings['Variables']['db'],
  data: Record<string, unknown>,
): void {
  const customerId = str(data.id)
  const email = str(data.email)
  if (!customerId || !email) return
  upsertCustomer(db, { customerId, email })
}

async function handleTransactionCompleted(
  config: AppBindings['Variables']['config'],
  db: AppBindings['Variables']['db'],
  data: Record<string, unknown>,
  eventId: string,
): Promise<void> {
  const customerId = str(data.customerId)
  const subscriptionId = str(data.subscriptionId)
  const email = str((data.customer as Record<string, unknown> | undefined)?.email)

  if (customerId && email) upsertCustomer(db, { customerId, email })

  const userId = resolveUserId(db, data, email)
  if (!userId || !subscriptionId) {
    console.warn('[paddle] transaction.completed could not resolve user', { eventId })
    return
  }

  const items = (data.items as Array<Record<string, unknown>> | undefined) ?? []
  const first = items[0]
  const price = first?.price as Record<string, unknown> | undefined
  const product = first?.product as Record<string, unknown> | undefined

  upsertSubscription(db, {
    userId,
    paddleSubscriptionId: subscriptionId,
    paddleCustomerId: customerId,
    status: 'active',
    plan: 'pro',
    priceId: str(price?.id),
    productId: str(product?.id) ?? str(price?.productId),
    gracePeriodEnd: null,
    lastEventId: eventId,
  })
}

function handleSubscriptionEvent(
  config: AppBindings['Variables']['config'],
  db: AppBindings['Variables']['db'],
  eventType: string,
  data: Record<string, unknown>,
  eventId: string,
): void {
  const subscriptionId = str(data.id)
  if (!subscriptionId) return

  const status = str(data.status) ?? 'active'
  const customerId = str(data.customerId)
  const items = (data.items as Array<Record<string, unknown>> | undefined) ?? []
  const price = items[0]?.price as Record<string, unknown> | undefined
  const product = items[0]?.product as Record<string, unknown> | undefined
  const billingPeriod = data.currentBillingPeriod as Record<string, unknown> | undefined

  const scheduledChange = data.scheduledChange as Record<string, unknown> | undefined
  const scheduledAction = scheduledChange ? str(scheduledChange.action) : null
  const scheduledAt = scheduledChange ? ms(scheduledChange.effectiveAt) : null

  // Resolve the user: existing mirror row first (works even if email changed).
  let userId: string | null = null
  const existing = getSubscriptionByPaddleId(db, subscriptionId)
  if (existing) userId = existing.user_id
  if (!userId) {
    const customData = data.customData as Record<string, unknown> | undefined
    const viaCustom = str(customData?.userId)
    if (viaCustom && getUserById(db, viaCustom)) userId = viaCustom
  }
  if (!userId && customerId) {
    const row = db
      .query('SELECT user_id FROM customers WHERE customer_id = ?')
      .get(customerId) as { user_id: string | null } | undefined
    if (row?.user_id) userId = row.user_id
  }
  if (!userId) {
    console.warn('[paddle] subscription event without resolvable user', {
      eventType,
      eventId,
      subscriptionId,
    })
    return
  }

  const gracePeriodMs = config.subscriptionGracePeriodDays * 24 * 60 * 60 * 1000
  const isTerminalCancel = eventType === 'subscription.canceled'

  upsertSubscription(db, {
    userId,
    paddleSubscriptionId: subscriptionId,
    paddleCustomerId: customerId,
    status,
    plan: status === 'canceled' ? 'free' : 'pro',
    priceId: str(price?.id),
    productId: str(product?.id) ?? str(price?.productId),
    // A scheduled cancel/pause is NOT terminal — store it, keep granting access.
    scheduledChangeAction: isTerminalCancel ? null : scheduledAction,
    scheduledChangeAt: isTerminalCancel ? null : scheduledAt,
    currentPeriodEnd: ms(billingPeriod?.endsAt),
    gracePeriodEnd:
      status === 'past_due' ? Date.now() + gracePeriodMs : null,
    lastEventId: eventId,
  })
}
