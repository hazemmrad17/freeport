import { Hono } from 'hono'

import type { AppBindings } from '../middleware/auth'
import { getWaitlistCount, joinWaitlist } from '../store'

export const waitlistRoutes = new Hono<AppBindings>()

waitlistRoutes.post('/api/waitlist', async (c) => {
  const db = c.get('db')
  const contentType = c.req.header('content-type') ?? ''
  let email = ''
  let source = 'web'

  try {
    if (contentType.includes('application/json')) {
      const body = await c.req.json().catch(() => ({}))
      email = String(body?.email ?? '').trim()
      source = String(body?.source ?? 'web').trim()
    } else {
      const body = await c.req.parseBody().catch(() => ({}))
      email = String(body?.email ?? '').trim()
      source = String(body?.source ?? 'web').trim()
    }
  } catch {
    return c.json({ error: 'invalid_request', message: 'Could not parse request body' }, 400)
  }

  if (!email || !email.includes('@') || !email.includes('.')) {
    return c.json({ error: 'invalid_email', message: 'Please enter a valid email address' }, 400)
  }

  const result = joinWaitlist(db, email, source)
  const totalCount = getWaitlistCount(db)

  return c.json({
    success: true,
    email: result.email,
    position: result.position,
    totalCount,
    alreadyJoined: result.alreadyJoined,
    message: result.alreadyJoined
      ? `You're already on the waitlist at position #${result.position}!`
      : `Welcome to the early access waitlist! You are #${result.position} in queue.`,
  })
})

waitlistRoutes.get('/api/waitlist/count', (c) => {
  const db = c.get('db')
  const count = getWaitlistCount(db)
  return c.json({ count })
})
