import { getReferralInfo } from '@codebuff/common/types/freeport-session'

import type { freeportAccessTier } from '@codebuff/common/constants/freeport-models'
import type { freeportReferralInfo } from '@codebuff/common/types/freeport-session'
import type { freeportSessionResponse } from '../types/freeport-session'

/**
 * Process-wide cache of the most recent referral block the server sent for
 * each access tier.
 *
 * The server only attaches `referral` to `none` (landing) responses ΓÇö once the
 * user joins (queued/active) or ends a session (ended) it's dropped from the
 * payload. That breaks the return-to-landing flow: after a session ends the
 * slot DELETE leaves an `ended` row, so the landing GET sees `ended` (no
 * referral) until that row is swept, which would otherwise blank the GLM
 * referral banner for the whole visit. Caching the last-known block lets the
 * picker re-render it immediately; a later clean `none` GET refreshes it.
 */
let referralByAccessTier: Partial<
  Record<freeportAccessTier, freeportReferralInfo>
> = {}

/** Remember the referral block whenever a response includes one, so it can be
 *  carried across the join ΓåÆ end ΓåÆ return-to-landing round-trip. Active/ended
 *  responses intentionally omit it and keep the prior value; an authoritative
 *  `none` response without it clears stale metadata for that tier. */
export function rememberReferral(session: freeportSessionResponse | null): void {
  const referral = getReferralInfo(session)
  const accessTier =
    session && 'accessTier' in session ? session.accessTier : undefined
  // Full- and limited-tier referral blocks have different meanings. Never
  // cache one without the tier needed to interpret it safely.
  if (!accessTier) return
  if (referral) {
    referralByAccessTier[accessTier] = referral
  } else if (session?.status === 'none') {
    delete referralByAccessTier[accessTier]
  }
}

/** The last referral block seen for this tier, if any. */
export function getCachedReferral(
  accessTier: freeportAccessTier | undefined,
): freeportReferralInfo | undefined {
  return accessTier ? referralByAccessTier[accessTier] : undefined
}

/** Clear account-scoped referral metadata when its session owner unmounts. */
export function clearReferralCache(): void {
  referralByAccessTier = {}
}
