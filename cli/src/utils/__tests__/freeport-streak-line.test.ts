import { describe, test, expect } from 'bun:test'

import {
  FREEPORT_STREAK_INLINE_GAP,
  fitsfreeportStreakOnHeadingRow,
  getfreeportStreakBonusNote,
  getfreeportStreakBonusNoteForLayout,
  getfreeportStreakInlineWidth,
  getfreeportStreakLine,
} from '../freeport-streak-line'

// The CLI draws the shared ΓùÅ/Γùï pair: filled-vs-hollow is what makes a partial
// week distinguishable from a full one at a glance, which ΓÇó and ┬╖ (same shape,
// different size) never managed.
describe('getfreeportStreakLine', () => {
  test('hides the row for new / lapsed users (streak <= 0)', () => {
    expect(getfreeportStreakLine(0)).toBeNull()
    expect(getfreeportStreakLine(-1)).toBeNull()
  })

  test('labels and fills dots for an active streak', () => {
    expect(getfreeportStreakLine(2)).toEqual({
      label: '2 day streak',
      dots: 'ΓùÅΓùÅΓùïΓùïΓùïΓùïΓùï',
      progress: { filled: 2, total: 7, beyond: false },
    })
  })

  test('"day" stays singular as a compound modifier', () => {
    expect(getfreeportStreakLine(1)?.label).toBe('1 day streak')
    expect(getfreeportStreakLine(5)?.label).toBe('5 day streak')
  })

  test('fills the whole week on a 7-day milestone', () => {
    expect(getfreeportStreakLine(7)).toEqual({
      label: '7 day streak',
      dots: 'ΓùÅΓùÅΓùÅΓùÅΓùÅΓùÅΓùÅ',
      // filled === total is how a surface without the constant knows the
      // milestone is earned (the desktop banner gates its perk line on it)
      progress: { filled: 7, total: 7, beyond: false },
    })
  })

  test('stays full and gains a "+" once the streak passes the week', () => {
    expect(getfreeportStreakLine(9)).toEqual({
      label: '9 day streak',
      dots: 'ΓùÅΓùÅΓùÅΓùÅΓùÅΓùÅΓùÅ+',
      progress: { filled: 7, total: 7, beyond: true },
    })
    expect(getfreeportStreakLine(19)).toEqual({
      label: '19 day streak',
      dots: 'ΓùÅΓùÅΓùÅΓùÅΓùÅΓùÅΓùÅ+',
      progress: { filled: 7, total: 7, beyond: true },
    })
  })
})

describe('fitsfreeportStreakOnHeadingRow', () => {
  const headingWidth = 'Start coding for free'.length
  const line = getfreeportStreakLine(18)!
  // "18 day streak" + 2 + "ΓùÅΓùÅΓùÅΓùÅΓùÅΓùÅΓùÅ+"
  const inlineWidth = getfreeportStreakInlineWidth(line)
  const exact = headingWidth + FREEPORT_STREAK_INLINE_GAP + inlineWidth

  test('measures the label and dots together', () => {
    expect(inlineWidth).toBe(23)
  })

  test('shares the row only when the gap is fully clear', () => {
    expect(
      fitsfreeportStreakOnHeadingRow({
        line,
        headingWidth,
        availableWidth: exact,
      }),
    ).toBe(true)
    expect(
      fitsfreeportStreakOnHeadingRow({
        line,
        headingWidth,
        availableWidth: exact - 1,
      }),
    ).toBe(false)
  })

  test('measures an empty slot as the day-one streak it will become', () => {
    const dayOne = getfreeportStreakLine(1)!
    const width = headingWidth + FREEPORT_STREAK_INLINE_GAP
    expect(
      fitsfreeportStreakOnHeadingRow({
        line: null,
        headingWidth,
        availableWidth: width + getfreeportStreakInlineWidth(dayOne),
      }),
    ).toBe(true)
    expect(
      fitsfreeportStreakOnHeadingRow({
        line: null,
        headingWidth,
        availableWidth: width + getfreeportStreakInlineWidth(dayOne) - 1,
      }),
    ).toBe(false)
  })

  // A three-digit streak widens its own label, so the cutoff has to follow the
  // rendered strings rather than a fixed column count.
  test('accounts for the label growing with the day count', () => {
    const long = getfreeportStreakLine(365)!
    expect(getfreeportStreakInlineWidth(long)).toBeGreaterThan(inlineWidth)
    expect(
      fitsfreeportStreakOnHeadingRow({
        line: long,
        headingWidth,
        availableWidth: exact,
      }),
    ).toBe(false)
  })
})

