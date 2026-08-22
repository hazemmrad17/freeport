import { describe, expect, test } from 'bun:test'

import {
  formatfreeportSessionCountdown,
  formatfreeportSessionRemaining,
} from '../freeport-session-display'

describe('FREEPORT session display formatting', () => {
  test('formats urgent countdowns', () => {
    expect(formatfreeportSessionCountdown(61_000)).toBe('1:01')
    expect(formatfreeportSessionRemaining(61_000)).toBe('1:01 left')
  })

  test('formats minute and hour remaining labels', () => {
    expect(formatfreeportSessionRemaining(5 * 60_000)).toBe('5m left')
    expect(formatfreeportSessionRemaining(60 * 60_000)).toBe('1h left')
    expect(formatfreeportSessionRemaining(90 * 60_000)).toBe('1h 30m left')
  })

  test('formats expired sessions as expiring', () => {
    expect(formatfreeportSessionRemaining(0)).toBe('expiringΓÇª')
  })
})
