import path from 'node:path'

export interface ServerConfig {
  /** Public origin of this server (used to build the login URL shown by the CLI). */
  appUrl: string
  port: number
  dbPath: string
  /** Free sessions a user may start per reset period. */
  freeSessionsPerDay: number
  /** Length of an admitted session. */
  sessionDurationMs: number
  /** Grace window after expiry where the row still exists (server-side). */
  sessionGraceMs: number
  /**
   * Reset period. `period` is emitted on the wire as 'pacific_day'.
   * `resetTimeZone` is the display string; `resetOffsetHoursUtc` is the
   * numeric offset used to compute period boundaries. Kept as a fixed offset
   * for v1 (DST-safe computation is handled by the pac-time helper).
   */
  resetTimeZone: string
  resetOffsetHoursUtc: number
  /** Bearer token required for /admin and /api/v1/admin/stats. */
  adminToken: string
  /** Sponsor inventory: list of AdResponse-shaped ads. */
  adInventory: AdInventoryEntry[]
  /** Model pricing for cost calculation ($ per 1M tokens). */
  pricing: { inputUsdPerMToken: number; outputUsdPerMToken: number }
  /** Assumed revenue per ad impression, for the admin economics view.
   *  Replace with real advertiser rates (Phase 4) as soon as possible. */
  adRevenuePerImpressionUsd: number
  logShippingEnabled: boolean
  logLevel: 'debug' | 'info' | 'warn' | 'error'
  /** Paddle API key (sandbox or production). */
  paddleApiKey: string
  /** Paddle webhook HMAC secret for signature verification. */
  paddleWebhookSecret: string
  /** Paddle environment: sandbox or production. */
  paddleEnv: 'sandbox' | 'production'
  /** Paddle client-side token (live_ prefix for production). */
  paddleClientToken: string
  /** Sessions per day for paid users (soft abuse cap). */
  paidSessionsPerDay: number
  /** Whether paid users see ads (default: false). */
  paidAdsEnabled: boolean
  /** Grace period in days after past_due before downgrade. */
  subscriptionGracePeriodDays: number
}

export interface AdInventoryEntry {
  adText: string
  title: string
  cta: string
  url: string
  favicon: string
  /** Optional per-ad override of the rotation weight. */
  weight?: number
}

function envNumber(
  name: string,
  fallback: number,
  opts: { min?: number; max?: number } = {},
): number {
  const raw = process.env[name]
  if (raw === undefined || raw === '') return fallback
  const value = Number(raw)
  if (!Number.isFinite(value)) return fallback
  if (opts.min !== undefined && value < opts.min) return fallback
  if (opts.max !== undefined && value > opts.max) return fallback
  return value
}

const DEFAULT_AD_INVENTORY: AdInventoryEntry[] = [
  {
    adText: 'Sponsored',
    title: 'DeepInfra — run open models at cost',
    cta: 'Try DeepInfra',
    url: 'https://deepinfra.com',
    favicon: 'https://deepinfra.com/favicon.ico',
    weight: 3,
  },
  {
    adText: 'Sponsored',
    title: 'Keep this tool free — sponsor a slot',
    cta: 'Sponsor',
    url: 'mailto:sponsors@freeport.dev',
    favicon: '',
    weight: 1,
  },
]

function parseAdInventory(): AdInventoryEntry[] {
  const raw = process.env.FREEPORT_AD_INVENTORY
  if (!raw) return DEFAULT_AD_INVENTORY
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return DEFAULT_AD_INVENTORY
    const entries = parsed.filter(
      (entry): entry is AdInventoryEntry =>
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as AdInventoryEntry).title === 'string' &&
        typeof (entry as AdInventoryEntry).adText === 'string',
    )
    return entries.length > 0 ? entries : DEFAULT_AD_INVENTORY
  } catch {
    return DEFAULT_AD_INVENTORY
  }
}

export function loadConfig(overrides: Partial<ServerConfig> = {}): ServerConfig {
  const config: ServerConfig = {
    appUrl:
      process.env.FREEPORT_APP_URL ??
      process.env.NEXT_PUBLIC_CODEBUFF_APP_URL ??
      `http://localhost:${process.env.FREEPORT_PORT ?? '8787'}`,
    port: envNumber('FREEPORT_PORT', 8787, { min: 1, max: 65_535 }),
    dbPath: path.resolve(
      process.env.FREEPORT_DB_PATH ??
        path.join(import.meta.dirname, '..', 'data', 'freeport.db'),
    ),
    freeSessionsPerDay: envNumber('FREEPORT_FREE_SESSIONS_PER_DAY', 6, {
      min: 0,
      max: 10_000,
    }),
    sessionDurationMs: envNumber('FREEPORT_SESSION_DURATION_MINUTES', 60, {
      min: 1,
      max: 60 * 24,
    }) * 60_000,
    sessionGraceMs: envNumber('FREEPORT_SESSION_GRACE_MINUTES', 10, {
      min: 0,
      max: 60 * 24,
    }) * 60_000,
    resetTimeZone: process.env.FREEPORT_SESSION_RESET_TIMEZONE ?? 'Pacific Time',
    resetOffsetHoursUtc: envNumber('FREEPORT_SESSION_RESET_OFFSET_HOURS_UTC', -7, {
      min: -14,
      max: 14,
    }),
    adminToken: process.env.FREEPORT_ADMIN_TOKEN ?? 'admin',
    adInventory: parseAdInventory(),
    pricing: {
      inputUsdPerMToken: envNumber('FREEPORT_PRICE_INPUT_USD_PER_MT', 0.1, {
        min: 0,
      }),
      outputUsdPerMToken: envNumber('FREEPORT_PRICE_OUTPUT_USD_PER_MT', 0.2, {
        min: 0,
      }),
    },
    adRevenuePerImpressionUsd: envNumber(
      'FREEPORT_AD_REVENUE_PER_IMPRESSION_USD',
      0.001,
      { min: 0 },
    ),
    logShippingEnabled: process.env.FREEPORT_LOG_SHIPPING !== 'false',
    logLevel: (process.env.FREEPORT_LOG_LEVEL as ServerConfig['logLevel']) ?? 'info',
    paddleApiKey: process.env.PADDLE_API_KEY ?? '',
    paddleWebhookSecret: process.env.PADDLE_WEBHOOK_SECRET ?? '',
    paddleEnv: (process.env.PADDLE_ENV as 'sandbox' | 'production') ?? 'sandbox',
    paddleClientToken: process.env.PADDLE_CLIENT_TOKEN ?? '',
    paidSessionsPerDay: envNumber('FREEPORT_PAID_SESSIONS_PER_DAY', 200, {
      min: 1,
      max: 10_000,
    }),
    paidAdsEnabled: process.env.FREEPORT_PAID_ADS_ENABLED === 'true',
    subscriptionGracePeriodDays: envNumber('FREEPORT_SUBSCRIPTION_GRACE_PERIOD_DAYS', 7, {
      min: 0,
      max: 30,
    }),
  }
  return { ...config, ...overrides }
}