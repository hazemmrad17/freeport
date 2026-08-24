import { describe, expect, test } from 'bun:test'

import {
  canfreeportModelSpawnGeminiThinker,
  DEFAULT_FREEPORT_MODEL_ID,
  DEFAULT_FREEPORT_WEB_MODEL_ID,
  FALLBACK_FREEPORT_MODEL_ID,
  FREEPORT_WEB_DEEMPHASIZED_MODEL_IDS,
  FREEPORT_DEEPSEEK_V4_FLASH_MODEL_ID,
  FREEPORT_DEEPSEEK_V4_PRO_MODEL_ID,
  FREEPORT_DESKTOP_SESSION_LIMITS,
  FREEPORT_FABLE_5_MODEL_ID,
  FREEPORT_ENABLE_MIMO_MODELS_IN_UI,
  FREEPORT_GLM_V52_MODEL_ID,
  FREEPORT_GPT_5_6_LUNA_MAX_PRICE,
  FREEPORT_GPT_5_6_LUNA_MODEL_ID,
  FREEPORT_GPT_5_6_LUNA_PROVIDER_ROUTE,
  FREEPORT_GPT_5_6_LUNA_REASONING_EFFORT,
  FREEPORT_KIMI_K3_ECO_MODEL_ID,
  FREEPORT_MUSE_SPARK_12_CONTRIBUTOR_MODEL_ID,
  FREEPORT_MUSE_SPARK_REASONING_EFFORT,
  getfreeportModelReasoningEffort,
  MUSE_SPARK_12_CONTRIBUTOR_UPSTREAM_MODEL_ID,
  MUSE_SPARK_FALLBACK_AFTER_MS,
  MUSE_SPARK_FALLBACK_MODEL_ID,
  MUSE_SPARK_FALLBACK_NOTICE,
  isMuseSparkModelId,
  LIMITED_FREEPORT_MODEL_ID,
  LIMITED_FREEPORT_MODEL_IDS,
  FREEPORT_MIMO_V25_MODEL_ID,
  FREEPORT_MODELS,
  FREEPORT_WEB_GOD_ONLY_MODELS,
  FREEPORT_WEB_ALL_MODELS,
  FREEPORT_WEB_MODELS,
  FREEPORT_WEB_RETIRED_PICKER_MODEL_IDS,
  FREEPORT_STANDARD_MODEL_IDS,
  SUPPORTED_FREEPORT_MODELS,
  getfreeportDeploymentAvailabilityLabel,
  getfreeportDesktopSessionBucket,
  getfreeportModel,
  getfreeportModelImageSupport,
  getfreeportWebModel,
  getfreeportModelsForAccessTier,
  getRecommendedfreeportModelId,
  getRecommendedfreeportWebModelId,
  isfreeportWebDeemphasizedModelId,
  isfreeportDeploymentHours,
  isfreeportGlmV52ModelId,
  isfreeportGpt56LunaModelId,
  isfreeportLimitedOfferModelId,
  getfreeportPerModelSessionCap,
  isfreeportPausedFreeModelId,
  isfreeportSessionModelAllowedForAccessTier,
  isfreeportSessionModelAvailable,
  isfreeportTracedModelId,
  isfreeportWebGeoExemptModelId,
  isfreeportWebSelectableModelId,
  isfreeportModelId,
  isfreeportMultimodalModelId,
  isfreeportModelAllowedForAccessTier,
  isfreeportPremiumModelId,
  isfreeportWebGodOnlyModelId,
  isfreeportWebRememberableModelId,
  isfreeportWebModelAllowedForLimitedTier,
  isfreeportWebModelId,
  isfreeportWebMultimodalModelId,
  isfreeportWebPremiumModelId,
  resolveRememberedfreeportWebModel,
  isSupportedfreeportModelId,
  isfreeportSessionModelId,
  resolvefreeportWebModel,
  resolvefreeportWebModelForLimitedTier,
  resolvefreeportModelForAccessTier,
  resolvefreeportSessionModelForAccessTier,
  getfreeportModelSupersededBy,
  migrateSupersededfreeportModelPreference,
} from '../constants/freeport-models'
import type { freeportModelOption } from '../constants/freeport-models'
import { minimaxModels } from '../constants/model-config'

const FREEPORT_KIMI_MODEL_ID = 'moonshotai/kimi-k2.7-code'
// Both removed 2026-08-04. Held as literals, not imported constants, so these
// guards keep asserting on the WIRE ids even if a constant of the same name is
// ever reintroduced.
const FREEPORT_MIMO_V25_PRO_MODEL_ID = 'mimo/mimo-v2.5-pro'
const FREEPORT_CROF_GLM_V52_MODEL_ID = 'crof/glm-5.2'

const MINIMAX_M3_MODEL_ID = minimaxModels.minimaxM3

