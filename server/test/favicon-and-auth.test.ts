import { describe, expect, test } from 'bun:test'
import { createApp } from '../src/app'
import { loadConfig } from '../src/config'

describe('Favicon and OAuth Waitlist Verification', () => {
  const config = loadConfig()
  const app = createApp(config)

  test('serves favicon.ico with correct headers and bytes', async () => {
    const resp = await app.request('/favicon.ico')
    expect(resp.status).toBe(200)
    expect(resp.headers.get('content-type')).toBe('image/x-icon')
    const buffer = await resp.arrayBuffer()
    expect(buffer.byteLength).toBe(4286)
  })

  test('serves favicon.png with correct headers', async () => {
    const resp = await app.request('/favicon.png')
    expect(resp.status).toBe(200)
    expect(resp.headers.get('content-type')).toBe('image/png')
    const buffer = await resp.arrayBuffer()
    expect(buffer.byteLength).toBe(62047)
  })

  test('landing page contains favicon and GitHub/Google only waitlist', async () => {
    const resp = await app.request('/')
    expect(resp.status).toBe(200)
    const html = await resp.text()

    // Favicon checks
    expect(html).toContain('href="/favicon.ico"')
    expect(html).toContain('href="/favicon.png"')

    // OAuth waitlist fast-track checks
    expect(html).toContain('/api/auth/github/start')
    expect(html).toContain('/api/auth/google/start')
    expect(html).toContain('Join Waitlist with')

    // Email-only form removed
    expect(html).not.toContain('id="waitlist-email"')
    expect(html).not.toContain('or enter email directly')
  })

  test('login page contains favicon and GitHub/Google only authentication', async () => {
    const resp = await app.request('/login?device=TESTCODE')
    expect(resp.status).toBe(200)
    const html = await resp.text()

    // Favicon checks
    expect(html).toContain('href="/favicon.ico"')

    // OAuth checks
    expect(html).toContain('/api/auth/github/start?device=TESTCODE')
    expect(html).toContain('/api/auth/google/start?device=TESTCODE')

    // Email-and-name input form removed from login UI
    expect(html).not.toContain('name="email"')
    expect(html).not.toContain('name="name"')
    expect(html).not.toContain('or sign in with email')
  })

  test('pricing and welcome pages contain favicon', async () => {
    const pricingResp = await app.request('/pricing')
    const pricingHtml = await pricingResp.text()
    expect(pricingHtml).toContain('href="/favicon.ico"')

    const welcomeResp = await app.request('/welcome')
    const welcomeHtml = await welcomeResp.text()
    expect(welcomeHtml).toContain('href="/favicon.ico"')
  })
})
