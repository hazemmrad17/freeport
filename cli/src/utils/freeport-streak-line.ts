// The label/dots/perk-note logic is shared with FREEPORT Desktop and lives in
// common; this module re-exports it and adds the terminal rendering and layout
// gating only the CLI needs.
export {
  FREEPORT_STREAK_WEEK,
  getfreeportStreakBonusNote,
} from '@codebuff/common/util/freeport-streak-line'
export type { freeportStreakLine } from '@codebuff/common/util/freeport-streak-line'

import {
  FREEPORT_STREAK_WEEK,
  getfreeportStreakBonusNote,
  getfreeportStreakLine as getSharedfreeportStreakLine,
} from '@codebuff/common/util/freeport-streak-line'

import type { freeportStreakLine } from '@codebuff/common/util/freeport-streak-line'

const FREEPORT_STREAK_BONUS_MIN_HEIGHT = 30

/** Columns between the count label and its progress dots. */
export const FREEPORT_STREAK_LABEL_GAP = 2

/** Columns kept clear between the heading and the streak when they share a
 *  row. The heading row is laid out space-between inside a shrink-to-fit
 *  column, so when the row is the widest child there is no free space to
 *  distribute and the two would otherwise render flush against each other
 *  ("Start coding for free18 day streak"). This is the floor, and the same
 *  number decides whether they may share a row at all. */
export const FREEPORT_STREAK_INLINE_GAP = 3

/** Progress glyphs for a terminal ΓÇö the same ΓùÅ/Γùï pair the shared module and
 *  the desktop app use. Bullet and middle dot were tried here because U+25CF
 *  is missing from a few terminal fonts and lands as a tofu box, but ΓÇó and ┬╖
 *  differ only in size: at a glance a partial week and a full one look alike,
 *  which is the whole point of the row. Filled-vs-hollow reads instantly, and
 *  the CLI already bets on ΓùÅ/Γùï for its agent status indicators, so a font that
 *  can't draw them is already visibly broken elsewhere.
 *
 *  If a font ever fails these, Γûê/Γûæ (Block Elements) is the fallback pair: the
 *  ASCII logo and the progress bar are built from them, so anything that
 *  renders the CLI at all renders those. */
const TERMINAL_DOT_CHARS = { filled: 'ΓùÅ', empty: 'Γùï' }

/** The streak line as the CLI draws it. */
export function getfreeportStreakLine(
  streak: number,
): freeportStreakLine | null {
  return getSharedfreeportStreakLine(streak, TERMINAL_DOT_CHARS)
}

/** Rendered width of the streak, e.g. "18 day streak  ΓùÅΓùÅΓùÅΓùÅΓùÅΓùÅΓùÅ+". */
export function getfreeportStreakInlineWidth(line: freeportStreakLine): number {
  return line.label.length + FREEPORT_STREAK_LABEL_GAP + line.dots.length
}

/** What a user with no streak yet is about to earn. The empty slot is measured
 *  against it so the row doesn't move on day one. */
const DAY_ONE_LINE = getfreeportStreakLine(1)!

/** Whether the heading and the streak can share a row with the inline gap left
 *  clear between them. A streak long enough to widen its own label (or a
 *  narrow terminal) pushes the streak onto its own line instead of letting the
 *  two collide. */
export function fitsfreeportStreakOnHeadingRow(params: {
  /** null when the user has no streak yet ΓÇö measured as day one. */
  line: freeportStreakLine | null
  headingWidth: number
  availableWidth: number
}): boolean {
  return (
    params.headingWidth +
      FREEPORT_STREAK_INLINE_GAP +
      getfreeportStreakInlineWidth(params.line ?? DAY_ONE_LINE) <=
    params.availableWidth
  )
}

/** Returns the earned perk note only when the landing layout can show it
 * without crowding the picker or wrapping onto additional rows. */
export function getfreeportStreakBonusNoteForLayout(params: {
  streak: number
  accessTier: 'full' | 'limited'
  terminalHeight: number
  availableWidth: number
}): string | null {
  if (params.streak < FREEPORT_STREAK_WEEK) return null
  if (params.terminalHeight < FREEPORT_STREAK_BONUS_MIN_HEIGHT) return null

  const note = getfreeportStreakBonusNote(params)
  if (!note || note.length > params.availableWidth) return null

  return note
}
