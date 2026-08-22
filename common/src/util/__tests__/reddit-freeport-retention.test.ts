import { describe, expect, test } from 'bun:test'

import {
  getfreeportRetentionMilestonesToFire,
  isFirstfreeportPrompt,
  planfreeportRedditConversionEvents,
} from '@codebuff/common/util/reddit-freeport-retention'

describe('isFirstfreeportPrompt', () => {
  test('returns true on first-ever usage day', () => {
    expect(
      isFirstfreeportPrompt({
        previousUsageDays: [],
        newUsageDayRecorded: true,
      }),
    ).toBe(true)
  })

  test('returns false on repeat prompts same day', () => {
    expect(
      isFirstfreeportPrompt({
        previousUsageDays: ['2026-06-30'],
        newUsageDayRecorded: false,
      }),
    ).toBe(false)
  })

  test('returns false on a later usage day', () => {
    expect(
      isFirstfreeportPrompt({
        previousUsageDays: ['2026-06-30'],
        newUsageDayRecorded: true,
      }),
    ).toBe(false)
  })
})

describe('getfreeportRetentionMilestonesToFire', () => {
  test('returns nothing on first-ever usage day', () => {
    expect(
      getfreeportRetentionMilestonesToFire({
        previousUsageDays: [],
        todayDateKey: '2026-06-30',
        newUsageDayRecorded: true,
      }),
    ).toEqual([])
  })

  test('returns nothing when no new usage day was recorded', () => {
    expect(
      getfreeportRetentionMilestonesToFire({
        previousUsageDays: ['2026-06-30'],
        todayDateKey: '2026-07-01',
        newUsageDayRecorded: false,
      }),
    ).toEqual([])
  })

  test('fires 1d retention on day 1', () => {
    expect(
      getfreeportRetentionMilestonesToFire({
        previousUsageDays: ['2026-06-30'],
        todayDateKey: '2026-07-01',
        newUsageDayRecorded: true,
      }),
    ).toEqual([1])
  })

  test('does not repeat 1d on day 2', () => {
    expect(
      getfreeportRetentionMilestonesToFire({
        previousUsageDays: ['2026-06-30', '2026-07-01'],
        todayDateKey: '2026-07-02',
        newUsageDayRecorded: true,
      }),
    ).toEqual([])
  })

  test('fires 7d retention on day 7', () => {
    expect(
      getfreeportRetentionMilestonesToFire({
        previousUsageDays: ['2026-06-30', '2026-07-01'],
        todayDateKey: '2026-07-07',
        newUsageDayRecorded: true,
      }),
    ).toEqual([7])
  })

  test('does not backfill missed milestones after a long gap', () => {
    expect(
      getfreeportRetentionMilestonesToFire({
        previousUsageDays: ['2026-06-01'],
        todayDateKey: '2026-07-01',
        newUsageDayRecorded: true,
      }),
    ).toEqual([])
  })

  test('fires 24d retention only on exact day 24', () => {
    expect(
      getfreeportRetentionMilestonesToFire({
        previousUsageDays: ['2026-06-01', '2026-06-02'],
        todayDateKey: '2026-06-25',
        newUsageDayRecorded: true,
      }),
    ).toEqual([24])
  })
})

describe('planfreeportRedditConversionEvents', () => {
  test('first prompt only on day 0', () => {
    expect(
      planfreeportRedditConversionEvents({
        previousUsageDays: [],
        todayDateKey: '2026-06-30',
        newUsageDayRecorded: true,
      }),
    ).toEqual({ fireFirstPrompt: true, retentionMilestones: [] })
  })

  test('1d retention without first prompt on day 1', () => {
    expect(
      planfreeportRedditConversionEvents({
        previousUsageDays: ['2026-06-30'],
        todayDateKey: '2026-07-01',
        newUsageDayRecorded: true,
      }),
    ).toEqual({ fireFirstPrompt: false, retentionMilestones: [1] })
  })
})
