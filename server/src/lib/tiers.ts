export interface Tier {
  name: 'Starter' | 'Pro' | 'Advanced'
  description: string
  features: string[]
  priceId: { month: string; year: string }
}

export const TIERS: Tier[] = [
  {
    name: 'Starter',
    description: 'For individual developers getting started',
    features: [
      '200 sessions/day',
      'All models included',
      'Priority support',
      'Ad-free experience',
    ],
    priceId: {
      month: 'price_starter_monthly',  // TODO: replace with real Paddle price ID
      year: 'price_starter_yearly',    // TODO: replace with real Paddle price ID
    },
  },
  {
    name: 'Pro',
    description: 'For professional developers and small teams',
    features: [
      '500 sessions/day',
      'All models included',
      'Priority support',
      'Ad-free experience',
      'API access',
      'Usage analytics',
    ],
    priceId: {
      month: 'pri_01m0hrq2hexvc9mxac86tarf59',
      year: 'pri_01m0hrq2hexvc9mxac86tarf59_yearly',  // TODO: replace with real yearly price ID
    },
  },
  {
    name: 'Advanced',
    description: 'For teams and organizations',
    features: [
      'Unlimited sessions',
      'All models included',
      'Dedicated support',
      'Ad-free experience',
      'API access',
      'Usage analytics',
      'Custom integrations',
      'SLA guarantee',
    ],
    priceId: {
      month: 'price_advanced_monthly',  // TODO: replace with real Paddle price ID
      year: 'price_advanced_yearly',    // TODO: replace with real Paddle price ID
    },
  },
]
