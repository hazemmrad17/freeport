import type { freeportIpPrivacySignal } from '../types/freeport-session'

export const FREEPORT_HARD_BLOCKED_PRIVACY_SIGNALS = [
  'vpn',
  'proxy',
  'tor',
  'res_proxy',
] as const satisfies readonly freeportIpPrivacySignal[]

type freeportHardBlockedPrivacySignal =
  (typeof FREEPORT_HARD_BLOCKED_PRIVACY_SIGNALS)[number]

const FREEPORT_HARD_BLOCKED_PRIVACY_SIGNAL_SET =
  new Set<freeportIpPrivacySignal>(FREEPORT_HARD_BLOCKED_PRIVACY_SIGNALS)

const FREEPORT_HARD_BLOCKED_PRIVACY_SIGNAL_LABELS: Record<
  freeportHardBlockedPrivacySignal,
  string
> = {
  vpn: 'VPN',
  proxy: 'proxy',
  res_proxy: 'proxy',
  tor: 'Tor',
}

export function isfreeportHardBlockedPrivacySignal(
  signal: freeportIpPrivacySignal,
): signal is freeportHardBlockedPrivacySignal {
  return FREEPORT_HARD_BLOCKED_PRIVACY_SIGNAL_SET.has(signal)
}

/**
 * ipinfo's `as.type` classifies the owning ASN as one of: ISP, Hosting,
 * Education, Government or Business (see ipinfo's "IPinfo Plus" sample DB).
 * Only `hosting` is a meaningful abuse signal ΓÇö that's where VPN/proxy exits
 * and bot infrastructure live. The other classes are ordinary networks real
 * users sit behind, so we treat them as benign even when other heuristics
 * (e.g. ipinfo's `is_hosting` flag) would otherwise fire.
 */
const FREEPORT_BENIGN_AS_TYPES = new Set([
  'isp',
  'business',
  'education',
  'government',
])

export function isfreeportBenignAsType(
  asType: string | null | undefined,
): boolean {
  return asType != null && FREEPORT_BENIGN_AS_TYPES.has(asType.toLowerCase())
}

export function isfreeportHostingAsType(
  asType: string | null | undefined,
): boolean {
  return typeof asType === 'string' && asType.toLowerCase() === 'hosting'
}

export function formatfreeportHardBlockedPrivacySignals(
  signals: readonly freeportIpPrivacySignal[] | null | undefined,
): string {
  const labels = Array.from(
    new Set(
      (signals ?? []).flatMap((signal): string[] => {
        if (!isfreeportHardBlockedPrivacySignal(signal)) return []
        return [FREEPORT_HARD_BLOCKED_PRIVACY_SIGNAL_LABELS[signal]]
      }),
    ),
  )

  if (labels.length === 0) return 'VPN, proxy, or Tor'
  if (labels.length === 1) return labels[0]
  return `${labels.slice(0, -1).join(', ')} or ${labels[labels.length - 1]}`
}

export function formatfreeportHardBlockedMessage(
  signals: readonly freeportIpPrivacySignal[] | null | undefined,
): string {
  return `FREEPORT cannot be used from ${formatfreeportHardBlockedPrivacySignals(
    signals,
  )} traffic. Please disable it and try again.`
}
