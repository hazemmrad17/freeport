export type TierName = 'Public Utility' | 'Pro Supporter' | 'Power User' | 'One-Time Support'

export interface Tier {
  name: TierName
  description: string
  features: string[]
  /** What the button does: open Paddle checkout, or a no-op/free path. */
  cta: { label: string; kind: 'checkout' | 'free' | 'byok' }
  /** Only present for checkout tiers. */
  priceId?: { month: string; year: string }
}

export const TIERS: Tier[] = [
  {
    name: 'Public Utility',
    description: 'Free forever, funded by unobtrusive sponsor lines',
    features: [
      '3 active sessions / day (1-hour slots)',
      'Fast Flash models (Ox Alpha, DeepSeek V4 Flash)',
      '1–2 terminal developer text ads per session',
      'Daily spend cap keeps the service sustainable',
    ],
    cta: { label: 'Start Free', kind: 'free' },
  },
  {
    name: 'Pro Supporter',
    description: 'Double quota, zero ads, priority routing',
    features: [
      '6 active sessions / day (2× free quota)',
      'Priority queue routing + Flash Reasoning fallback',
      '100% ad-free',
      'Hard session cap — no surprise spend, ever',
    ],
    cta: { label: 'Subscribe', kind: 'checkout' },
    priceId: {
      month: 'pri_01m0jk57xcf1q8t3j6shn9eye1', // Pro Supporter Monthly ($6.00)
      year: 'pri_01m0jk60rczgbvfwmjs3wp8f2y', // Pro Supporter Annually ($49.99)
    },
  },
  {
    name: 'One-Time Support',
    description: 'Fund inference for developers worldwide — no recurring commitment',
    features: [
      'Funds ~100 free sessions for other developers',
      'Your name on the supporters wall (optional)',
      'Directly covers inference costs — zero overhead',
      'Any amount — $5, $10, $25, or custom',
    ],
    cta: { label: 'Support Freeport', kind: 'checkout' },
    priceId: {
      // TODO: Create a one-time price in Paddle dashboard and paste the ID here
      // Go to Paddle → Catalog → Products → Add product "Support Freeport"
      // Set type to "One-time" and price to $10 (or leave flexible)
      // Then paste the price IDs below:
      month: '', // one-time price ID from Paddle
      year: '', // same one-time price ID (Paddle doesn't distinguish month/year for one-time)
    },
  },
  {
    name: 'Power User',
    description: 'Bring your own key, unlimited everything',
    features: [
      'Unlimited sessions — no quota, no caps',
      'Any model your key supports (OpenRouter & more)',
      '100% ad-free',
      'Runs entirely on your own account',
    ],
    cta: { label: 'Use --key YOUR_API_KEY', kind: 'byok' },
  },
]
