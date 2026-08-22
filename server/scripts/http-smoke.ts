import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { createApp } from '../src/app'
import { loadConfig } from '../src/config'

const tmp = mkdtempSync(path.join(tmpdir(), 'freeport-http-'))
const config = loadConfig({
  dbPath: path.join(tmp, 'http.db'),
  appUrl: 'http://localhost:8798',
  port: 8798,
  adminToken: 'admin-test',
})
const app = createApp(config)

const server = Bun.serve({ port: 8798, fetch: app.fetch })
console.log('serving on 8798')

const base = 'http://localhost:8798'

const code = await fetch(`${base}/api/auth/cli/code`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ fingerprintId: 'enhanced-http-test' }),
}).then((r) => r.json())
console.log('code:', code.loginUrl)

const device = new URL(code.loginUrl).searchParams.get('device')
await fetch(`${base}/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ device, email: 'http@example.com', name: 'HTTP' }),
})

const status = await fetch(
  `${base}/api/auth/cli/status?fingerprintId=${encodeURIComponent('enhanced-http-test')}`,
).then((r) => r.json())
const token = status.user.authToken
console.log('user:', status.user.email)

const admit = await fetch(`${base}/api/v1/FREEPORT/session`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'x-FREEPORT-model': 'deepseek/deepseek-v4-flash' },
}).then((r) => r.json())
console.log('session:', admit.status, admit.instanceId?.slice(0, 8))

const ad = await fetch(`${base}/api/v1/ads`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ surface: 'cli_chat' }),
}).then((r) => r.json())
console.log('ad:', ad.ads[0].title, '| impUrl:', ad.ads[0].impUrl.slice(0, 60))

const usage = await fetch(`${base}/api/v1/usage/report`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ inputTokens: 150_000, outputTokens: 8_000 }),
}).then((r) => r.json())
console.log('usage cost:', usage.costUsd)

const stats = await fetch(`${base}/api/v1/admin/stats`, {
  headers: { Authorization: 'Bearer admin-test' },
}).then((r) => r.json())
console.log('admin totals:', JSON.stringify(stats.totals))

server.stop()
console.log('OK — server served all endpoints over HTTP')