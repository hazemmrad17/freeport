import { describe, expect, test } from 'bun:test'

import {
  freeportModelNavigationDirectionForKey,
  nextfreeportModelId,
} from '../freeport-model-navigation'

describe('nextfreeportModelId', () => {
  test('moves to the next model when moving forward', () => {
    const modelIds = ['glm', 'minimax']

    expect(
      nextfreeportModelId({
        modelIds,
        focusedId: 'minimax',
        direction: 'forward',
      }),
    ).toBe('glm')
  })

  test('moves to the previous model when moving backward', () => {
    const modelIds = ['glm', 'minimax']

    expect(
      nextfreeportModelId({
        modelIds,
        focusedId: 'minimax',
        direction: 'backward',
      }),
    ).toBe('glm')
  })

  test('wraps through every model regardless of selectability', () => {
    const modelIds = ['glm', 'minimax', 'other']

    expect(
      nextfreeportModelId({
        modelIds,
        focusedId: 'minimax',
        direction: 'forward',
      }),
    ).toBe('other')
  })

  test('returns null when no model exists', () => {
    expect(
      nextfreeportModelId({
        modelIds: [],
        focusedId: 'glm',
        direction: 'forward',
      }),
    ).toBeNull()
  })
})

describe('freeportModelNavigationDirectionForKey', () => {
  test('maps arrow keys to model navigation directions', () => {
    expect(freeportModelNavigationDirectionForKey({ name: 'down' })).toBe(
      'forward',
    )
    expect(freeportModelNavigationDirectionForKey({ name: 'right' })).toBe(
      'forward',
    )
    expect(freeportModelNavigationDirectionForKey({ name: 'up' })).toBe(
      'backward',
    )
    expect(freeportModelNavigationDirectionForKey({ name: 'left' })).toBe(
      'backward',
    )
  })

  test('maps tab and shift-tab to model navigation directions', () => {
    expect(freeportModelNavigationDirectionForKey({ name: 'tab' })).toBe(
      'forward',
    )
    expect(
      freeportModelNavigationDirectionForKey({ name: 'tab', shift: true }),
    ).toBe('backward')
  })

  test('maps terminal tab sequences to model navigation directions', () => {
    expect(freeportModelNavigationDirectionForKey({ sequence: '\t' })).toBe(
      'forward',
    )
    expect(
      freeportModelNavigationDirectionForKey({ sequence: '\x1b[9u' }),
    ).toBe('forward')
    expect(
      freeportModelNavigationDirectionForKey({ sequence: '\x1b[Z' }),
    ).toBe('backward')
    expect(
      freeportModelNavigationDirectionForKey({ sequence: '\x1b[9;2u' }),
    ).toBe('backward')
    expect(
      freeportModelNavigationDirectionForKey({ sequence: '\x1b[27;2;9~' }),
    ).toBe('backward')
  })

  test('ignores non-navigation keys', () => {
    expect(freeportModelNavigationDirectionForKey({ name: 'enter' })).toBeNull()
  })
})
