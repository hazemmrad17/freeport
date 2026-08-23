import { Hono } from 'hono'

import type { ServerConfig } from './config'
import { getDb } from './db'
import type { UserRow } from './db'
import { attachUser } from './middleware/auth'
import { adminRoutes } from './routes/admin'
import { adRoutes } from './routes/ads'
import { authRoutes } from './routes/auth'
import { logRoutes } from './routes/logs'
import { paddleWebhookRoutes } from './routes/paddle-webhook'
import { pricingRoutes } from './routes/pricing'
import { sessionRoutes } from './routes/session'
import { subscriptionRoutes } from './routes/subscription'
import { usageRoutes } from './routes/usage'
import { waitlistRoutes } from './routes/waitlist'
import { welcomeRoutes } from './routes/welcome'

export type AppVariables = {
  config: ServerConfig
  db: ReturnType<typeof getDb>
  user: UserRow | null
}

export function createApp(config: ServerConfig): Hono<{ Variables: AppVariables }> {
  const db = getDb(config)

  const app = new Hono<{ Variables: AppVariables }>()

  // Attach config + db to every request context.
  app.use('*', async (c, next) => {
    c.set('config', config)
    c.set('db', db)
    c.set('user', null)
    await next()
  })

  // Resolve the caller (if any) for every request; protected routes opt in.
  app.use('*', attachUser)

  app.route('/', authRoutes)
  app.route('/', sessionRoutes)
  app.route('/', adRoutes)
  app.route('/', usageRoutes)
  app.route('/', logRoutes)
  app.route('/', adminRoutes)
  app.route('/', subscriptionRoutes)
  app.route('/', paddleWebhookRoutes)
  app.route('/', pricingRoutes)
  app.route('/', waitlistRoutes)
  app.route('/', welcomeRoutes)

  app.onError((err, c) => {
    console.error('[freeport-server] unhandled error', err)
    c.status(500)
    return c.json({ error: 'internal_error' })
  })

  app.notFound((c) => c.json({ error: 'not_found' }, 404))

  return app
}