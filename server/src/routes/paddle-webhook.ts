import { Hono } from 'hono'

import type { AppBindings } from '../middleware/auth'
import { verifyWebhookEvent } from '../lib/paddle'
import {
  getSubscriptionByUserId,
  getUserById,
  isEventProcessed,
  upsertSubscription,
} from '../store'

export const paddleWebhookRoutes = new Hono<AppBindings>()

/**
 * POST /api/paddle/webhook
 * Handles Paddle webhook events. Idempotent: checks last_event_id before processing.
 *
 * Important: The raw body must be preserved for HMAC verification.
 * Hono's c.req.text() returns the raw string, which is what we need.
 */
paddleWebhookRoutes.post('/api/paddle/webhook', async (c) => {
  const config = c.get('config')
  const db = c.get('db')

  const signature = c.req.header('paddle-signature') ?? ''
  if (!signature) {
    c.status(400)
    return c.json({ error: 'missing_signature' })
  }

  const rawBody = await c.req.text()
  const event = await verifyWebhookEvent(config, rawBody, signature)
  if (!event) {
    c.status(401)
    return c.json({ error: 'invalid_signature' })
  }

  const eventType = event.eventType as string | undefined
  const eventId = event.eventId as string | undefined
  if (!eventType || !eventId) {
    c.status(400)
    return c.json({ error: 'invalid_event' })
  }

  // Idempotency: skip if this event was already processed
  if (isEventProcessed(db, eventId)) {
    return c.json({ ok: true, skipped: 'duplicate' })
  }

  // Extract subscription data from the event
  const data = event.data as Record<string, unknown> | undefined
  if (!data) {
    return c.json({ ok: true, skipped: 'no_data' })
  }

  // For transaction.completed, the subscription is nested
  const subscription = (data.subscription as Record<string, unknown>) ?? data
  const paddleSubId = subscription.id as string | undefined
  const customerId = (subscription.customerId as string) ?? (data.customerId as string) ?? undefined
  const status = (subscription.status as string) ?? undefined
  const currentPeriodEnd = subscription.currentPeriodEnd as string | undefined

  // Find the user by paddle_subscription_id or customer email
  let userId: string | null = null

  if (paddleSubId) {
    const existing = getSubscriptionByUserId(db, paddleSubId.split('_')[1] ?? '')
    if (existing) {
      userId = existing.user_id
    }
  }

  // If not found by subscription ID, try to find by customer email
  if (!userId && data.email) {
    const user = db
      .query('SELECT id FROM users WHERE email = ?')
      .get(data.email as string) as { id: string } | undefined
    if (user) userId = user.id
  }

  if (!userId) {
    console.warn('[paddle] Could not find user for event', { eventType, eventId })
    return c.json({ ok: true, skipped: 'user_not_found' })
  }

  // Handle different event types
  const now = Date.now()
  const gracePeriodMs = config.subscriptionGracePeriodDays * 24 * 60 * 60 * 1000

  switch (eventType) {
    case 'transaction.completed': {
      // Payment successful — activate subscription
      upsertSubscription(db, {
        userId,
        paddleSubscriptionId: paddleSubId ?? '',
        paddleCustomerId: customerId,
        status: 'active',
        plan: 'pro',
        currentPeriodEnd: currentPeriodEnd
          ? new Date(currentPeriodEnd).getTime()
          : undefined,
        gracePeriodEnd: null,
        lastEventId: eventId,
      })
      break
    }

    case 'subscription.created':
    case 'subscription.activated': {
      upsertSubscription(db, {
        userId,
        paddleSubscriptionId: paddleSubId ?? '',
        paddleCustomerId: customerId,
        status: 'active',
        plan: 'pro',
        currentPeriodEnd: currentPeriodEnd
          ? new Date(currentPeriodEnd).getTime()
          : undefined,
        gracePeriodEnd: null,
        lastEventId: eventId,
      })
      break
    }

    case 'subscription.updated': {
      // Renewal, upgrade, downgrade, pause, resume
      upsertSubscription(db, {
        userId,
        paddleSubscriptionId: paddleSubId ?? '',
        paddleCustomerId: customerId,
        status: status ?? 'active',
        plan: 'pro',
        currentPeriodEnd: currentPeriodEnd
          ? new Date(currentPeriodEnd).getTime()
          : undefined,
        gracePeriodEnd: null,
        lastEventId: eventId,
      })
      break
    }

    case 'subscription.past_due': {
      // Payment failed — enter grace period
      const sub = getSubscriptionByUserId(db, userId)
      const graceEnd = sub?.grace_period_end ?? now + gracePeriodMs
      upsertSubscription(db, {
        userId,
        paddleSubscriptionId: paddleSubId ?? '',
        paddleCustomerId: customerId,
        status: 'past_due',
        plan: 'pro',
        currentPeriodEnd: currentPeriodEnd
          ? new Date(currentPeriodEnd).getTime()
          : undefined,
        gracePeriodEnd: graceEnd,
        lastEventId: eventId,
      })
      break
    }

    case 'subscription.canceled': {
      upsertSubscription(db, {
        userId,
        paddleSubscriptionId: paddleSubId ?? '',
        paddleCustomerId: customerId,
        status: 'canceled',
        plan: 'free',
        currentPeriodEnd: currentPeriodEnd
          ? new Date(currentPeriodEnd).getTime()
          : undefined,
        gracePeriodEnd: null,
        lastEventId: eventId,
      })
      break
    }

    case 'subscription.paused': {
      upsertSubscription(db, {
        userId,
        paddleSubscriptionId: paddleSubId ?? '',
        paddleCustomerId: customerId,
        status: 'paused',
        plan: 'pro',
        currentPeriodEnd: currentPeriodEnd
          ? new Date(currentPeriodEnd).getTime()
          : undefined,
        gracePeriodEnd: null,
        lastEventId: eventId,
      })
      break
    }

    default: {
      // Unhandled event type — log but don't fail
      console.info('[paddle] Unhandled event type', { eventType, eventId })
    }
  }

  return c.json({ ok: true })
})