describe('FREEPORT model availability', () => {
  test('defaults to V4 Pro and falls back to V4 Flash for new clients', () => {
    // The two constants answer different questions and name different models:
    // the default is what we RECOMMEND, the fallback is what is always joinable
    // when the premium pool is spent. Flash holds the first and MiMo the second
    // since Flash became premium (2026-08-18).
    expect(DEFAULT_FREEPORT_MODEL_ID).toBe(FREEPORT_DEEPSEEK_V4_FLASH_MODEL_ID)
    expect(FALLBACK_FREEPORT_MODEL_ID).toBe(FREEPORT_MIMO_V25_MODEL_ID)
    // The default may be premium ΓÇö it steps down when the pool is spent ΓÇö but
    // it must NOT be on the one-a-day ceiling, which would cap the recommended
    // model at a single hour. That ceiling is V4 Pro's alone for exactly this
    // reason; Flash is metered by the ordinary premium pool.
    expect(
      Boolean(getfreeportPerModelSessionCap(DEFAULT_FREEPORT_MODEL_ID)),
    ).toBe(false)
    expect(isfreeportPremiumModelId(DEFAULT_FREEPORT_MODEL_ID)).toBe(true)
    expect(
      Boolean(getfreeportPerModelSessionCap(FALLBACK_FREEPORT_MODEL_ID)),
    ).toBe(false)
    // The default is premium, so every surface that offers it has to know the
    // live quota ΓÇö that is the whole reason the fallback exists separately.
    //
    // The fallback being NON-premium is the load-bearing half: it is where every
    // surface steps down when the pool is spent, so a premium value here would
    // step users onto a model that fails admission for exactly the users it was
    // meant to rescue.
    expect(isfreeportPremiumModelId(DEFAULT_FREEPORT_MODEL_ID)).toBe(true)
    expect(isfreeportPremiumModelId(FALLBACK_FREEPORT_MODEL_ID)).toBe(false)
  })

  test('desktop concurrency splits full access into 1 premium and 3 unlimited sessions', () => {
    // Flash moved from the unlimited bucket to the premium one when it became
    // premium ΓÇö a real concurrency change for desktop users (3 tabs to 1), and
    // an automatic one, since the bucket list is a superset of the premium ids.
    expect(
      getfreeportDesktopSessionBucket(
        FREEPORT_DEEPSEEK_V4_FLASH_MODEL_ID,
        'full',
      ),
    ).toBe('premium')
    expect(
      getfreeportDesktopSessionBucket(FREEPORT_MIMO_V25_MODEL_ID, 'full'),
    ).toBe('unlimited')
    expect(FREEPORT_DESKTOP_SESSION_LIMITS).toEqual({
      premium: 1,
      unlimited: 3,
    })
    expect(
      getfreeportDesktopSessionBucket(
        FREEPORT_DEEPSEEK_V4_FLASH_MODEL_ID,
        'limited',
      ),
    ).toBe('premium')
  })

  test('DeepSeek Pro keeps its AI-training warning while paused', () => {
    // Not in FREEPORT_MODELS any more ΓÇö paused models stay in SUPPORTED so the
    // server can recognise and coerce them, and a row support can still look up
    // has to keep its disclosure.
    const deepseek = SUPPORTED_FREEPORT_MODELS.find(
      (m) => m.id === FREEPORT_DEEPSEEK_V4_PRO_MODEL_ID,
    )
    expect((deepseek as { warning?: string } | undefined)?.warning).toBe(
      'May use data for AI training',
    )
  })

  test('DeepSeek Flash carries the AI-training warning before selection', () => {
    const deepseek = FREEPORT_MODELS.find(
      (m) => m.id === FREEPORT_DEEPSEEK_V4_FLASH_MODEL_ID,
    )
    expect((deepseek as { warning?: string } | undefined)?.warning).toBe(
      'May use data for AI training',
    )
  })

  test('only the DeepSeek family is trace-stored in free mode; M3 has no warning', () => {
    const m3 = FREEPORT_MODELS.find((m) => m.id === MINIMAX_M3_MODEL_ID)
    expect((m3 as { warning?: string } | undefined)?.warning).toBeUndefined()
    // The DeepSeek family discloses AI training and IS stored.
    expect(isfreeportTracedModelId(FREEPORT_DEEPSEEK_V4_PRO_MODEL_ID)).toBe(
      true,
    )
    expect(isfreeportTracedModelId(FREEPORT_DEEPSEEK_V4_FLASH_MODEL_ID)).toBe(
      true,
    )
    // Everything else (incl. M3 on Fireworks) is NOT stored.
    expect(isfreeportTracedModelId(MINIMAX_M3_MODEL_ID)).toBe(false)
    expect(isfreeportTracedModelId(FREEPORT_KIMI_MODEL_ID)).toBe(false)
    expect(isfreeportTracedModelId(FREEPORT_MIMO_V25_MODEL_ID)).toBe(false)
    expect(isfreeportTracedModelId(null)).toBe(false)
  })

  test('trace storage follows machine-readable data-use metadata', () => {
    const models: readonly freeportModelOption[] = SUPPORTED_FREEPORT_MODELS
    for (const model of models) {
      expect(isfreeportTracedModelId(model.id)).toBe(
        model.dataUse === 'training',
      )
      expect(model.warning !== undefined).toBe(model.dataUse === 'training')
    }
  })

  test('DeepSeek V4 Flash is selectable and premium', () => {
    expect(FREEPORT_MODELS.map((model) => model.id)).toContain(
      FREEPORT_DEEPSEEK_V4_FLASH_MODEL_ID,
    )
    expect(isfreeportModelId(FREEPORT_DEEPSEEK_V4_FLASH_MODEL_ID)).toBe(true)
    // TEMPORARY (2026-08-18). Flash was the unlimited row every account could
    // run without touching the daily pool; it is metered by that pool now.
    expect(isfreeportPremiumModelId(FREEPORT_DEEPSEEK_V4_FLASH_MODEL_ID)).toBe(
      true,
    )
    // The catalog must never be all-premium: something has to be left for an
    // account whose pool is spent, and MiMo 2.5 is the only unlimited row while
    // this holds.
    expect(FREEPORT_MODELS.some((model) => !model.premium)).toBe(true)
  })

  test('V4 Pro is selectable, premium, and recommended by nothing', () => {
    // Pro was pulled from the catalog on 2026-08-18 and put back on 08-19:
    // monitoring its cost and routing its provider both need it to serve
    // traffic. What replaced the removal is de-recommendation, and these are
    // the four places that has to hold.
    expect(FREEPORT_MODELS.map((model) => model.id)).toContain(
      FREEPORT_DEEPSEEK_V4_PRO_MODEL_ID,
    )
    expect(isfreeportPremiumModelId(FREEPORT_DEEPSEEK_V4_PRO_MODEL_ID)).toBe(
      true,
    )
    expect(isfreeportPausedFreeModelId(FREEPORT_DEEPSEEK_V4_PRO_MODEL_ID)).toBe(
      false,
    )

    // Not a default on any surface...
    expect(DEFAULT_FREEPORT_MODEL_ID).not.toBe(
      FREEPORT_DEEPSEEK_V4_PRO_MODEL_ID,
    )
    expect(DEFAULT_FREEPORT_WEB_MODEL_ID).not.toBe(
      FREEPORT_DEEPSEEK_V4_PRO_MODEL_ID,
    )
    expect(getRecommendedfreeportModelId('full')).not.toBe(
      FREEPORT_DEEPSEEK_V4_PRO_MODEL_ID,
    )
    // ...and nothing steers a user TOWARD it, which is the failure mode that
    // would quietly undo the rest: a supersedes notice is a one-click switch
    // and migrateSupersededfreeportModelPreference rewrites stored picks.
    const all = FREEPORT_MODELS.map((model) => model.id)
    for (const id of all) {
      const superseded = getfreeportModelSupersededBy(id, all)
      if (!superseded) continue
      expect(superseded.modelId).not.toBe(FREEPORT_DEEPSEEK_V4_PRO_MODEL_ID)
    }
    // It steers the other way instead.
    expect(
      getfreeportModelSupersededBy(FREEPORT_DEEPSEEK_V4_PRO_MODEL_ID, all)
        ?.modelId,
    ).toBe(FREEPORT_DEEPSEEK_V4_FLASH_MODEL_ID)
    // Sorted last rather than muted ΓÇö see the note on FREEPORT_MODELS.
    expect(all[all.length - 1]).toBe(FREEPORT_DEEPSEEK_V4_PRO_MODEL_ID)
  })

  test('MiMo 2.5 remains supported and follows the UI rollout flag', () => {
    expect(SUPPORTED_FREEPORT_MODELS.map((model) => model.id)).toContain(
      FREEPORT_MIMO_V25_MODEL_ID,
    )

    if (FREEPORT_ENABLE_MIMO_MODELS_IN_UI) {
      expect(FREEPORT_MODELS.map((model) => model.id)).toContain(
        FREEPORT_MIMO_V25_MODEL_ID,
      )
    } else {
      expect(FREEPORT_MODELS.map((model) => model.id)).not.toContain(
        FREEPORT_MIMO_V25_MODEL_ID,
      )
    }

    expect(isfreeportPremiumModelId(FREEPORT_MIMO_V25_MODEL_ID)).toBe(false)
    expect(getfreeportModelImageSupport(FREEPORT_MIMO_V25_MODEL_ID)).toBe(true)
  })

  test('MiMo 2.5 Pro is fully removed from FREEPORT', () => {
    // Retired from the client pickers 2026-07-31, server half removed
    // 2026-08-04 once the tail had decayed from ~170 to ~33 daily users. Same
    // two-stage shape Kimi K2.7 Code went through. Paid/BYOK MiMo Pro is
    // unaffected; it never resolves through these helpers.
    expect(SUPPORTED_FREEPORT_MODELS.map((model) => model.id)).not.toContain(
      FREEPORT_MIMO_V25_PRO_MODEL_ID,
    )
    expect(FREEPORT_MODELS.map((model) => model.id)).not.toContain(
      FREEPORT_MIMO_V25_PRO_MODEL_ID,
    )
    expect(FREEPORT_WEB_MODELS.map((model) => model.id)).not.toContain(
      FREEPORT_MIMO_V25_PRO_MODEL_ID,
    )
    expect(isfreeportModelId(FREEPORT_MIMO_V25_PRO_MODEL_ID)).toBe(false)
    expect(isSupportedfreeportModelId(FREEPORT_MIMO_V25_PRO_MODEL_ID)).toBe(
      false,
    )
    expect(isfreeportSessionModelId(FREEPORT_MIMO_V25_PRO_MODEL_ID)).toBe(false)
    expect(isfreeportPremiumModelId(FREEPORT_MIMO_V25_PRO_MODEL_ID)).toBe(false)
    // The non-Pro model must not be caught by the removal: the ids share a
    // prefix, and freeportModelIdMatches only tolerates dated suffixes.
    expect(isfreeportSessionModelId(FREEPORT_MIMO_V25_MODEL_ID)).toBe(true)
  })

  test('reports image support only for known FREEPORT models', () => {
    expect(
      getfreeportModelImageSupport(FREEPORT_DEEPSEEK_V4_PRO_MODEL_ID),
    ).toBe(false)
    expect(getfreeportModelImageSupport(MINIMAX_M3_MODEL_ID)).toBe(true)
    expect(
      getfreeportModelImageSupport('vendor/new-vision-model'),
    ).toBeUndefined()

    for (const model of SUPPORTED_FREEPORT_MODELS) {
      expect(isfreeportMultimodalModelId(model.id)).toBe(model.multimodal)
    }
    for (const model of FREEPORT_WEB_ALL_MODELS) {
      expect(isfreeportWebMultimodalModelId(model.id)).toBe(model.multimodal)
    }
  })

  test('Kimi K2.7 Code is fully removed from FREEPORT', () => {
    // Removed 2026-07-31 (client pickers went first, on 2026-07-30). The server
    // half is gone too, so a stale client selection is no longer admitted ΓÇö
    // that tail was still spending ~$2.3k/day. Paid/BYOK Kimi is unaffected;
    // it never resolves through these helpers.
    expect(SUPPORTED_FREEPORT_MODELS.map((model) => model.id)).not.toContain(
      FREEPORT_KIMI_MODEL_ID,
    )
    expect(FREEPORT_MODELS.map((model) => model.id)).not.toContain(
      FREEPORT_KIMI_MODEL_ID,
    )
    expect(
      getfreeportModelsForAccessTier('full').map((m) => m.id),
    ).not.toContain(FREEPORT_KIMI_MODEL_ID)
    expect(isfreeportModelId(FREEPORT_KIMI_MODEL_ID)).toBe(false)
    expect(isSupportedfreeportModelId(FREEPORT_KIMI_MODEL_ID)).toBe(false)
    expect(getfreeportWebModel(FREEPORT_KIMI_MODEL_ID).id).toBe(
      FALLBACK_FREEPORT_MODEL_ID,
    )
    expect(isfreeportPremiumModelId(FREEPORT_KIMI_MODEL_ID)).toBe(false)
    expect(
      isfreeportModelAllowedForAccessTier(FREEPORT_KIMI_MODEL_ID, 'full'),
    ).toBe(false)
    expect(
      resolvefreeportModelForAccessTier(FREEPORT_KIMI_MODEL_ID, 'full'),
    ).toBe(FALLBACK_FREEPORT_MODEL_ID)
    // Session admission no longer accepts it either, so live stale sessions
    // resolve to the fallback instead of continuing on Kimi.
    expect(
      isfreeportSessionModelAllowedForAccessTier(
        FREEPORT_KIMI_MODEL_ID,
        'full',
      ),
    ).toBe(false)
    expect(
      resolvefreeportSessionModelForAccessTier(FREEPORT_KIMI_MODEL_ID, 'full', {
        includeGodOnly: false,
      }),
    ).toBe(FALLBACK_FREEPORT_MODEL_ID)
    // Retired K2.6 is no longer a FREEPORT model; stale saved selections must
    // fall back rather than be admitted.
    expect(isSupportedfreeportModelId('moonshotai/kimi-k2.6')).toBe(false)
    expect(
      isfreeportModelAllowedForAccessTier('moonshotai/kimi-k2.6', 'full'),
    ).toBe(false)
    expect(
      resolvefreeportModelForAccessTier('moonshotai/kimi-k2.6', 'full'),
    ).not.toBe('moonshotai/kimi-k2.6')
  })

  test('both HY3 routes are fully removed from FREEPORT', () => {
    // HY3 was withdrawn from the Web picker during the initial rollout and left
    // in FREEPORT_WEB_RETIRED_PICKER_MODEL_IDS, which is a client-side filter
    // and therefore not a gate at all ΓÇö the same mistake that let the CrofAI
    // GLM route be farmed. Removed outright 2026-08-04, along with the
    // god-only paid OpenRouter route.
    //
    // As of 2026-08-07 the wire-id CONSTANTS are gone too: hy3-fallback.ts and
    // the Atlas Cloud adapter that was its paid lane have been deleted, so
    // nothing routes `tencent/hy3` on any path, paid or free. The slugs are
    // spelled out literally here precisely because no constant remains to
    // import ΓÇö that is the point of the test.
    for (const hy3Id of ['tencent/hy3:free', 'tencent/hy3']) {
      expect(FREEPORT_MODELS.map((model) => model.id)).not.toContain(hy3Id)
      expect(SUPPORTED_FREEPORT_MODELS.map((model) => model.id)).not.toContain(
        hy3Id,
      )
      expect(FREEPORT_WEB_MODELS.map((model) => model.id)).not.toContain(hy3Id)
      expect(
        FREEPORT_WEB_GOD_ONLY_MODELS.map((model) => model.id),
      ).not.toContain(hy3Id)
      expect(FREEPORT_WEB_ALL_MODELS.map((model) => model.id)).not.toContain(
        hy3Id,
      )

      expect(isfreeportModelId(hy3Id)).toBe(false)
      expect(isSupportedfreeportModelId(hy3Id)).toBe(false)
      expect(isfreeportWebModelId(hy3Id, { includeGodOnly: true })).toBe(false)
      expect(isfreeportWebGodOnlyModelId(hy3Id)).toBe(false)
      expect(isfreeportSessionModelId(hy3Id)).toBe(false)
      // No pool may meter it, in either direction: premium would hand it out
      // free, and standard would leave it unlimited.
      expect(isfreeportWebPremiumModelId(hy3Id)).toBe(false)
      expect(isfreeportPremiumModelId(hy3Id)).toBe(false)
      expect(FREEPORT_STANDARD_MODEL_IDS).not.toContain(hy3Id)
      // A stale saved selection downgrades rather than resolving to itself.
      expect(resolvefreeportWebModel(hy3Id, { includeGodOnly: true })).toBe(
        FALLBACK_FREEPORT_MODEL_ID,
      )
      expect(getfreeportWebModel(hy3Id).id).toBe(FALLBACK_FREEPORT_MODEL_ID)
    }
  })

  test('the picker-retirement list is empty, and that is deliberate', () => {
    // Both former occupants (HY3, CrofAI GLM 5.2) were farmed or left publicly
    // advertised precisely because a picker-only retirement is a UI change, not
    // a gate. If this fails, something was parked here instead of removed ΓÇö
    // check that the id being reachable by a direct API caller is actually
    // harmless before accepting it.
    expect(FREEPORT_WEB_RETIRED_PICKER_MODEL_IDS).toEqual([])
    for (const model of FREEPORT_WEB_ALL_MODELS) {
      expect(isfreeportWebSelectableModelId(model.id)).toBe(true)
    }
  })

  test('GLM 5.2 is referral-only and reachable by exactly one model id', () => {
    // The earned route stays selectable ΓÇö removing the other GLM route must
    // never take this one down with it.
    expect(isfreeportWebSelectableModelId(FREEPORT_GLM_V52_MODEL_ID)).toBe(true)
    // Every other web model is unaffected.
    expect(
      isfreeportWebSelectableModelId(FREEPORT_DEEPSEEK_V4_PRO_MODEL_ID),
    ).toBe(true)
  })

  test('CLI access-tier resolver preserves GLM at every tier', () => {
    expect(
      resolvefreeportModelForAccessTier(FREEPORT_GLM_V52_MODEL_ID, 'full'),
    ).toBe(FREEPORT_GLM_V52_MODEL_ID)
    // Since bounties (2026-08-03), GLM survives the limited-tier coercion: a
    // bounty-earned session is redeemable in every region. The entitlement
    // gate moved DOWN into the GLM quota pool, which at limited tier counts
    // ONLY grants minted redeemable_at_limited_tier ΓÇö referral GLM still buys
    // a limited-tier user nothing. Coercing here instead would rewrite a
    // deliberate pick to DeepSeek and strand the session they earned.
    expect(
      resolvefreeportModelForAccessTier(FREEPORT_GLM_V52_MODEL_ID, 'limited'),
    ).toBe(FREEPORT_GLM_V52_MODEL_ID)
    // Everything else still collapses to the limited model.
    expect(
      resolvefreeportModelForAccessTier(FREEPORT_KIMI_MODEL_ID, 'limited'),
    ).toBe(LIMITED_FREEPORT_MODEL_ID)
  })

  test('the CrofAI GLM 5.2 wire id is fully removed', () => {
    // Retired from the pickers 2026-07-30 and deleted 2026-08-04. The picker
    // retirement was client-side only, so hand-written API callers kept
    // admitting sessions on this id and drawing GLM 5.2 from the free daily
    // PREMIUM pool instead of the earned GLM pool ΓÇö 12-49 distinct accounts a
    // day, five days after it was supposedly unreachable. No shipped client
    // ever bundled it, so deleting it breaks nothing.
    //
    // The invariant this guards: GLM 5.2 must have exactly ONE wire id. The
    // quota pool is chosen by model id, so a second id is a second entitlement.
    expect(FREEPORT_WEB_MODELS.map((model) => model.id)).not.toContain(
      FREEPORT_CROF_GLM_V52_MODEL_ID,
    )
    expect(FREEPORT_WEB_ALL_MODELS.map((model) => model.id)).not.toContain(
      FREEPORT_CROF_GLM_V52_MODEL_ID,
    )
    expect(isfreeportWebModelId(FREEPORT_CROF_GLM_V52_MODEL_ID)).toBe(false)
    expect(isfreeportSessionModelId(FREEPORT_CROF_GLM_V52_MODEL_ID)).toBe(false)
    // Critically: it must not be metered by the free daily premium pool, which
    // is the door this whole removal closes.
    expect(isfreeportWebPremiumModelId(FREEPORT_CROF_GLM_V52_MODEL_ID)).toBe(
      false,
    )
    expect(FREEPORT_STANDARD_MODEL_IDS).not.toContain(
      FREEPORT_CROF_GLM_V52_MODEL_ID,
    )
    // A stale saved selection downgrades to the always-available fallback.
    expect(resolvefreeportWebModel(FREEPORT_CROF_GLM_V52_MODEL_ID)).toBe(
      FALLBACK_FREEPORT_MODEL_ID,
    )
    // The earned route is untouched.
    expect(isfreeportGlmV52ModelId(FREEPORT_GLM_V52_MODEL_ID)).toBe(true)
    expect(isfreeportSessionModelId(FREEPORT_GLM_V52_MODEL_ID)).toBe(true)
  })

  test('GLM 5.2 is never remembered as the default model', () => {
    // GLM runs out long before the rest of the picker, so remembering it would
    // strand a new thread / app / page load on a model that fails admission.
    expect(isfreeportWebRememberableModelId(FREEPORT_GLM_V52_MODEL_ID)).toBe(
      false,
    )
    expect(resolveRememberedfreeportWebModel(FREEPORT_GLM_V52_MODEL_ID)).toBe(
      DEFAULT_FREEPORT_WEB_MODEL_ID,
    )
    // Pro resolves to itself again ΓÇö it is a real catalog row, just not one
    // anything recommends. (It self-healed to the fallback for one day while it
    // was paused.)
    expect(
      resolveRememberedfreeportWebModel(FREEPORT_DEEPSEEK_V4_PRO_MODEL_ID),
    ).toBe(FREEPORT_DEEPSEEK_V4_PRO_MODEL_ID)
    expect(resolveRememberedfreeportWebModel(FREEPORT_KIMI_MODEL_ID)).toBe(
      FALLBACK_FREEPORT_MODEL_ID,
    )
    expect(
      resolveRememberedfreeportWebModel(FREEPORT_KIMI_K3_ECO_MODEL_ID, {
        includeGodOnly: true,
      }),
    ).toBe(FREEPORT_KIMI_K3_ECO_MODEL_ID)
    // A retired/unknown saved id keeps the pre-existing resolution: the
    // always-available fallback, not the premium default.
    expect(resolveRememberedfreeportWebModel('some/retired-model')).toBe(
      FALLBACK_FREEPORT_MODEL_ID,
    )
  })

  test('every Web picker model falls into exactly one quota group', () => {
    // The Web/Cloud picker groups rows by these two predicates (referral GLM,
    // premium) and treats the remainder as Standard. Each group is metered by a
    // different pool, so a model matching both ΓÇö or a premium model matching
    // neither and silently landing in the free Standard group ΓÇö is a quota bug,
    // not a cosmetic one.
    for (const model of FREEPORT_WEB_MODELS) {
      const groups = [
        isfreeportGlmV52ModelId(model.id),
        isfreeportWebPremiumModelId(model.id),
      ].filter(Boolean)
      expect({ id: model.id, groups: groups.length }).toEqual({
        id: model.id,
        // Zero groups means the Standard pool, which is only correct for a
        // model that is not marked premium.
        groups: model.premium ? 1 : 0,
      })
    }
  })

  test('the removed CrofAI GLM 5.2 id is admitted at no access tier', () => {
    for (const tier of ['limited', 'full'] as const) {
      expect(
        isfreeportSessionModelAllowedForAccessTier(
          FREEPORT_CROF_GLM_V52_MODEL_ID,
          tier,
        ),
      ).toBe(false)
    }
    expect(
      isfreeportWebModelAllowedForLimitedTier(FREEPORT_CROF_GLM_V52_MODEL_ID),
    ).toBe(false)
    expect(isfreeportWebGeoExemptModelId(FREEPORT_CROF_GLM_V52_MODEL_ID)).toBe(
      false,
    )
    expect(
      resolvefreeportWebModelForLimitedTier(FREEPORT_CROF_GLM_V52_MODEL_ID),
    ).toBe(LIMITED_FREEPORT_MODEL_ID)
  })

  test('bounty GLM 5.2 survives the Web limited-tier coercion', () => {
    // Regression: this coercion ran BEFORE the quota pool got a say, so a
    // limited-region user who had earned a bounty session had their pick
    // rewritten to the flash model and could never spend the reward. The
    // entitlement gate is the GLM pool (bounty grants only) ΓÇö not this
    // allowlist, which is purely about what the picker may display.
    expect(
      isfreeportWebModelAllowedForLimitedTier(FREEPORT_GLM_V52_MODEL_ID),
    ).toBe(true)
    expect(
      resolvefreeportWebModelForLimitedTier(FREEPORT_GLM_V52_MODEL_ID),
    ).toBe(FREEPORT_GLM_V52_MODEL_ID)

    // The CrofAI GLM route is a paid premium model, NOT the earned one, and
    // must stay coerced away ΓÇö the two ids are easy to confuse.
    expect(
      isfreeportWebModelAllowedForLimitedTier(FREEPORT_CROF_GLM_V52_MODEL_ID),
    ).toBe(false)
  })

  test('Kimi K3 is a god-only FREEPORT Web/Cloud test model', () => {
    // The wire id must keep the `crof/` prefix and the `-eco` build suffix:
    // isCrofModel keys off the exact id, and CrofAI also serves a full
    // `kimi-k3` at twice the price. See kimi-k3-god-only.test.ts.
    expect(FREEPORT_KIMI_K3_ECO_MODEL_ID).toBe('crof/kimi-k3-eco')

    expect(FREEPORT_WEB_GOD_ONLY_MODELS.map((model) => model.id)).toContain(
      FREEPORT_KIMI_K3_ECO_MODEL_ID,
    )
    expect(FREEPORT_WEB_MODELS.map((model) => model.id)).not.toContain(
      FREEPORT_KIMI_K3_ECO_MODEL_ID,
    )
    expect(SUPPORTED_FREEPORT_MODELS.map((model) => model.id)).not.toContain(
      FREEPORT_KIMI_K3_ECO_MODEL_ID,
    )

    expect(isfreeportWebModelId(FREEPORT_KIMI_K3_ECO_MODEL_ID)).toBe(false)
    expect(
      isfreeportWebModelId(FREEPORT_KIMI_K3_ECO_MODEL_ID, {
        includeGodOnly: true,
      }),
    ).toBe(true)
    expect(isfreeportWebGodOnlyModelId(FREEPORT_KIMI_K3_ECO_MODEL_ID)).toBe(
      true,
    )
    expect(isfreeportWebPremiumModelId(FREEPORT_KIMI_K3_ECO_MODEL_ID)).toBe(
      true,
    )
    // Never reachable from the CLI/Desktop picker or a limited-tier browser.
    expect(isfreeportPremiumModelId(FREEPORT_KIMI_K3_ECO_MODEL_ID)).toBe(false)
    expect(isfreeportModelId(FREEPORT_KIMI_K3_ECO_MODEL_ID)).toBe(false)
    expect(
      isfreeportWebModelAllowedForLimitedTier(FREEPORT_KIMI_K3_ECO_MODEL_ID),
    ).toBe(false)

    expect(resolvefreeportWebModel(FREEPORT_KIMI_K3_ECO_MODEL_ID)).toBe(
      FALLBACK_FREEPORT_MODEL_ID,
    )
    expect(
      resolvefreeportWebModel(FREEPORT_KIMI_K3_ECO_MODEL_ID, {
        includeGodOnly: true,
      }),
    ).toBe(FREEPORT_KIMI_K3_ECO_MODEL_ID)

    const model = getfreeportWebModel(FREEPORT_KIMI_K3_ECO_MODEL_ID)
    // 'Kimi K3', not 'Kimi K3 Eco' ΓÇö deliberate, see kimi-k3-god-only.test.ts.
    expect(model.displayName).toBe('Kimi K3')
    expect(model.tagline).toBe('Via CrofAI')
    expect(model.experimental).toBe(true)
    expect(model.multimodal).toBe(false)
    expect(getfreeportModelImageSupport(FREEPORT_KIMI_K3_ECO_MODEL_ID)).toBe(
      false,
    )
  })

  test('Ling 3.0 Flash and Greg 2 are fully removed from FREEPORT', () => {
    // All three were god-only test rows, removed 2026-08-07. Spelled literally
    // because no constant remains to import.
    for (const removedId of [
      'inclusionai/ling-3.0-flash:free',
      'crof/greg-2-ultra',
      'crof/greg-2-super',
    ]) {
      expect(FREEPORT_WEB_ALL_MODELS.map((model) => model.id)).not.toContain(
        removedId,
      )
      expect(
        FREEPORT_WEB_GOD_ONLY_MODELS.map((model) => model.id),
      ).not.toContain(removedId)
      expect(isfreeportWebModelId(removedId, { includeGodOnly: true })).toBe(
        false,
      )
      expect(isfreeportWebGodOnlyModelId(removedId)).toBe(false)
      expect(isfreeportSessionModelId(removedId)).toBe(false)
      // No pool may still meter them, in either direction.
      expect(isfreeportWebPremiumModelId(removedId)).toBe(false)
      expect(FREEPORT_STANDARD_MODEL_IDS).not.toContain(removedId)
      expect(resolvefreeportWebModel(removedId, { includeGodOnly: true })).toBe(
        FALLBACK_FREEPORT_MODEL_ID,
      )
    }
  })

  test('KAT Coder Pro V2 is fully retired from FREEPORT Web and Cloud', () => {
    const retiredKatModelId = 'kwaipilot/kat-coder-pro-v2'
    expect(FREEPORT_WEB_MODELS.map((model) => model.id)).not.toContain(
      retiredKatModelId,
    )
    expect(SUPPORTED_FREEPORT_MODELS.map((model) => model.id)).not.toContain(
      retiredKatModelId,
    )
    expect(isfreeportWebModelId(retiredKatModelId)).toBe(false)
    expect(isfreeportWebPremiumModelId(retiredKatModelId)).toBe(false)
    expect(resolvefreeportWebModel(retiredKatModelId)).toBe(
      FALLBACK_FREEPORT_MODEL_ID,
    )
  })

  test('MiniMax M2.7 support is fully removed', () => {
    const legacyMinimaxM27 = 'minimax/minimax-m2.7'
    expect(SUPPORTED_FREEPORT_MODELS.map((model) => model.id)).not.toContain(
      legacyMinimaxM27,
    )
    expect(isfreeportModelId(legacyMinimaxM27)).toBe(false)
    expect(isSupportedfreeportModelId(legacyMinimaxM27)).toBe(false)
    expect(isfreeportModelAllowedForAccessTier(legacyMinimaxM27, 'full')).toBe(
      false,
    )
    // Old clients with a saved M2.7 selection resolve to the fallback model.
    expect(resolvefreeportModelForAccessTier(legacyMinimaxM27, 'full')).toBe(
      FALLBACK_FREEPORT_MODEL_ID,
    )
  })

  test('MiniMax M3 is selectable and UNLIMITED, on no daily pool at all', () => {
    expect(SUPPORTED_FREEPORT_MODELS.map((model) => model.id)).toContain(
      MINIMAX_M3_MODEL_ID,
    )
    expect(FREEPORT_MODELS.map((model) => model.id)).toContain(
      MINIMAX_M3_MODEL_ID,
    )
    expect(getfreeportModelsForAccessTier('full').map((m) => m.id)).toContain(
      MINIMAX_M3_MODEL_ID,
    )
    expect(isfreeportModelId(MINIMAX_M3_MODEL_ID)).toBe(true)
    expect(isSupportedfreeportModelId(MINIMAX_M3_MODEL_ID)).toBe(true)
    // Un-premiumed on 2026-08-20, so the premium pool is spent on the DeepSeek
    // rows and Luna rather than on the cheapest one. Both must agree ΓÇö a row
    // dropped from the id list while still flagged `premium` is metered by NO
    // pool (FREEPORT_WEB_STANDARD_MODEL_IDS filters on `!premium`).
    expect(isfreeportPremiumModelId(MINIMAX_M3_MODEL_ID)).toBe(false)
    expect(isfreeportWebPremiumModelId(MINIMAX_M3_MODEL_ID)).toBe(false)
    expect(
      FREEPORT_MODELS.find((m) => m.id === MINIMAX_M3_MODEL_ID)?.premium,
    ).toBe(false)
    expect(
      isfreeportModelAllowedForAccessTier(MINIMAX_M3_MODEL_ID, 'full'),
    ).toBe(true)
    // Flash leads again as of 2026-08-20: the one-a-day ceiling narrowed to V4
    // Pro, so the recommended row is no longer the capped one.
    expect(FREEPORT_MODELS[0]!.id).toBe(FREEPORT_DEEPSEEK_V4_FLASH_MODEL_ID)
    expect(FREEPORT_MODELS[1]!.id).toBe(FREEPORT_GPT_5_6_LUNA_MODEL_ID)
    expect(FREEPORT_MODELS[2]!.id).toBe(MINIMAX_M3_MODEL_ID)
  })

  test('the recommended default leads FREEPORT_MODELS, and the fallback is in it', () => {
    // FREEPORT_MODELS order IS the picker row order, and it went stale once
    // when the default flipped without reordering ΓÇö the rows led with Flash
    // while the recommendation already named Pro. Pin the lead position to the
    // constant that drives the recommendation, so a future default change
    // can't silently leave this list behind.
    expect(FREEPORT_MODELS[0]!.id).toBe(DEFAULT_FREEPORT_MODEL_ID)
    // And the model every surface steps DOWN to has to be a row the picker
    // actually offers, or the step-down lands on something the user cannot see
    // or re-select afterwards.
    expect(FREEPORT_MODELS.map((model) => model.id)).toContain(
      FALLBACK_FREEPORT_MODEL_ID,
    )
  })

  test('GPT-5.6 Luna is a premium model on every full-access surface', () => {
    // The wire id must stay OpenRouter's own slug: getChatCompletionsProvider
    // has no Luna branch, so it only reaches OpenRouter by falling through to
    // the default route with the slug intact.
    expect(FREEPORT_GPT_5_6_LUNA_MODEL_ID).toBe('openai/gpt-5.6-luna')

    // CLI/Desktop picker, Web/Cloud picker, and the session/chat layers.
    expect(FREEPORT_MODELS.map((model) => model.id)).toContain(
      FREEPORT_GPT_5_6_LUNA_MODEL_ID,
    )
    expect(SUPPORTED_FREEPORT_MODELS.map((model) => model.id)).toContain(
      FREEPORT_GPT_5_6_LUNA_MODEL_ID,
    )
    expect(FREEPORT_WEB_MODELS.map((model) => model.id)).toContain(
      FREEPORT_GPT_5_6_LUNA_MODEL_ID,
    )
    expect(getfreeportModelsForAccessTier('full').map((m) => m.id)).toContain(
      FREEPORT_GPT_5_6_LUNA_MODEL_ID,
    )
    // Everyone on the tier can pick it ΓÇö it is not god-only and not retired.
    expect(isfreeportWebGodOnlyModelId(FREEPORT_GPT_5_6_LUNA_MODEL_ID)).toBe(
      false,
    )
    expect(isfreeportWebSelectableModelId(FREEPORT_GPT_5_6_LUNA_MODEL_ID)).toBe(
      true,
    )

    // Metered by the SHARED daily premium pool on every surface, not a pool of
    // its own and never the free standard browser pool.
    expect(isfreeportPremiumModelId(FREEPORT_GPT_5_6_LUNA_MODEL_ID)).toBe(true)
    expect(isfreeportWebPremiumModelId(FREEPORT_GPT_5_6_LUNA_MODEL_ID)).toBe(
      true,
    )
    expect(FREEPORT_STANDARD_MODEL_IDS).not.toContain(
      FREEPORT_GPT_5_6_LUNA_MODEL_ID,
    )
    expect(isfreeportGlmV52ModelId(FREEPORT_GPT_5_6_LUNA_MODEL_ID)).toBe(false)
    // Dated snapshots can't dodge the premium quota or the pinned routing.
    expect(
      isfreeportPremiumModelId(`${FREEPORT_GPT_5_6_LUNA_MODEL_ID}-20260709`),
    ).toBe(true)
    expect(
      isfreeportGpt56LunaModelId(`${FREEPORT_GPT_5_6_LUNA_MODEL_ID}-20260709`),
    ).toBe(true)
    expect(isfreeportGpt56LunaModelId(FREEPORT_MIMO_V25_MODEL_ID)).toBe(false)

    const model = getfreeportWebModel(FREEPORT_GPT_5_6_LUNA_MODEL_ID)
    expect(model.displayName).toBe('GPT-5.6 Luna')
    // OpenAI's API does not train on request data, so no warning and no
    // trace storage ΓÇö and it accepts images.
    expect(model.dataUse).toBe('service')
    expect(model.warning).toBeUndefined()
    expect(isfreeportTracedModelId(FREEPORT_GPT_5_6_LUNA_MODEL_ID)).toBe(false)
    expect(getfreeportModelImageSupport(FREEPORT_GPT_5_6_LUNA_MODEL_ID)).toBe(
      true,
    )
    // Cheap per token, so it is not one of the muted "costly premium" rows.
    expect(
      isfreeportWebDeemphasizedModelId(FREEPORT_GPT_5_6_LUNA_MODEL_ID),
    ).toBe(false)

    // Limited regions stay geo-gated to the two limited-tier models.
    expect(
      isfreeportWebModelAllowedForLimitedTier(FREEPORT_GPT_5_6_LUNA_MODEL_ID),
    ).toBe(false)
    expect(
      isfreeportModelAllowedForAccessTier(
        FREEPORT_GPT_5_6_LUNA_MODEL_ID,
        'limited',
      ),
    ).toBe(false)
  })

  test('GPT-5.6 Luna carries its pinned OpenAI route, price ceiling, and effort', () => {
    // These three constants are the contract web/src/llm-api/openrouter.ts
    // enforces on every Luna request.
    expect(FREEPORT_GPT_5_6_LUNA_PROVIDER_ROUTE).toBe('openai')
    expect(FREEPORT_GPT_5_6_LUNA_REASONING_EFFORT).toBe('high')

    // The ceiling is a cost fence, and both bounds are load-bearing. OpenRouter
    // compares strictly, so a ceiling AT OpenAI's $0.10/$0.60 list price 404s
    // every request ("No endpoints found that satisfy the max price") ΓÇö that
    // shipped on 2026-07-30 and took Luna down until it was raised. It must
    // also stay well under the $1.00/$6.00 Azure/Bedrock charge, which is the
    // 10x route the fence exists to block.
    const { prompt, completion } = FREEPORT_GPT_5_6_LUNA_MAX_PRICE
    expect(prompt).toBeGreaterThan(0.1)
    expect(completion).toBeGreaterThan(0.6)
    expect(prompt).toBeLessThan(1.0)
    expect(completion).toBeLessThan(6.0)
  })

  test('limited access exposes non-Pro MiMo 2.5, and not the paused Flash', () => {
    expect(LIMITED_FREEPORT_MODEL_ID).toBe(FREEPORT_MIMO_V25_MODEL_ID)
    expect(LIMITED_FREEPORT_MODEL_IDS).toEqual([FREEPORT_MIMO_V25_MODEL_ID])
    expect(getfreeportModelsForAccessTier('limited').map((m) => m.id)).toEqual([
      FREEPORT_MIMO_V25_MODEL_ID,
    ])
    expect(
      isfreeportModelAllowedForAccessTier(
        FREEPORT_DEEPSEEK_V4_FLASH_MODEL_ID,
        'limited',
      ),
    ).toBe(false)
    expect(
      isfreeportModelAllowedForAccessTier(MINIMAX_M3_MODEL_ID, 'limited'),
    ).toBe(false)
    expect(
      isfreeportModelAllowedForAccessTier(
        FREEPORT_MIMO_V25_MODEL_ID,
        'limited',
      ),
    ).toBe(true)
    expect(
      isfreeportModelAllowedForAccessTier(
        FREEPORT_MIMO_V25_PRO_MODEL_ID,
        'limited',
      ),
    ).toBe(false)
    expect(
      resolvefreeportModelForAccessTier(FREEPORT_MIMO_V25_MODEL_ID, 'limited'),
    ).toBe(FREEPORT_MIMO_V25_MODEL_ID)
    expect(
      resolvefreeportModelForAccessTier(MINIMAX_M3_MODEL_ID, 'limited'),
    ).toBe(FREEPORT_MIMO_V25_MODEL_ID)
    // A Flash pick saved before the pause is coerced rather than refused, so a
    // returning limited user lands on a model instead of a failed admission.
    expect(
      resolvefreeportModelForAccessTier(
        FREEPORT_DEEPSEEK_V4_FLASH_MODEL_ID,
        'limited',
      ),
    ).toBe(FREEPORT_MIMO_V25_MODEL_ID)
    // MiMo is superseded BY the paused Flash and is the tier's only row, so no
    // picker may offer that switch ΓÇö it would coerce straight back.
    expect(
      getfreeportModelSupersededBy(FREEPORT_MIMO_V25_MODEL_ID, [
        ...LIMITED_FREEPORT_MODEL_IDS,
      ]),
    ).toBeUndefined()
  })

  test('recommends a joinable, in-tier model for the picker hero', () => {
    // Full access ΓåÆ DeepSeek V4 Flash 07/31 (the recommended default since
    // 2026-08-18). It is premium NOW, which it was not the last time it led, so
    // the hero HAS to flip once the daily pool runs dry ΓÇö the assertions below
    // are what keep the CLI/Desktop hero joinable at every point in a user's
    // day, and they became load-bearing for this model on that date.
    expect(getRecommendedfreeportModelId('full')).toBe(
      FREEPORT_DEEPSEEK_V4_FLASH_MODEL_ID,
    )
    expect(getRecommendedfreeportModelId(undefined)).toBe(
      FREEPORT_DEEPSEEK_V4_FLASH_MODEL_ID,
    )
    expect(
      getRecommendedfreeportModelId('full', { premiumExhausted: true }),
    ).toBe(FALLBACK_FREEPORT_MODEL_ID)
    expect(
      isfreeportPremiumModelId(
        getRecommendedfreeportModelId('full', { premiumExhausted: true }),
      ),
    ).toBe(false)
    // Limited access ΓåÆ MiMo 2.5. The membership assertion below is the
    // load-bearing one: the hero is the row Enter lands on, so a hero outside
    // the tier's own set is a first keypress that fails admission.
    expect(getRecommendedfreeportModelId('limited')).toBe(
      FREEPORT_MIMO_V25_MODEL_ID,
    )
    expect(
      getfreeportModelsForAccessTier('limited').some(
        (m) => m.id === getRecommendedfreeportModelId('limited'),
      ),
    ).toBe(true)
    // Still true with the premium pool spent: that flag steps the FULL-access
    // hero down to Flash, and must not drag the limited hero onto it.
    expect(
      getRecommendedfreeportModelId('limited', { premiumExhausted: true }),
    ).toBe(FREEPORT_MIMO_V25_MODEL_ID)
  })

  test('every surface recommends DeepSeek V4 Flash, on two separate constants', () => {
    // Both constants named Pro from 2026-08-12 until it was paused on
    // 2026-08-18, and both fell back to Flash together. They stay TWO constants
    // because they have diverged before and may again.
    expect(DEFAULT_FREEPORT_WEB_MODEL_ID).toBe(
      FREEPORT_DEEPSEEK_V4_FLASH_MODEL_ID,
    )
    expect(DEFAULT_FREEPORT_MODEL_ID).toBe(FREEPORT_DEEPSEEK_V4_FLASH_MODEL_ID)
    expect(getRecommendedfreeportWebModelId('full')).toBe(
      FREEPORT_DEEPSEEK_V4_FLASH_MODEL_ID,
    )
    expect(getRecommendedfreeportWebModelId(undefined)).toBe(
      FREEPORT_DEEPSEEK_V4_FLASH_MODEL_ID,
    )
    // Neither default may be a paused model ΓÇö that is the pairing that would
    // put every new user on a row the server refuses.
    expect(isfreeportPausedFreeModelId(DEFAULT_FREEPORT_MODEL_ID)).toBe(false)
    expect(isfreeportPausedFreeModelId(DEFAULT_FREEPORT_WEB_MODEL_ID)).toBe(
      false,
    )
    // The recommendation must never be a model the picker also argues against.
    expect(
      getfreeportModelSupersededBy(
        DEFAULT_FREEPORT_WEB_MODEL_ID,
        FREEPORT_WEB_MODELS.map((model) => model.id),
      ),
    ).toBeUndefined()
    // Pro is premium, so the pool CAN run dry ΓÇö the recommended pick has to
    // stay joinable, and limited tier can't name it at all. Asserted through
    // the tier constant so the hero and the catalog cannot part company.
    expect(getRecommendedfreeportWebModelId('limited')).toBe(
      LIMITED_FREEPORT_MODEL_ID,
    )
    // Steps down to the fallback, which is MiMo 2.5 now that Flash is itself
    // premium ΓÇö the whole point of the two constants being separate.
    expect(
      getRecommendedfreeportWebModelId('full', { premiumExhausted: true }),
    ).toBe(FALLBACK_FREEPORT_MODEL_ID)
    expect(
      isfreeportPremiumModelId(
        getRecommendedfreeportWebModelId('full', { premiumExhausted: true }),
      ),
    ).toBe(false)
    // The web default must be a real, selectable web model.
    expect(isfreeportWebModelId(DEFAULT_FREEPORT_WEB_MODEL_ID)).toBe(true)
    // ΓÇªand one the limited tier is coerced OFF of, since it is premium.
    expect(
      isfreeportWebModelAllowedForLimitedTier(DEFAULT_FREEPORT_WEB_MODEL_ID),
    ).toBe(false)
  })

  test('de-emphasizes nothing, and never the default', () => {
    // The list is empty as of 2026-08-12. MiniMax M3 was the last entry and
    // left when it became the ONLY muted row: the compact treatment folds the
    // tagline onto the name line, which among full-size rows reads as a broken
    // row rather than a quiet one. M3 keeps its supersededBy notice, so the
    // steering survives ΓÇö see the test below.
    expect(FREEPORT_WEB_DEEMPHASIZED_MODEL_IDS).toEqual([])
    expect(isfreeportWebDeemphasizedModelId(MINIMAX_M3_MODEL_ID)).toBe(false)
    expect(
      isfreeportWebDeemphasizedModelId(`${FREEPORT_KIMI_MODEL_ID}-20260301`),
    ).toBe(false)
    expect(
      isfreeportWebDeemphasizedModelId(DEFAULT_FREEPORT_WEB_MODEL_ID),
    ).toBe(false)
    expect(
      isfreeportWebDeemphasizedModelId(FREEPORT_DEEPSEEK_V4_FLASH_MODEL_ID),
    ).toBe(false)
    expect(isfreeportWebDeemphasizedModelId(null)).toBe(false)
    // V4 Pro left the list on 2026-08-12 too: its 08/13 GA build wins the
    // quality half of the de-emphasis test again, and price alone is not
    // grounds.
    expect(
      isfreeportWebDeemphasizedModelId(FREEPORT_DEEPSEEK_V4_PRO_MODEL_ID),
    ).toBe(false)
    // De-emphasis is presentation only: anything added back stays selectable.
    for (const id of FREEPORT_WEB_DEEMPHASIZED_MODEL_IDS) {
      expect(isfreeportWebModelId(id)).toBe(true)
      expect(isfreeportModelAllowedForAccessTier(id, 'full')).toBe(true)
    }
  })

  test('points users off MiniMax M3 to V4 Flash', () => {
    // Flash-0731 overtook M3 on 2026-07-31, so M3 carries a notice and a switch
    // target rather than being removed ΓÇö it is still selectable.
    const all = FREEPORT_MODELS.map((model) => model.id)
    const superseded = getfreeportModelSupersededBy(MINIMAX_M3_MODEL_ID, all)
    expect(superseded?.modelId).toBe(FREEPORT_DEEPSEEK_V4_FLASH_MODEL_ID)
    expect(superseded!.notice.length).toBeGreaterThan(0)
    expect(superseded!.actionLabel.length).toBeGreaterThan(0)
    // M3 remains a real, selectable model ΓÇö this is a nudge, not a retirement.
    expect(all).toContain(MINIMAX_M3_MODEL_ID)
    // The recommended default is never itself marked superseded.
    expect(
      getfreeportModelSupersededBy(DEFAULT_FREEPORT_MODEL_ID, all),
    ).toBeUndefined()
  })

  test('does not steer users off GPT-5.6 Luna, which is now the recommendation', () => {
    // Luna pointed at Flash until 2026-08-19. It cannot any more: a model
    // cannot both BE the recommended default and carry a one-click switch away
    // from itself, and migrateSupersededfreeportModelPreference would have
    // rewritten every saved Luna pick onto a DeepSeek row metered one a day.
    const all = FREEPORT_MODELS.map((model) => model.id)
    expect(
      getfreeportModelSupersededBy(FREEPORT_GPT_5_6_LUNA_MODEL_ID, all),
    ).toBeUndefined()
    expect(
      migrateSupersededfreeportModelPreference(
        FREEPORT_GPT_5_6_LUNA_MODEL_ID,
        all,
      ),
    ).toBeNull()
    expect(all).toContain(FREEPORT_GPT_5_6_LUNA_MODEL_ID)
    expect(
      isfreeportWebDeemphasizedModelId(FREEPORT_GPT_5_6_LUNA_MODEL_ID),
    ).toBe(false)
  })

  test('never steers a saved pick toward a paused model', () => {
    // The picker offers a one-click switch for whatever a supersedes notice
    // names, and migrateSupersededfreeportModelPreference moves stored picks
    // there without asking. Either pointing at a paused model would hand users
    // a row the server refuses, so no live row may name one.
    const all = FREEPORT_MODELS.map((model) => model.id)
    for (const id of all) {
      const superseded = getfreeportModelSupersededBy(id, all)
      if (!superseded) continue
      expect(isfreeportPausedFreeModelId(superseded.modelId)).toBe(false)
      expect(all).toContain(superseded.modelId)
    }
  })

  test('marks both new DeepSeek builds as NEW and dates their names', () => {
    // The wire ids are undated and auto-update, so the display has to carry the
    // signal that this is a different model than the one users already judged.
    // Pro left this list when it was paused on 2026-08-18 ΓÇö it is no longer in
    // FREEPORT_MODELS at all, and its row keeps its dated name in SUPPORTED for
    // whenever it returns.
    const dated = [[FREEPORT_DEEPSEEK_V4_FLASH_MODEL_ID, '07/31']] as const
    // Widened to the interface: the const-asserted tuple's union type only
    // exposes optional fields set on EVERY member, so `isNew` is unreachable
    // through it unless the find() narrows to a single literal id.
    const catalog: readonly freeportModelOption[] = FREEPORT_MODELS
    for (const [id, date] of dated) {
      const model = catalog.find((candidate) => candidate.id === id)!
      expect(model.isNew).toBe(true)
      expect(model.displayName).toContain(date)
    }
    // Nothing else claims to be new, or the badge stops meaning anything.
    expect(catalog.filter((model) => model.isNew)).toHaveLength(dated.length)
  })

  test('steers saved picks off every superseded model', () => {
    const all = FREEPORT_MODELS.map((model) => model.id)
    // Every model Flash overtook migrates to it...
    expect(
      migrateSupersededfreeportModelPreference(MINIMAX_M3_MODEL_ID, all),
    ).toBe(FREEPORT_DEEPSEEK_V4_FLASH_MODEL_ID)
    // ...and a current pick is left alone (null = keep it).
    for (const current of [
      FREEPORT_DEEPSEEK_V4_FLASH_MODEL_ID,
      // MiMo 2.5 stopped being superseded on 2026-08-18. This migration
      // REWRITES a stored pick on every load, so while MiMo is the only
      // unlimited row the old pointer moved users who deliberately chose it
      // onto the premium model, silently, at each launch.
      FREEPORT_MIMO_V25_MODEL_ID,
    ]) {
      expect(migrateSupersededfreeportModelPreference(current, all)).toBeNull()
    }
    // The unlimited fallback must NEVER be migrated away from: it is where
    // every surface steps a spent user down to.
    expect(
      migrateSupersededfreeportModelPreference(FALLBACK_FREEPORT_MODEL_ID, all),
    ).toBeNull()
    expect(migrateSupersededfreeportModelPreference(undefined, all)).toBeNull()
    // Never migrates onto a model this surface cannot select.
    expect(
      migrateSupersededfreeportModelPreference(MINIMAX_M3_MODEL_ID, [
        MINIMAX_M3_MODEL_ID,
      ]),
    ).toBeNull()
  })

  test('never de-emphasizes a model we still recommend', () => {
    // Muting + sorting-last is how the Premium group steers to the
    // replacement, so anything muted must be superseded. NOT the converse:
    // MiMo 2.5 is superseded on quality but costs the same as Flash, and
    // de-emphasis is defined as a cost signal ΓÇö muting it would make the list
    // say something untrue about its price.
    const all = FREEPORT_MODELS.map((model) => model.id)
    for (const model of FREEPORT_MODELS) {
      if (isfreeportWebDeemphasizedModelId(model.id)) {
        expect(getfreeportModelSupersededBy(model.id, all)).toBeDefined()
      }
    }
    // The recommended default is never muted or superseded.
    expect(isfreeportWebDeemphasizedModelId(DEFAULT_FREEPORT_MODEL_ID)).toBe(
      false,
    )
    expect(
      getfreeportModelSupersededBy(DEFAULT_FREEPORT_MODEL_ID, all),
    ).toBeUndefined()
  })

  test('never offers a switch to a model the surface cannot select', () => {
    // A picker that lacks the replacement must show no switch at all, rather
    // than a button that resolves to nothing.
    expect(
      getfreeportModelSupersededBy(FREEPORT_DEEPSEEK_V4_PRO_MODEL_ID, [
        FREEPORT_DEEPSEEK_V4_PRO_MODEL_ID,
      ]),
    ).toBeUndefined()
    expect(getfreeportModelSupersededBy(undefined, [])).toBeUndefined()
    expect(getfreeportModelSupersededBy('vendor/unknown', [])).toBeUndefined()
  })

  test('full-access FREEPORT models can spawn the gemini-thinker subagent', () => {
    // Full-access models (non-limited, non-fastest) get the thinker. Kimi is
    // gone from FREEPORT entirely, so it no longer qualifies.
    expect(canfreeportModelSpawnGeminiThinker(FREEPORT_KIMI_MODEL_ID)).toBe(
      false,
    )
    expect(
      canfreeportModelSpawnGeminiThinker(FREEPORT_DEEPSEEK_V4_PRO_MODEL_ID),
    ).toBe(true)
    // MiMo 2.5 Pro is gone from FREEPORT, so it no longer qualifies either.
    expect(
      canfreeportModelSpawnGeminiThinker(FREEPORT_MIMO_V25_PRO_MODEL_ID),
    ).toBe(false)
    expect(canfreeportModelSpawnGeminiThinker(MINIMAX_M3_MODEL_ID)).toBe(true)
    expect(
      canfreeportModelSpawnGeminiThinker(FREEPORT_GPT_5_6_LUNA_MODEL_ID),
    ).toBe(true)

    // Limited-tier models (DeepSeek V4 Flash, MiMo 2.5) skip it.
    expect(
      canfreeportModelSpawnGeminiThinker(FREEPORT_DEEPSEEK_V4_FLASH_MODEL_ID),
    ).toBe(false)
    expect(canfreeportModelSpawnGeminiThinker(FREEPORT_MIMO_V25_MODEL_ID)).toBe(
      false,
    )
  })

  test('does not support GLM 5.1 for FREEPORT sessions', () => {
    const glm = 'z-ai/glm-5.1'
    expect(FREEPORT_MODELS.map((model) => model.id)).not.toContain(glm)
    expect(SUPPORTED_FREEPORT_MODELS.map((model) => model.id)).not.toContain(
      glm,
    )
    expect(isfreeportModelId(glm)).toBe(false)
    expect(isSupportedfreeportModelId(glm)).toBe(false)
  })

  test('surfaces referral-gated GLM 5.2 only in the Web and Cloud picker', () => {
    expect(FREEPORT_WEB_MODELS.map((model) => model.id)).toContain(
      FREEPORT_GLM_V52_MODEL_ID,
    )
    expect(SUPPORTED_FREEPORT_MODELS.map((model) => model.id)).toContain(
      FREEPORT_GLM_V52_MODEL_ID,
    )
    expect(FREEPORT_MODELS.map((model) => model.id)).not.toContain(
      FREEPORT_GLM_V52_MODEL_ID,
    )
    expect(isfreeportWebPremiumModelId(FREEPORT_GLM_V52_MODEL_ID)).toBe(false)
  })

  test('formats the close time in the user local timezone while deployment is open', () => {
    expect(
      getfreeportDeploymentAvailabilityLabel(new Date('2026-01-05T18:00:00Z'), {
        locale: 'en-US',
        timeZone: 'America/Los_Angeles',
      }),
    ).toBe('until 5:00 PM')
  })

  test('formats the next open time in the user local timezone while deployment is closed', () => {
    expect(
      getfreeportDeploymentAvailabilityLabel(new Date('2026-01-05T12:00:00Z'), {
        locale: 'en-US',
        timeZone: 'America/Los_Angeles',
      }),
    ).toBe('opens 6:00 AM')
  })

  test('includes the weekday when the next opening is on a later local day', () => {
    expect(
      getfreeportDeploymentAvailabilityLabel(new Date('2026-01-11T03:00:00Z'), {
        locale: 'en-US',
        timeZone: 'America/Los_Angeles',
      }),
    ).toBe('opens Sun 6:00 AM')
  })

  test('tracks deployment hours correctly across the open and close boundaries', () => {
    expect(isfreeportDeploymentHours(new Date('2026-01-05T13:59:00Z'))).toBe(
      false,
    )
    expect(isfreeportDeploymentHours(new Date('2026-01-05T14:00:00Z'))).toBe(
      true,
    )
    expect(isfreeportDeploymentHours(new Date('2026-01-06T00:59:00Z'))).toBe(
      true,
    )
    expect(isfreeportDeploymentHours(new Date('2026-01-06T01:00:00Z'))).toBe(
      false,
    )
    expect(isfreeportDeploymentHours(new Date('2026-01-10T20:00:00Z'))).toBe(
      true,
    )
  })
})