describe('getfreeportStreakBonusNote', () => {
  test('hidden with no streak at all', () => {
    expect(
      getfreeportStreakBonusNote({ streak: 0, accessTier: 'full' }),
    ).toBeNull()
    expect(
      getfreeportStreakBonusNote({ streak: -1, accessTier: 'limited' }),
    ).toBeNull()
  })

  test('teases the unlock countdown below the 7-day milestone', () => {
    expect(getfreeportStreakBonusNote({ streak: 3, accessTier: 'full' })).toBe(
      '≡ƒÄü 4 more days to unlock +1 bonus session every day + 1 GLM 5.2 session each day',
    )
    expect(
      getfreeportStreakBonusNote({ streak: 3, accessTier: 'limited' }),
    ).toBe('≡ƒÄü 4 more days to unlock +1 bonus session every day')
  })

  test('"day" goes singular on the eve of the milestone', () => {
    expect(
      getfreeportStreakBonusNote({ streak: 6, accessTier: 'limited' }),
    ).toBe('≡ƒÄü 1 more day to unlock +1 bonus session every day')
  })

  test('full access advertises the daily session + daily GLM perk at 7+', () => {
    const note = getfreeportStreakBonusNote({ streak: 7, accessTier: 'full' })
    expect(note).toBe(
      '≡ƒÄü Streak perk: +1 bonus session every day + 1 GLM 5.2 session each day',
    )
  })

  test('the GLM streak count grows per completed 7 days, capped at 4', () => {
    expect(getfreeportStreakBonusNote({ streak: 14, accessTier: 'full' })).toBe(
      '≡ƒÄü Streak perk: +1 bonus session every day + 2 GLM 5.2 sessions each day',
    )
    expect(getfreeportStreakBonusNote({ streak: 35, accessTier: 'full' })).toBe(
      '≡ƒÄü Streak perk: +1 bonus session every day + 4 GLM 5.2 sessions each day',
    )
  })

  test('limited access advertises only the daily session perk', () => {
    const note = getfreeportStreakBonusNote({
      streak: 14,
      accessTier: 'limited',
    })
    expect(note).toBe('≡ƒÄü Streak perk: +1 bonus session every day')
  })
})

describe('getfreeportStreakBonusNoteForLayout', () => {
  const params = {
    streak: 7,
    accessTier: 'full' as const,
  }
  const note = getfreeportStreakBonusNote(params)!

  test('hides the unlock countdown before the bonus is earned', () => {
    expect(
      getfreeportStreakBonusNoteForLayout({
        ...params,
        streak: 6,
        terminalHeight: 30,
        availableWidth: 200,
      }),
    ).toBeNull()
  })

  test('hides the earned note below 30 rows', () => {
    expect(
      getfreeportStreakBonusNoteForLayout({
        ...params,
        terminalHeight: 29,
        availableWidth: note.length,
      }),
    ).toBeNull()
  })

  test('shows the earned note at 30 rows when it fits on one line', () => {
    expect(
      getfreeportStreakBonusNoteForLayout({
        ...params,
        terminalHeight: 30,
        availableWidth: note.length,
      }),
    ).toBe(note)
  })

  test('hides the earned note when it would wrap', () => {
    expect(
      getfreeportStreakBonusNoteForLayout({
        ...params,
        terminalHeight: 30,
        availableWidth: note.length - 1,
      }),
    ).toBeNull()
  })
})
