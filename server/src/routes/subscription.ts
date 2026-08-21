import { Hono } from 'hono'

import type { AppBindings } from '../middleware/auth'
import { requireUser } from '../middleware/auth'
import { createCheckoutUrl } from '../lib/paddle'
import { getSubscriptionByUserId, isPaidUser } from '../store'

export const subscriptionRoutes = new Hono<AppBindings>()

/**
 * GET /api/v1/subscription
 * Returns the user's subscription status in the shape the CLI expects.
 */
subscriptionRoutes.get('/api/v1/subscription', requireUser, (c) => {
  const config = c.get('config')
  const db = c.get('db')
  const user = c.get('user')!

  const sub = getSubscriptionByUserId(db, user.id)
  const paid = isPaidUser(db, user.id)

  if (!paid) {
    return c.json({
      hasSubscription: false,
      fallbackToALaCarte: false,
    })
  }

  const sessionsPerDay = config.paidSessionsPerDay
  const nowMs = Date.now()
  const blockLimit = sessionsPerDay
  // Approximate usage: use free-tier counter for now (same period)
  // Real implementation would track paid sessions separately
  const blockUsed = 0

  return c.json({
    hasSubscription: true,
    displayName: sub?.plan === 'pro' ? 'Pro' : 'Paid',
    subscription: {
      id: sub?.paddle_subscription_id ?? '',
      status: sub?.status ?? 'active',
      billingPeriodEnd: sub?.current_period_end
        ? new Date(sub.current_period_end).toISOString()
        : new Date(nowMs + 30 * 24 * 60 * 60 * 1000).toISOString(),
      cancelAtPeriodEnd: sub?.status === 'canceled',
      canceledAt: sub?.status === 'canceled' ? new Date(sub.updated_at).toISOString() : null,
      tier: 2,
      scheduledTier: null,
    },
    rateLimit: {
      limited: false,
      reason: undefined,
      canStartNewBlock: true,
      blockUsed,
      blockLimit,
      blockResetsAt: new Date(nowMs + 24 * 60 * 60 * 1000).toISOString(),
      weeklyUsed: 0,
      weeklyLimit: blockLimit * 7,
      weeklyResetsAt: new Date(nowMs + 7 * 24 * 60 * 60 * 1000).toISOString(),
      weeklyPercentUsed: 0,
    },
    limits: {
      creditsPerBlock: blockLimit,
      blockDurationHours: 24,
      weeklyCreditsLimit: blockLimit * 7,
    },
    fallbackToALaCarte: false,
  })
})

/**
 * POST /api/v1/subscription/checkout
 * Creates a Paddle checkout session and returns the URL.
 */
subscriptionRoutes.post('/api/v1/subscription/checkout', requireUser, async (c) => {
  const config = c.get('config')
  const user = c.get('user')!

  if (!config.paddleApiKey) {
    c.status(503)
    return c.json({ error: 'paddle_not_configured' })
  }

  const checkoutUrl = await createCheckoutUrl(config, {
    userId: user.id,
    email: user.email,
    productName: 'pro',
    priceUsd: 9.99,
  })

  if (!checkoutUrl) {
    c.status(500)
    return c.json({ error: 'checkout_creation_failed' })
  }

  return c.json({ checkoutUrl })
})
