import type { TrustTier } from '../db'

export interface GitHubAccountMetadata {
  createdAt?: string | number | null
  publicRepos?: number | null
  followers?: number | null
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

/**
 * Calculates user trust tier based on GitHub account signals.
 *
 * Rules:
 * - GitHub account age >= 1 year (365 days) and has activity/repos/followers -> 'trusted'
 * - GitHub account age >= 30 days -> 'standard'
 * - GitHub account age < 30 days (or missing/invalid) -> 'low'
 * - If signup velocity from this IP is excessive, demote to 'low'
 */
export function calculateGitHubTrustTier(
  meta: GitHubAccountMetadata,
  ipExceededLimit = false,
): { trustTier: TrustTier; ageDays: number; reason: string } {
  if (ipExceededLimit) {
    return {
      trustTier: 'low',
      ageDays: 0,
      reason: 'Multiple accounts created from the same IP within 24 hours',
    }
  }

  if (!meta.createdAt) {
    return {
      trustTier: 'low',
      ageDays: 0,
      reason: 'Unknown GitHub account creation timestamp',
    }
  }

  const createdMs =
    typeof meta.createdAt === 'number'
      ? meta.createdAt
      : new Date(meta.createdAt).getTime()

  if (Number.isNaN(createdMs) || createdMs <= 0) {
    return {
      trustTier: 'low',
      ageDays: 0,
      reason: 'Invalid GitHub account creation date',
    }
  }

  const nowMs = Date.now()
  const ageMs = Math.max(0, nowMs - createdMs)
  const ageDays = Math.floor(ageMs / MS_PER_DAY)

  const publicRepos = meta.publicRepos ?? 0
  const followers = meta.followers ?? 0

  if (ageDays >= 365 && (publicRepos > 0 || followers > 0 || meta.publicRepos == null)) {
    return {
      trustTier: 'trusted',
      ageDays,
      reason: `GitHub account age (${ageDays} days) >= 1 year with verified activity`,
    }
  }

  if (ageDays >= 30) {
    return {
      trustTier: 'standard',
      ageDays,
      reason: `GitHub account age (${ageDays} days) >= 30 days`,
    }
  }

  return {
    trustTier: 'low',
    ageDays,
    reason: `New GitHub account (${ageDays} days < 30 days)`,
  }
}

/**
 * Calculates user trust tier based on Google account signals.
 * Google accounts do not expose creation date via standard OpenID Connect,
 * so we default to 'standard' unless IP signup velocity indicates spam/bot activity.
 */
export function calculateGoogleTrustTier(
  ipExceededLimit = false,
): { trustTier: TrustTier; reason: string } {
  if (ipExceededLimit) {
    return {
      trustTier: 'low',
      reason: 'Multiple accounts created from the same IP within 24 hours',
    }
  }

  return {
    trustTier: 'standard',
    reason: 'Google verified account',
  }
}
