import { describe, expect, test } from 'bun:test'

import {
  FREEPORTModelNavigationDirectionForKey,
  nextFREEPORTModelId,
} from '../freeport-model-navigation'

describe('nextfreeportModelId', () => {
  test('moves to the next model when moving forward', () => {
    const modelIds = ['glm', 'minimax']

    expect(
      nextFREEPORTModelId({
        modelIds,
        focusedId: 'minimax',
        direction: 'forward',
      }),
    ).toBe('glm')
  })

  test('moves to the previous model when moving backward', () => {
    const modelIds = ['glm', 'minimax']

    expect(
      nextFREEPORTModelId({
        modelIds,
        focusedId: 'minimax',
        direction: 'backward',
      }),
    ).toBe('glm')
  })

  test('wraps through every model regardless of selectability', () => {
    const modelIds = ['glm', 'minimax', 'other']

    expect(
      nextFREEPORTModelId({
        modelIds,
        focusedId: 'minimax',
        direction: 'forward',
      }),
    ).toBe('other')
  })

  test('returns null when no model exists', () => {
    expect(
      nextFREEPORTModelId({
        modelIds: [],
        focusedId: 'glm',
        direction: 'forward',
      }),
    ).toBeNull()
  })
})

describe('freeportModelNavigationDirectionForKey', () => {
  test('maps arrow keys to model navigation directions', () => {
    expect(FREEPORTModelNavigationDirectionForKey({ name: 'down' })).toBe(
      'forward',
    )
    expect(FREEPORTModelNavigationDirectionForKey({ name: 'right' })).toBe(
      'forward',
    )
    expect(FREEPORTModelNavigationDirectionForKey({ name: 'up' })).toBe(
      'backward',
    )
    expect(FREEPORTModelNavigationDirectionForKey({ name: 'left' })).toBe(
      'backward',
    )
  })

  test('maps tab and shift-tab to model navigation directions', () => {
    expect(FREEPORTModelNavigationDirectionForKey({ name: 'tab' })).toBe(
      'forward',
    )
    expect(
      FREEPORTModelNavigationDirectionForKey({ name: 'tab', shift: true }),
    ).toBe('backward')
  })

  test('maps terminal tab sequences to model navigation directions', () => {
    expect(FREEPORTModelNavigationDirectionForKey({ sequence: '\t' })).toBe(
      'forward',
    )
    expect(
      FREEPORTModelNavigationDirectionForKey({ sequence: '\x1b[9u' }),
    ).toBe('forward')
    expect(
      FREEPORTModelNavigationDirectionForKey({ sequence: '\x1b[Z' }),
    ).toBe('backward')
    expect(
      FREEPORTModelNavigationDirectionForKey({ sequence: '\x1b[9;2u' }),
    ).toBe('backward')
    expect(
      FREEPORTModelNavigationDirectionForKey({ sequence: '\x1b[27;2;9~' }),
    ).toBe('backward')
  })

  test('ignores non-navigation keys', () => {
    expect(FREEPORTModelNavigationDirectionForKey({ name: 'enter' })).toBeNull()
  })
})
