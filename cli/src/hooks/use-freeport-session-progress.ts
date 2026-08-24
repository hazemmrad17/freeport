import { useNow } from './use-now'
import { IS_FREEPORT } from '../utils/constants'

import type { freeportSessionResponse } from '../types/freeport-session'

export interface freeportSessionProgress {
  /** 0..1, fraction of the session remaining. 1 at admission, 0 at expiry. */
  fraction: number
  remainingMs: number
}

/**
 * Computes a live progress value for the active FREEPORT session, ticking at
 * 1Hz. Returns null outside of active state or in non-FREEPORT builds, so
 * callers can short-circuit their rendering.
 */
export function usefreeportSessionProgress(
  session: freeportSessionResponse | null,
): freeportSessionProgress | null {
  const expiresAtMs =
    session?.status === 'active' ? Date.parse(session.expiresAt) : null
  const admittedAtMs =
    session?.status === 'active' ? Date.parse(session.admittedAt) : null

  const nowMs = useNow(1000, expiresAtMs !== null)

  if (!IS_FREEPORT || !expiresAtMs || !admittedAtMs) return null

  const totalMs = expiresAtMs - admittedAtMs
  if (totalMs <= 0) return null
  const remainingMs = Math.max(0, expiresAtMs - nowMs)
  const fraction = Math.max(0, Math.min(1, remainingMs / totalMs))
  return { fraction, remainingMs }
}
