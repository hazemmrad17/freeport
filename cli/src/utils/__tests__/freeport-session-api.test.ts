import { afterEach, expect, spyOn, test } from 'bun:test'
import {
  FREEPORT_GLM_V52_MODEL_ID,
  resolvefreeportModelForAccessTier,
} from '@codebuff/common/constants/freeport-models'

import {
  callfreeportSession,
  classifyfreeportSessionRequestFailure,
  freeportSessionRequestError,
  mergeCompactActiveSession,
} from '../freeport-session-api'

let fetchSpy: ReturnType<typeof spyOn> | undefined

afterEach(() => {
  fetchSpy?.mockRestore()
  fetchSpy = undefined
})

test('full-tier referral GLM reaches the session POST header unchanged', async () => {
  fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify({ status: 'none' }), {
      headers: { 'content-type': 'application/json' },
    }),
  )
  const resolved = resolvefreeportModelForAccessTier(
    FREEPORT_GLM_V52_MODEL_ID,
    'full',
  )

  await callfreeportSession('POST', 'test-token', { model: resolved })

  expect(fetchSpy).toHaveBeenCalledTimes(1)
  const [, init] = fetchSpy.mock.calls[0]!
  expect(new Headers(init?.headers).get('x-freeport-model')).toBe(
    FREEPORT_GLM_V52_MODEL_ID,
  )
})

test('compact GET sends the compact-session header', async () => {
  fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue(
    Response.json({ status: 'active', model: 'model', instanceId: 'i1' }),
  )

  await callfreeportSession('GET', 'test-token', {
    instanceId: 'i1',
    compact: true,
  })

  const [, init] = fetchSpy.mock.calls[0]!
  expect(new Headers(init?.headers).get('x-freeport-compact-session')).toBe('1')
})

test('compact active state retains the admission quota snapshot', () => {
  const rateLimit = {
    model: 'model',
    limit: 5,
    period: 'pacific_day' as const,
    resetTimeZone: 'America/Los_Angeles' as const,
    resetAt: '2026-08-06T07:00:00.000Z',
    windowHours: 1,
    recentCount: 2,
    entitlementBreakdown: { base: 5, referral: 0, streak: 0 },
  }
  const merged = mergeCompactActiveSession(
    {
      status: 'active',
      accessTier: 'full',
      model: 'model',
      instanceId: 'i1',
      admittedAt: '2026-08-05T12:00:00.000Z',
      expiresAt: '2026-08-05T13:00:00.000Z',
      remainingMs: 1_000,
      rateLimit,
    },
    {
      status: 'active',
      accessTier: 'full',
      model: 'model',
      instanceId: 'i1',
      admittedAt: '2026-08-05T12:00:00.000Z',
      expiresAt: '2026-08-05T13:00:00.000Z',
      remainingMs: 500,
    },
  )

  expect(merged).toMatchObject({ remainingMs: 500, rateLimit })
})

test('compact state requests a full refresh instead of carrying quota across models', () => {
  const merged = mergeCompactActiveSession(
    {
      status: 'active',
      accessTier: 'full',
      model: 'old-model',
      instanceId: 'i1',
      admittedAt: '2026-08-05T12:00:00.000Z',
      expiresAt: '2026-08-05T13:00:00.000Z',
      remainingMs: 1_000,
      rateLimit: {
        model: 'old-model',
        limit: 5,
        period: 'pacific_day',
        resetTimeZone: 'America/Los_Angeles',
        resetAt: '2026-08-06T07:00:00.000Z',
        windowHours: 1,
        recentCount: 2,
        entitlementBreakdown: { base: 5, referral: 0, streak: 0 },
      },
    },
    {
      status: 'active',
      accessTier: 'full',
      model: 'new-model',
      instanceId: 'i1',
      admittedAt: '2026-08-05T12:00:00.000Z',
      expiresAt: '2026-08-05T13:00:00.000Z',
      remainingMs: 500,
    },
  )

  expect(merged).toBeNull()
})

test('does not repeat a takeover POST after an ambiguous timeout', () => {
  const timeout = new DOMException('The operation timed out', 'TimeoutError')

  expect(classifyfreeportSessionRequestFailure('POST', timeout)).toBe('unknown')
  expect(classifyfreeportSessionRequestFailure('GET', timeout)).toBe('retry')
})

test('retries POST responses that cannot represent a committed takeover', async () => {
  fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue(
    Response.json(
      {
        error: 'service_overloaded',
        message: 'FREEPORT session service is busy. Please retry shortly.',
      },
      { status: 503, headers: { 'retry-after': '10' } },
    ),
  )

  await expect(callfreeportSession('POST', 'test-token')).rejects.toMatchObject({
    statusCode: 503,
    retryAfterMs: 10_000,
    errorCode: 'service_overloaded',
  })

  expect(
    classifyfreeportSessionRequestFailure(
      'POST',
      new freeportSessionRequestError(
        'busy',
        503,
        10_000,
        'service_overloaded',
      ),
    ),
  ).toBe('retry')
  expect(
    classifyfreeportSessionRequestFailure(
      'POST',
      new freeportSessionRequestError('generic proxy 503', 503, 10_000),
    ),
  ).toBe('retry')
  expect(
    classifyfreeportSessionRequestFailure(
      'POST',
      new freeportSessionRequestError('request timeout', 408, 10_000),
    ),
  ).toBe('retry')
  expect(
    classifyfreeportSessionRequestFailure(
      'POST',
      new freeportSessionRequestError('edge rate limit', 429, 10_000),
    ),
  ).toBe('retry')
})

test('stops on terminal 4xx responses', () => {
  expect(
    classifyfreeportSessionRequestFailure(
      'POST',
      new freeportSessionRequestError('unauthorized', 401),
    ),
  ).toBe('stop')
  expect(
    classifyfreeportSessionRequestFailure(
      'GET',
      new freeportSessionRequestError('not found', 404),
    ),
  ).toBe('stop')
})

test('marks response loss and server errors after a POST as unknown outcomes', () => {
  expect(
    classifyfreeportSessionRequestFailure(
      'POST',
      new TypeError('fetch failed'),
    ),
  ).toBe('unknown')
  expect(
    classifyfreeportSessionRequestFailure(
      'POST',
      new freeportSessionRequestError('internal error', 500),
    ),
  ).toBe('unknown')
  expect(
    classifyfreeportSessionRequestFailure(
      'GET',
      new freeportSessionRequestError('internal error', 500),
    ),
  ).toBe('retry')
})
