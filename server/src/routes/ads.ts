import { Hono } from 'hono'

import type { ServerConfig } from '../config'
import type { AppBindings } from '../middleware/auth'
import { requireUser } from '../middleware/auth'
import { insertAdEvent, isPaidUser } from '../store'

const PROVIDER = 'freeport'

function pickAd(config: ServerConfig): {
  entry: ServerConfig['adInventory'][number]
  impUrl: string
  clickUrl: string
} {
  const inventory = config.adInventory
  const weights = inventory.map((ad) => ad.weight ?? 1)
  const total = weights.reduce((sum, w) => sum + w, 0)
  let roll = Math.random() * total
  let index = 0
  for (let i = 0; i < inventory.length; i++) {
    roll -= weights[i]!
    if (roll <= 0) {
      index = i
      break
    }
  }
  const entry = inventory[index]!
  const imp = encodeURIComponent(Buffer.from(`${entry.title}`).toString('base64url'))
  return {
    entry,
    impUrl: `${config.appUrl}/api/v1/ads/impression?imp=${imp}`,
    clickUrl: `${config.appUrl}/api/v1/ads/click?imp=${imp}`,
  }
}

export const adRoutes = new Hono<AppBindings>()

adRoutes.post('/api/v1/ads', requireUser, (c) => {
  const config = c.get('config')
  const db = c.get('db')
  const user = c.get('user')!

  // Paid users don't see ads (unless config explicitly enables them)
  const paid = isPaidUser(db, user.id)
  if (paid && !config.paidAdsEnabled) {
    return c.json({ ads: [], provider: PROVIDER })
  }

  // Body is unused by the v1 sponsor inventory (no auction targeting yet).
  void c.req.json().catch(() => null)

  const { entry, impUrl, clickUrl } = pickAd(config)
  insertAdEvent(db, {
    user_id: user.id,
    kind: 'served',
    ad_title: entry.title,
    imp_url: impUrl,
  })

  return c.json({
    ads: [
      {
        adText: entry.adText,
        title: entry.title,
        cta: entry.cta,
        url: entry.url,
        favicon: entry.favicon,
        clickUrl,
        impUrl,
        provider: PROVIDER,
      },
    ],
    provider: PROVIDER,
  })
})

adRoutes.post('/api/v1/ads/impression', requireUser, async (c) => {
  const db = c.get('db')
  const user = c.get('user')!
  const body = (await c.req.json().catch(() => ({}))) as {
    impUrl?: string
    imp?: string
  }
  const impUrl = body.impUrl ?? ''
  const imp = body.imp ?? new URL(impUrl, 'http://localhost').searchParams.get('imp') ?? ''
  const title = imp ? safeDecode(imp) : '(unknown)'
  insertAdEvent(db, { user_id: user.id, kind: 'impression', ad_title: title, imp_url: impUrl })
  // Free mode: no credits granted.
  return c.json({ creditsGranted: 0 })
})

adRoutes.post('/api/v1/ads/click', requireUser, async (c) => {
  const db = c.get('db')
  const user = c.get('user')!
  const body = (await c.req.json().catch(() => ({}))) as { impUrl?: string; imp?: string }
  const impUrl = body.impUrl ?? ''
  const imp = body.imp ?? new URL(impUrl, 'http://localhost').searchParams.get('imp') ?? ''
  const title = imp ? safeDecode(imp) : '(unknown)'
  insertAdEvent(db, { user_id: user.id, kind: 'click', ad_title: title, imp_url: impUrl })
  return c.json({ success: true })
})

function safeDecode(encoded: string): string {
  try {
    return Buffer.from(encoded, 'base64url').toString('utf8')
  } catch {
    return '(unknown)'
  }
}