describe('limited-offer models (Claude Fable 5)', () => {
  test('is deliberately absent from every client picker catalog', () => {
    // The whole mechanism rests on this: no client may render Fable from its
    // own catalog, because only the server knows whether the wave still has
    // sessions. A client that has never been told about the offer must look
    // exactly like it does today.
    expect(FREEPORT_MODELS.map((m) => m.id)).not.toContain(
      FREEPORT_FABLE_5_MODEL_ID,
    )
    expect(isfreeportModelId(FREEPORT_FABLE_5_MODEL_ID)).toBe(false)
    expect(FREEPORT_WEB_ALL_MODELS.map((m) => m.id)).not.toContain(
      FREEPORT_FABLE_5_MODEL_ID,
    )
    expect(
      getfreeportModelsForAccessTier('full').map((m) => m.id),
    ).not.toContain(FREEPORT_FABLE_5_MODEL_ID)
  })

  test('is still a model the session and chat layers accept', () => {
    // Same shape as referral GLM: out of the picker catalog, in the supported
    // catalog, so admission, the chat gate and the display-name lookup all
    // resolve it.
    expect(isSupportedfreeportModelId(FREEPORT_FABLE_5_MODEL_ID)).toBe(true)
    expect(
      isfreeportSessionModelAllowedForAccessTier(
        FREEPORT_FABLE_5_MODEL_ID,
        'full',
      ),
    ).toBe(true)
    expect(getfreeportModel(FREEPORT_FABLE_5_MODEL_ID).displayName).toBe(
      'Claude Fable 5',
    )
  })

  test('an explicit pick survives resolution instead of silently downgrading', () => {
    // resolvefreeportModelForAccessTier runs on every explicit CLI pick. Before
    // the offer models were passed through, pressing Enter on the Fable row
    // would have started a DeepSeek session with no explanation.
    expect(
      resolvefreeportModelForAccessTier(FREEPORT_FABLE_5_MODEL_ID, 'full'),
    ).toBe(FREEPORT_FABLE_5_MODEL_ID)
  })

  test('limited-region users cannot reach it', () => {
    expect(
      isfreeportSessionModelAllowedForAccessTier(
        FREEPORT_FABLE_5_MODEL_ID,
        'limited',
      ),
    ).toBe(false)
    expect(
      resolvefreeportSessionModelForAccessTier(
        FREEPORT_FABLE_5_MODEL_ID,
        'limited',
      ),
    ).toBe(LIMITED_FREEPORT_MODEL_ID)
  })

  test('traces are collected, which is the point of running the wave at all', () => {
    expect(isfreeportTracedModelId(FREEPORT_FABLE_5_MODEL_ID)).toBe(true)
    const fable = SUPPORTED_FREEPORT_MODELS.find(
      (m) => m.id === FREEPORT_FABLE_5_MODEL_ID,
    )
    expect((fable as { warning?: string } | undefined)?.warning).toBe(
      'May use data for AI training',
    )
  })

  test('is metered by its own pool, never the shared daily premium one', () => {
    // It is marked `premium: true` for styling and to keep it out of the free
    // Standard pool, but joining FREEPORT_PREMIUM_MODEL_IDS would put trial
    // sessions on the quota M3 and DeepSeek Pro share.
    expect(isfreeportPremiumModelId(FREEPORT_FABLE_5_MODEL_ID)).toBe(false)
    expect(isfreeportWebPremiumModelId(FREEPORT_FABLE_5_MODEL_ID)).toBe(false)
    expect(FREEPORT_STANDARD_MODEL_IDS).not.toContain(FREEPORT_FABLE_5_MODEL_ID)
    expect(isfreeportLimitedOfferModelId(FREEPORT_FABLE_5_MODEL_ID)).toBe(true)
  })

  test('the offer predicate tolerates dated provider snapshots', () => {
    expect(
      isfreeportLimitedOfferModelId(`${FREEPORT_FABLE_5_MODEL_ID}-20260815`),
    ).toBe(true)
    expect(
      isfreeportLimitedOfferModelId(FREEPORT_DEEPSEEK_V4_FLASH_MODEL_ID),
    ).toBe(false)
    expect(isfreeportLimitedOfferModelId(null)).toBe(false)
  })
})

