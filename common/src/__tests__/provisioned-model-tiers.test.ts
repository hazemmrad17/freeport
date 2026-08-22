/**
 * The provisioned `-max` tiers.
 *
 * These are granted per account rather than picked, so the invariant is the
 * opposite of a normal model's: every catalog must NOT contain them. A client
 * that rendered one would offer a row most accounts cannot run, and the
 * request would fail at admission rather than at the picker — the confusing
 * shape a hidden tier always takes when it leaks into a selectable list.
 *
 * Each tier is pinned to exactly one root, like every other free-mode model,
 * and each root is pinned to exactly that tier: a root that also accepted the
 * base model would be a second, unmetered door onto it — which is what the
 * retired `base2-free-glm-crof` route turned out to be.
 */
import { describe, expect, test } from 'bun:test'

import {
  FREE_MODE_AGENT_MODELS,
  FREEPORT_CLI_BASE3_AGENT_ID_BY_MODEL,
  FREEPORT_ROOT_AGENT_IDS,
  FREEPORT_WEB_BASE3_AGENT_ID_BY_MODEL,
  isFreeModeAllowedAgentModel,
} from '../constants/free-agents'
import {
  FREEPORT_DEEPSEEK_V4_FLASH_MAX_MODEL_ID,
  FREEPORT_DEEPSEEK_V4_FLASH_MODEL_ID,
  FREEPORT_DEEPSEEK_V4_PRO_MAX_MODEL_ID,
  FREEPORT_DEEPSEEK_V4_PRO_MODEL_ID,
  FREEPORT_GPT_5_6_LUNA_MAX_MODEL_ID,
  FREEPORT_GPT_5_6_LUNA_MODEL_ID,
  FREEPORT_MODELS,
  FREEPORT_PROVISIONED_MODELS,
  FREEPORT_WEB_ALL_MODELS,
  FREEPORT_WEB_MODELS,
  FREEPORT_WEB_PREMIUM_MODEL_IDS,
  FREEPORT_STANDARD_MODEL_IDS,
  SUPPORTED_FREEPORT_MODELS,
  resolveSupportedfreeportModel,
} from '../constants/freeport-models'

/** tier -> the root that runs it, and the base model it extends. */
const TIERS: Array<{ id: string; root: string; base: string }> = [
  {
    id: FREEPORT_DEEPSEEK_V4_PRO_MAX_MODEL_ID,
    root: 'base2-free-deepseek-pro-max',
    base: FREEPORT_DEEPSEEK_V4_PRO_MODEL_ID,
  },
  {
    id: FREEPORT_DEEPSEEK_V4_FLASH_MAX_MODEL_ID,
    root: 'base2-free-deepseek-flash-max',
    base: FREEPORT_DEEPSEEK_V4_FLASH_MODEL_ID,
  },
  {
    id: FREEPORT_GPT_5_6_LUNA_MAX_MODEL_ID,
    root: 'base2-free-luna-max',
    base: FREEPORT_GPT_5_6_LUNA_MODEL_ID,
  },
]

describe('provisioned tiers are never offered from a catalog', () => {
  test('the tier list is not empty', () => {
    // Floor: an empty list makes every case below vacuous.
    expect(FREEPORT_PROVISIONED_MODELS.length).toBe(TIERS.length)
  })

  const catalogs: Array<[string, readonly string[]]> = [
    ['SUPPORTED_FREEPORT_MODELS', SUPPORTED_FREEPORT_MODELS.map((m) => m.id)],
    ['FREEPORT_MODELS', FREEPORT_MODELS.map((m) => m.id)],
    ['FREEPORT_WEB_MODELS', FREEPORT_WEB_MODELS.map((m) => m.id)],
    ['FREEPORT_WEB_ALL_MODELS', FREEPORT_WEB_ALL_MODELS.map((m) => m.id)],
    ['FREEPORT_WEB_PREMIUM_MODEL_IDS', [...FREEPORT_WEB_PREMIUM_MODEL_IDS]],
    ['FREEPORT_STANDARD_MODEL_IDS', [...FREEPORT_STANDARD_MODEL_IDS]],
  ]

  test.each(catalogs)('%s omits every provisioned tier', (_name, ids) => {
    for (const tier of TIERS) expect(ids).not.toContain(tier.id)
  })

  test('a saved preference for a tier falls back to a pickable model', () => {
    for (const tier of TIERS) {
      expect(resolveSupportedfreeportModel(tier.id)).not.toBe(tier.id)
    }
  })

  test('no base3 root map resolves a provisioned tier', () => {
    for (const tier of TIERS) {
      expect(FREEPORT_WEB_BASE3_AGENT_ID_BY_MODEL[tier.id]).toBeUndefined()
      expect(FREEPORT_CLI_BASE3_AGENT_ID_BY_MODEL[tier.id]).toBeUndefined()
    }
  })
})

describe('each tier is pinned to exactly one root', () => {
  test.each(TIERS)('$id runs on $root and nothing else', (tier) => {
    expect(FREE_MODE_AGENT_MODELS[tier.root]?.has(tier.id)).toBe(true)
    expect(isFreeModeAllowedAgentModel(tier.root, tier.id)).toBe(true)
  })

  test.each(TIERS)('$root cannot run the base model $base', (tier) => {
    // A second, unmetered door onto the base model otherwise.
    expect(isFreeModeAllowedAgentModel(tier.root, tier.base)).toBe(false)
  })

  test.each(TIERS)('$root is a registered root agent', (tier) => {
    // A root absent from this list is treated as a subagent, so a top-level
    // request on it fails the hierarchy check instead of running.
    expect(FREEPORT_ROOT_AGENT_IDS).toContain(tier.root)
  })

  test.each(TIERS)('the base model does not run on $root', (tier) => {
    const rootForBase = Object.entries(FREE_MODE_AGENT_MODELS).filter(
      ([agentId, models]) => models.has(tier.base) && agentId === tier.root,
    )
    expect(rootForBase).toEqual([])
  })
})
