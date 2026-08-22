// The line the CLI landing picker and the Desktop model menu both show under a
// reduced model list. It is support-facing copy as much as product copy: users
// who cannot see a model others talk about write in asking whether their
// account is restricted, so what this says ΓÇö and what it refuses to say ΓÇö is
// the behaviour worth pinning.

import { describe, expect, test } from 'bun:test'

import {
  formatfreeportPrivacySignalList,
  getfreeportModelAvailabilityNotice,
} from '../util/freeport-model-availability'

describe('the availability notice', () => {
  test('names the country, so "why not Luna?" has a concrete answer', () => {
    expect(
      getfreeportModelAvailabilityNotice({
        countryCode: 'BR',
        countryBlockReason: 'country_not_allowed',
      }),
    ).toBe("Some models aren't available in Brazil yet")
  })

  test('an unresolved country falls back to "your region" rather than printing UNKNOWN', () => {
    expect(
      getfreeportModelAvailabilityNotice({
        countryCode: 'UNKNOWN',
        countryBlockReason: 'country_not_allowed',
      }),
    ).toBe("Some models aren't available in your region yet")
  })

  test('the VPN case leads with the action, because it is the one the user can take', () => {
    expect(
      getfreeportModelAvailabilityNotice({
        countryCode: 'DE',
        countryBlockReason: 'anonymous_network',
        ipPrivacySignals: ['vpn'],
      }),
    ).toBe('Using a VPN? More models are available on a direct connection')
  })

  test('an inconclusive check reads as ours to explain, not as the user doing something wrong', () => {
    for (const reason of [
      'anonymized_or_unknown_country',
      'missing_client_ip',
      'unresolved_client_ip',
    ] as const) {
      expect(getfreeportModelAvailabilityNotice({ countryBlockReason: reason })).toBe(
        "We couldn't confirm your region, so we're showing models available everywhere",
      )
    }
    expect(
      getfreeportModelAvailabilityNotice({
        countryBlockReason: 'ip_privacy_lookup_failed',
      }),
    ).toBe("We couldn't finish a network check, so we're showing models available everywhere")
  })

  test('a missing reason still answers the question ΓÇö the short list is on screen either way', () => {
    const generic = "Some models aren't available on this connection"
    expect(getfreeportModelAvailabilityNotice(null)).toBe(generic)
    expect(getfreeportModelAvailabilityNotice(undefined)).toBe(generic)
    expect(getfreeportModelAvailabilityNotice({})).toBe(generic)
    expect(getfreeportModelAvailabilityNotice({ countryCode: 'BR' })).toBe(generic)
  })

  // the reason this copy exists in one shared place: every branch is read by
  // someone comparing their picker to a friend's, and none of them should
  // describe the user's account as lesser
  test('no branch tells the user they are limited, blocked, or restricted', () => {
    const lines = [
      getfreeportModelAvailabilityNotice(null),
      getfreeportModelAvailabilityNotice({ countryBlockReason: 'country_not_allowed' }),
      getfreeportModelAvailabilityNotice({
        countryBlockReason: 'anonymous_network',
        ipPrivacySignals: ['tor'],
      }),
      getfreeportModelAvailabilityNotice({ countryBlockReason: 'missing_client_ip' }),
      getfreeportModelAvailabilityNotice({ countryBlockReason: 'ip_privacy_lookup_failed' }),
    ]
    for (const line of lines) {
      expect(line.toLowerCase()).not.toMatch(/limited|blocked|restricted|denied|not allowed/)
    }
  })
})

describe('the privacy-signal list', () => {
  test('reads as prose, and never repeats a label two signals share', () => {
    expect(formatfreeportPrivacySignalList(['vpn', 'tor'])).toBe('VPN or Tor')
    expect(formatfreeportPrivacySignalList(['vpn', 'proxy', 'tor'])).toBe('VPN, proxy, or Tor')
    expect(formatfreeportPrivacySignalList(['proxy', 'proxy'])).toBe('proxy')
  })

  test('an empty or unrecognized set names the whole family rather than nothing', () => {
    const family = 'VPN, Tor, proxy, relay, or anonymized network'
    expect(formatfreeportPrivacySignalList([])).toBe(family)
    expect(formatfreeportPrivacySignalList(null)).toBe(family)
    expect(formatfreeportPrivacySignalList(undefined)).toBe(family)
  })
})