describe('Meta Muse Spark 1.2 Contributor', () => {
  test('is a FREEPORT Web model and reachable from no other surface', () => {
    // Web-only is enforced by ABSENCE from the CLI/Desktop catalogs, which is
    // also what makes the session layer refuse it there
    // (isfreeportSessionModelId reads SUPPORTED_FREEPORT_MODELS). The reason is
    // the queue, not the price: the browser can render a rate-limit wait with
    // an ETA and the CLI cannot, so on the CLI a 60-RPM team-wide ceiling would
    // just be unexplained 429s.
    expect(FREEPORT_WEB_MODELS.map((model) => model.id)).toContain(
      FREEPORT_MUSE_SPARK_12_CONTRIBUTOR_MODEL_ID,
    )
    expect(FREEPORT_MODELS.map((model) => model.id)).not.toContain(
      FREEPORT_MUSE_SPARK_12_CONTRIBUTOR_MODEL_ID,
    )
    expect(SUPPORTED_FREEPORT_MODELS.map((model) => model.id)).not.toContain(
      FREEPORT_MUSE_SPARK_12_CONTRIBUTOR_MODEL_ID,
    )
    // Absence from SUPPORTED_ is the Desktop gate, not just tidiness:
    // isModelForHarness('codebuff', ΓÇª) validates against exactly this set, so a
    // Desktop client asking for Muse Spark is refused before session admission
    // ever sees it.
    expect(
      isSupportedfreeportModelId(FREEPORT_MUSE_SPARK_12_CONTRIBUTOR_MODEL_ID),
    ).toBe(false)
    // Session admission DOES accept it ΓÇö it must, or no Web session could run
    // on it. The shared gate is the union of the CLI and Web catalogs, so
    // "Web-only" is enforced by the catalogs above plus the free-mode agent
    // allowlist (only base2-free-muse-spark may run this model, and only the
    // Web bundle ships that root), never by this predicate.
    expect(
      isfreeportSessionModelId(FREEPORT_MUSE_SPARK_12_CONTRIBUTOR_MODEL_ID),
    ).toBe(true)

    // Visible to every full-access Web user, not god-gated and not retired.
    expect(
      isfreeportWebModelId(FREEPORT_MUSE_SPARK_12_CONTRIBUTOR_MODEL_ID),
    ).toBe(true)
    expect(
      isfreeportWebGodOnlyModelId(FREEPORT_MUSE_SPARK_12_CONTRIBUTOR_MODEL_ID),
    ).toBe(false)
    expect(
      isfreeportWebSelectableModelId(
        FREEPORT_MUSE_SPARK_12_CONTRIBUTOR_MODEL_ID,
      ),
    ).toBe(true)
  })

  test('is metered by the Web premium pool and no other', () => {
    // Premium here bounds how many users are inside the 60 RPM ceiling at once
    // ΓÇö it is NOT a price signal, since Contributor is cheaper per token than
    // the standard-pool models. Being in some pool is mandatory:
    // FREEPORT_STANDARD_MODEL_IDS is derived by filtering `!premium`, so a
    // premium model missing from the premium list is metered by nothing.
    expect(
      isfreeportWebPremiumModelId(FREEPORT_MUSE_SPARK_12_CONTRIBUTOR_MODEL_ID),
    ).toBe(true)
    expect(FREEPORT_STANDARD_MODEL_IDS).not.toContain(
      FREEPORT_MUSE_SPARK_12_CONTRIBUTOR_MODEL_ID,
    )
    expect(
      isfreeportGlmV52ModelId(FREEPORT_MUSE_SPARK_12_CONTRIBUTOR_MODEL_ID),
    ).toBe(false)
    // The CLI's own premium pool must not learn about a model the CLI cannot
    // select.
    expect(
      isfreeportPremiumModelId(FREEPORT_MUSE_SPARK_12_CONTRIBUTOR_MODEL_ID),
    ).toBe(false)
  })

  test('carries a reasoning effort that the server can actually resolve', () => {
    // Two halves, and the second is the one that used to silently fail.
    // getfreeportModelReasoningEffort read SUPPORTED_FREEPORT_MODELS alone ΓÇö
    // the CLI/Desktop catalog ΓÇö which Muse Spark is deliberately absent from
    // (that absence IS the Desktop gate). So the field could be set on the row
    // and resolve to null anyway, with nothing to indicate why.
    const model = getfreeportWebModel(
      FREEPORT_MUSE_SPARK_12_CONTRIBUTOR_MODEL_ID,
    )
    expect(model.reasoningEffort).toBe(FREEPORT_MUSE_SPARK_REASONING_EFFORT)
    expect(
      getfreeportModelReasoningEffort(
        FREEPORT_MUSE_SPARK_12_CONTRIBUTOR_MODEL_ID,
      ),
    ).toBe(FREEPORT_MUSE_SPARK_REASONING_EFFORT)

    // Never 'none': Muse Spark answers that with a hard 400 (verified live),
    // and a 400 is neither retried nor queued, so it kills the turn outright.
    expect(FREEPORT_MUSE_SPARK_REASONING_EFFORT).not.toBe('none')
    // Meta's ladder, from its own 400 on an unknown value. `xhigh` and
    // `minimal` exist here and nowhere else in this repo, which is why the
    // shared agent-definition enum deliberately does not carry them.
    expect(['minimal', 'low', 'medium', 'high', 'xhigh']).toContain(
      FREEPORT_MUSE_SPARK_REASONING_EFFORT,
    )

    // Suffix-tolerant like every other id helper, so a dated provider snapshot
    // does not silently drop back to Meta's default effort.
    expect(
      getfreeportModelReasoningEffort(
        `${FREEPORT_MUSE_SPARK_12_CONTRIBUTOR_MODEL_ID}-20260901`,
      ),
    ).toBe(FREEPORT_MUSE_SPARK_REASONING_EFFORT)

    // Widening the lookup to the Web catalog must not invent an effort for
    // models that declare none.
    expect(
      getfreeportModelReasoningEffort(FREEPORT_KIMI_K3_ECO_MODEL_ID),
    ).toBeNull()
  })

  test('discloses the Contributor tier training terms', () => {
    // The discount IS the training grant, so the warning is the disclosure that
    // makes the row legitimate rather than decoration.
    const model = getfreeportWebModel(
      FREEPORT_MUSE_SPARK_12_CONTRIBUTOR_MODEL_ID,
    )
    expect(model.displayName).toBe('Muse Spark 1.2')
    expect(model.dataUse).toBe('training')
    expect(model.warning).toBe('May use data for AI training')
  })

  test('has exactly one wire id, and the predicate tolerates dated snapshots', () => {
    // The queue, the premium pool and the free-mode agent allowlist all key off
    // this id. A second id reaching the same upstream is how `crof/glm-5.2`
    // handed out a metered model for free; do not add one.
    expect(FREEPORT_MUSE_SPARK_12_CONTRIBUTOR_MODEL_ID).toBe(
      'meta/muse-spark-1.2-contributor',
    )
    // Meta's own id is what the provider receives, never a wire id a caller
    // may send. Widened to string[] on purpose: the union type already proves
    // this at compile time, and the runtime check is what survives someone
    // later adding the bare id to a catalog.
    expect(
      FREEPORT_WEB_ALL_MODELS.map((model): string => model.id),
    ).not.toContain(MUSE_SPARK_12_CONTRIBUTOR_UPSTREAM_MODEL_ID)

    expect(
      isMuseSparkModelId(FREEPORT_MUSE_SPARK_12_CONTRIBUTOR_MODEL_ID),
    ).toBe(true)
    // A dated provider snapshot must not slip past the rate-limit queue.
    expect(
      isMuseSparkModelId(
        `${FREEPORT_MUSE_SPARK_12_CONTRIBUTOR_MODEL_ID}-20260901`,
      ),
    ).toBe(true)
    expect(isMuseSparkModelId('meta/muse-spark-1.2')).toBe(false)
    expect(isMuseSparkModelId(null)).toBe(false)
  })
})

