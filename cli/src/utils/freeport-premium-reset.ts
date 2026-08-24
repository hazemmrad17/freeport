import { FREEPORT_PREMIUM_SESSION_RESET_TIMEZONE } from '@codebuff/common/constants/freeport-models'
import { getZonedDayBounds } from '@codebuff/common/util/zoned-time'

import type { freeportSessionRateLimitByModel } from '@codebuff/common/types/freeport-session'

export function getfreeportPremiumResetAt(params: {
  rateLimitsByModel?: freeportSessionRateLimitByModel
  nowMs: number
}): Date {
  const { rateLimitsByModel, nowMs } = params
  const serverResetAt = rateLimitsByModel
    ? Object.values(rateLimitsByModel)[0]?.resetAt
    : undefined
  const parsedServerResetAt = serverResetAt ? new Date(serverResetAt) : null

  if (
    parsedServerResetAt &&
    Number.isFinite(parsedServerResetAt.getTime())
  ) {
    return parsedServerResetAt
  }

  return getZonedDayBounds(
    new Date(nowMs),
    FREEPORT_PREMIUM_SESSION_RESET_TIMEZONE,
  ).resetsAt
}

/**
 * Human "resets in ΓÇª" countdown. Daily pools stop at hours (`withDays` off);
 * a multi-day window (e.g. a lapsed reset) sets `withDays` so it reads as "2d 5h"
 * instead of a 100-hour figure.
 */
export function formatfreeportPremiumResetCountdown(
  resetAt: Date,
  nowMs: number,
  { withDays = false }: { withDays?: boolean } = {},
): string {
  const diffMs = resetAt.getTime() - nowMs
  if (!Number.isFinite(diffMs) || diffMs <= 0) return 'now'

  const totalMinutes = Math.max(1, Math.floor(diffMs / 60_000))
  if (withDays) {
    const days = Math.floor(totalMinutes / (60 * 24))
    if (days > 0) {
      const hours = Math.floor((totalMinutes % (60 * 24)) / 60)
      return hours === 0 ? `${days}d` : `${days}d ${hours}h`
    }
  }
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours === 0) return `${minutes}m`
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`
}
