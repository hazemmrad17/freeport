/**
 * The DeepSeek row's own ceiling has to be legible ON THE ROW, because the
 * PREMIUM header speaks for a different pool and will happily say there is room
 * while this row is spent.
 */
import { describe, expect, test, beforeEach } from 'bun:test'

import {
  FREEPORT_DEEPSEEK_V4_FLASH_MODEL_ID,
  FREEPORT_GPT_5_6_LUNA_MODEL_ID,
} from '@codebuff/common/constants/freeport-models'
import {
  formatfreeportRowQuota,
  getfreeportSectionQuotas,
} from '@codebuff/common/util/freeport-session-pools'

const quota = (
  model: string,
  pool: string,
  poolLabel: string,
  limit: number,
  recentCount: number,
) => ({
  model,
  pool,
  poolLabel,
  limit,
  recentCount,
  period: 'pacific_day' as const,
  resetTimeZone: 'America/Los_Angeles',
  resetAt: '2026-08-20T07:00:00.000Z',
  windowHours: 24,
})

describe('a section holding two pools', () => {
  const rows = [
    FREEPORT_GPT_5_6_LUNA_MODEL_ID,
    FREEPORT_DEEPSEEK_V4_FLASH_MODEL_ID,
  ]
  const quotas = {
    [FREEPORT_GPT_5_6_LUNA_MODEL_ID]: quota(
      FREEPORT_GPT_5_6_LUNA_MODEL_ID,
      'premium',
      'Premium',
      5,
      1,
    ),
    [FREEPORT_DEEPSEEK_V4_FLASH_MODEL_ID]: quota(
      FREEPORT_DEEPSEEK_V4_FLASH_MODEL_ID,
      'deepseek',
      'DeepSeek',
      1,
      1,
    ),
  }

  test('the header speaks for the majority pool, not for whatever came first', () => {
    // Two premium-pool rows would be the ordinary case; here one of each, and
    // the tie breaks toward display order — Luna leads, so Premium labels the
    // section. The failure this prevents is a header reading "of 1" for every
    // premium model because DeepSeek happened to sort first.
    const { header } = getfreeportSectionQuotas(rows, quotas)
    expect(header?.pool).toBe('premium')
    expect(header?.limit).toBe(5)
  })

  test('the stricter row is handed back separately, keyed by model', () => {
    const { perModel } = getfreeportSectionQuotas(rows, quotas)
    expect(Object.keys(perModel)).toEqual([FREEPORT_DEEPSEEK_V4_FLASH_MODEL_ID])
    expect(perModel[FREEPORT_DEEPSEEK_V4_FLASH_MODEL_ID]!.limit).toBe(1)
  })

  test('its chip names the pool, since the number alone contradicts the header', () => {
    const { perModel } = getfreeportSectionQuotas(rows, quotas)
    expect(
      formatfreeportRowQuota(perModel[FREEPORT_DEEPSEEK_V4_FLASH_MODEL_ID]!),
    ).toBe('DeepSeek: 1 of 1 used')
  })

  test('nothing is singled out when every row shares a pool', () => {
    const onePool = {
      [FREEPORT_GPT_5_6_LUNA_MODEL_ID]: quotas[FREEPORT_GPT_5_6_LUNA_MODEL_ID]!,
    }
    const { header, perModel } = getfreeportSectionQuotas(
      [FREEPORT_GPT_5_6_LUNA_MODEL_ID],
      onePool,
    )
    expect(header?.pool).toBe('premium')
    expect(perModel).toEqual({})
  })

  test('an older server that sends no pool behaves exactly as before', () => {
    // One bucket, header from the first row, nothing inline — a new client
    // against an old server must not start annotating rows at random.
    const legacy = {
      [FREEPORT_GPT_5_6_LUNA_MODEL_ID]: {
        ...quotas[FREEPORT_GPT_5_6_LUNA_MODEL_ID]!,
        pool: undefined,
        poolLabel: undefined,
      },
      [FREEPORT_DEEPSEEK_V4_FLASH_MODEL_ID]: {
        ...quotas[FREEPORT_DEEPSEEK_V4_FLASH_MODEL_ID]!,
        pool: undefined,
        poolLabel: undefined,
      },
    }
    const { header, perModel } = getfreeportSectionQuotas(rows, legacy)
    expect(header?.model).toBe(FREEPORT_GPT_5_6_LUNA_MODEL_ID)
    expect(perModel).toEqual({})
  })

  test('a pool the client has never heard of still renders', () => {
    // THE point of the server sending a label: this is what a future ceiling
    // looks like to a build shipped today.
    const future = {
      ...quotas,
      [FREEPORT_DEEPSEEK_V4_FLASH_MODEL_ID]: quota(
        FREEPORT_DEEPSEEK_V4_FLASH_MODEL_ID,
        'some_new_pool',
        'Frontier',
        2,
        2,
      ),
    }
    const { perModel } = getfreeportSectionQuotas(rows, future)
    expect(
      formatfreeportRowQuota(perModel[FREEPORT_DEEPSEEK_V4_FLASH_MODEL_ID]!),
    ).toBe('Frontier: 2 of 2 used')
  })
})