describe('Muse Spark rate-limit fallback', () => {
  test('reroutes only to a model the caller is already entitled to', () => {
    // THE invariant. A fallback outside the shared daily premium pool would
    // turn "Muse Spark is busy" into a way to reach a model the user had not
    // earned ΓÇö the same shape as the retired crof/glm-5.2 route, which handed
    // out a referral-earned model for nothing. The fallback sits in the same
    // pool, so a rerouted request spends exactly the entitlement the original
    // would.
    expect(isfreeportWebPremiumModelId(MUSE_SPARK_FALLBACK_MODEL_ID)).toBe(true)
    expect(
      isfreeportWebPremiumModelId(FREEPORT_MUSE_SPARK_12_CONTRIBUTOR_MODEL_ID),
    ).toBe(true)
    // Never the earned-GLM pool, and never the free standard pool.
    expect(isfreeportGlmV52ModelId(MUSE_SPARK_FALLBACK_MODEL_ID)).toBe(false)
    expect(FREEPORT_STANDARD_MODEL_IDS).not.toContain(
      MUSE_SPARK_FALLBACK_MODEL_ID,
    )
    // And it must be a real, selectable Web model rather than a dangling id.
    expect(isfreeportWebModelId(MUSE_SPARK_FALLBACK_MODEL_ID)).toBe(true)
    expect(MUSE_SPARK_FALLBACK_MODEL_ID).not.toBe(
      FREEPORT_MUSE_SPARK_12_CONTRIBUTOR_MODEL_ID,
    )
  })

  test('the picker promises exactly what the server does', () => {
    // The tooltip is a promise about behavior; drift between the two is how a
    // UI starts lying. Both read the same constant, and the threshold the copy
    // implies ("too long") is the one the server actually applies.
    const model = getfreeportWebModel(
      FREEPORT_MUSE_SPARK_12_CONTRIBUTOR_MODEL_ID,
    )
    expect(model.tagline).toBe('Queue')
    expect(model.taglineTooltip).toBe(MUSE_SPARK_FALLBACK_NOTICE)
    // The copy must NAME the model the server actually reroutes to ΓÇö pinning it
    // to the catalog rather than to a literal is what catches a fallback that
    // moves (as it did on 2026-08-12, Luna ΓåÆ V4 Pro) while its tooltip does not.
    // Matched undated: this tooltip promises a behavior rather than pointing at
    // a picker row, so it does not carry a build date the way the supersedes
    // notices do.
    expect(MUSE_SPARK_FALLBACK_NOTICE).toContain(
      getfreeportWebModel(MUSE_SPARK_FALLBACK_MODEL_ID).displayName.replace(
        /\s+\d{2}\/\d{2}$/,
        '',
      ),
    )
    // The row no longer advertises itself as new.
    expect(model.isNew).toBeUndefined()
    // A wait worth explaining, not one worth hiding ΓÇö and the same number the
    // provider uses for its silent window, so the two cannot disagree about
    // what "too long" means.
    expect(MUSE_SPARK_FALLBACK_AFTER_MS).toBe(10_000)
  })
})
