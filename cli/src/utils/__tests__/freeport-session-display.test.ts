import { describe, expect, test } from 'bun:test'

import {
  formatFREEPORTSessionCountdown,
  formatFREEPORTSessionRemaining,
} from '../freeport-session-display'

describe('FREEPORT session display formatting', () => {
  test('formats urgent countdowns', () => {
    expect(formatFREEPORTSessionCountdown(61_000)).toBe('1:01')
    expect(formatFREEPORTSessionRemaining(61_000)).toBe('1:01 left')
  })

  test('formats minute and hour remaining labels', () => {
    expect(formatFREEPORTSessionRemaining(5 * 60_000)).toBe('5m left')
    expect(formatFREEPORTSessionRemaining(60 * 60_000)).toBe('1h left')
    expect(formatFREEPORTSessionRemaining(90 * 60_000)).toBe('1h 30m left')
  })

  test('formats expired sessions as expiring', () => {
    expect(formatFREEPORTSessionRemaining(0)).toBe('expiringΓÇª')
  })
})
