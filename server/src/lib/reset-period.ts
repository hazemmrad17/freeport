const DAY_MS = 24 * 60 * 60 * 1000

export interface ResetPeriod {
  /** UTC ms at which the current period began. */
  startMs: number
  /** UTC ms at which the next period begins. */
  nextStartMs: number
  /** ISO instant of the next reset, for the `resetAt` wire field. */
  resetAt: string
  /** Ms until the next reset, for `retryAfterMs`. */
  retryAfterMs: number
}

/**
 * Compute the current reset period for a fixed UTC offset.
 *
 * The reset boundary is `X:00` in a timezone pinned to `offsetHoursUtc`
 * (default -7, i.e. Pacific). Using a fixed offset keeps the math exact and
 * DST-free for v1; `resetTimeZone` is emitted as a display string only.
 */
export function getResetPeriod(
  nowMs: number,
  offsetHoursUtc: number,
): ResetPeriod {
  const offsetMs = offsetHoursUtc * 60 * 60 * 1000
  const shifted = nowMs + offsetMs
  const periodStartShifted = Math.floor(shifted / DAY_MS) * DAY_MS
  const startMs = periodStartShifted - offsetMs
  const nextStartMs = startMs + DAY_MS
  return {
    startMs,
    nextStartMs,
    resetAt: new Date(nextStartMs).toISOString(),
    retryAfterMs: Math.max(0, nextStartMs - nowMs),
  }
}