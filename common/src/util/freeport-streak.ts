import {
  FREEPORT_GLM_V52_REFERRAL_ENABLED,
  FREEPORT_PREMIUM_SESSION_RESET_TIMEZONE,
  FREEPORT_STREAK_GLM_BONUS_ENABLED,
  FREEPORT_STREAK_GLM_BONUS_MAX_MULTIPLIER,
  FREEPORT_STREAK_BONUS_SESSION_UNITS,
  FREEPORT_STREAK_REWARD_INTERVAL_DAYS,
  FREEPORT_STREAK_REWARDS_ENABLED,
} from '../constants/freeport-models'

import type {
  freeportAccessTier,
  freeportStreakRewardPool,
} from '../constants/freeport-models'

export const FREEPORT_STREAK_TIME_ZONE = FREEPORT_PREMIUM_SESSION_RESET_TIMEZONE

const DAY_MS = 24 * 60 * 60 * 1000

function dateKeyFromParts(parts: Intl.DateTimeFormatPart[]): string {
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value

  const year = get('year')
  const month = get('month')
  const day = get('day')

  if (!year || !month || !day) {
    throw new Error('Failed to format FREEPORT usage date')
  }

  return `${year}-${month}-${day}`
}

export function getfreeportUsageDateKey(
  now: Date = new Date(),
  timeZone = FREEPORT_STREAK_TIME_ZONE,
): string {
  return dateKeyFromParts(
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(now),
  )
}

export function addDaysToDateKey(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date key: ${dateKey}`)
  }

  return new Date(date.getTime() + days * DAY_MS).toISOString().slice(0, 10)
}

export function calculatefreeportStreak(params: {
  usageDates: readonly string[]
  todayDateKey: string
}): {
  streak: number
  todayUsed: boolean
  lastUsageDate: string | null
} {
  const { usageDates, todayDateKey } = params
  const usageDateSet = new Set(
    usageDates.filter((date) => date <= todayDateKey),
  )
  const lastUsageDate = usageDates.reduce<string | null>((latest, date) => {
    if (date > todayDateKey) return latest
    return latest === null || date > latest ? date : latest
  }, null)
  const todayUsed = usageDateSet.has(todayDateKey)

  let anchorDateKey = todayDateKey
  if (!todayUsed) {
    const yesterdayDateKey = addDaysToDateKey(todayDateKey, -1)
    if (!usageDateSet.has(yesterdayDateKey)) {
      return { streak: 0, todayUsed, lastUsageDate }
    }
    anchorDateKey = yesterdayDateKey
  }

  let streak = 0
  for (
    let cursor = anchorDateKey;
    usageDateSet.has(cursor);
    cursor = addDaysToDateKey(cursor, -1)
  ) {
    streak++
  }

  return { streak, todayUsed, lastUsageDate }
}

/**
 * Whether the full-access GLM 5.2 streak bonus is currently active. Requires all
 * three switches: streak rewards on, the GLM streak sub-switch on, AND the GLM
 * program itself live ΓÇö GLM is only launchable from the referral banner, which
 * is hidden when the referral program is wound down, so a GLM bonus granted
 * while it's off would be unusable. Keeping the grant and the advertised perk
 * gated on the same predicate avoids that mismatch.
 */
export function isfreeportStreakGlmBonusActive(): boolean {
  return (
    FREEPORT_STREAK_REWARDS_ENABLED &&
    FREEPORT_STREAK_GLM_BONUS_ENABLED &&
    FREEPORT_GLM_V52_REFERRAL_ENABLED
  )
}

/** GLM sessions per pool window earned by a streak of `streak` days, ignoring
 * the feature gates: one per completed 7-day interval, capped at
 * `FREEPORT_STREAK_GLM_BONUS_MAX_MULTIPLIER` (a 28-day streak earns the max).
 * The GLM pool resets daily since 2026-07-29 (weekly before), so these units
 * refill at that cadence. The name keeps its historical "Weekly". */
export function getfreeportStreakGlmWeeklyUnits(streak: number): number {
  const tiers = Math.min(
    Math.floor(streak / FREEPORT_STREAK_REWARD_INTERVAL_DAYS),
    FREEPORT_STREAK_GLM_BONUS_MAX_MULTIPLIER,
  )
  return tiers * FREEPORT_STREAK_BONUS_SESSION_UNITS
}

/** Resolve the live GLM bonus directly from usage dates. The GLM pool gets +1
 * per completed 7 days of the current streak (7 ΓåÆ 1, 14 ΓåÆ 2, capped at 4 for
 * 28+) and refills at the pool reset (daily Pacific since 2026-07-29); once
 * the streak breaks it gets 0. */
export function getfreeportStreakGlmBonusUnits(params: {
  usageDates: readonly string[]
  todayDateKey: string
}): number {
  if (!isfreeportStreakGlmBonusActive()) return 0
  const { streak } = calculatefreeportStreak(params)
  return getfreeportStreakGlmWeeklyUnits(streak)
}

/**
 * The daily streak-reward pool to persist after today's first usage, or `null`
 * when nothing should be awarded. Full-access users receive a premium bonus;
 * limited-access users receive a limited-pool bonus. GLM is intentionally not
 * returned: its weekly +1 is derived live from usage dates, so it refills with
 * the weekly quota and shuts off with the streak instead of becoming a one-time
 * ledger grant.
 */
export function getfreeportDailyStreakRewardPool(params: {
  streak: number
  todayUsed: boolean
  accessTier: freeportAccessTier
}): Exclude<freeportStreakRewardPool, 'glm'> | null {
  if (!FREEPORT_STREAK_REWARDS_ENABLED) return null
  if (!params.todayUsed) return null
  if (params.streak < FREEPORT_STREAK_REWARD_INTERVAL_DAYS) return null
  return params.accessTier === 'limited' ? 'limited' : 'premium'
}
