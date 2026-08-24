import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Hono } from 'hono'

import type { AppBindings } from '../middleware/auth'

export const assetRoutes = new Hono<AppBindings>()

// Locate favicon.ico & favicon.png
const possibleFaviconPaths = [
  join(process.cwd(), 'public', 'favicon.ico'),
  join(__dirname, '..', '..', 'public', 'favicon.ico'),
  join(__dirname, '..', '..', '..', 'Branding', 'Logo', 'Iconmark', 'Iconmark.ico'),
]

let faviconIcoBuffer: Buffer | null = null
for (const p of possibleFaviconPaths) {
  if (existsSync(p)) {
    try {
      faviconIcoBuffer = readFileSync(p)
      break
    } catch {
      // ignore
    }
  }
}

const possiblePngPaths = [
  join(process.cwd(), 'public', 'favicon.png'),
  join(__dirname, '..', '..', 'public', 'favicon.png'),
  join(__dirname, '..', '..', '..', 'Branding', 'Logo', 'Iconmark', 'Iconmark.png'),
]

let faviconPngBuffer: Buffer | null = null
for (const p of possiblePngPaths) {
  if (existsSync(p)) {
    try {
      faviconPngBuffer = readFileSync(p)
      break
    } catch {
      // ignore
    }
  }
}

assetRoutes.get('/favicon.ico', (c) => {
  if (faviconIcoBuffer) {
    return new Response(faviconIcoBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/x-icon',
        'Cache-Control': 'public, max-age=86400',
      },
    })
  }
  return c.text('Not found', 404)
})

assetRoutes.get('/favicon.png', (c) => {
  if (faviconPngBuffer) {
    return new Response(faviconPngBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400',
      },
    })
  }
  return c.text('Not found', 404)
})

assetRoutes.get('/apple-touch-icon.png', (c) => {
  if (faviconPngBuffer) {
    return new Response(faviconPngBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400',
      },
    })
  }
  return c.text('Not found', 404)
})
