import { createApp } from './app'
import { loadConfig } from './config'

const config = loadConfig()
const app = createApp(config)

const server = Bun.serve({
  port: config.port,
  hostname: '0.0.0.0',
  fetch: app.fetch,
})

console.log(`[freeport-server] listening on http://${server.hostname}:${server.port}`)
console.log(`[freeport-server] db: ${config.dbPath}`)
console.log(`[freeport-server] free sessions/day: ${config.freeSessionsPerDay}`)
console.log(`[freeport-server] admin: ${config.appUrl}/admin?token=${config.adminToken}`)