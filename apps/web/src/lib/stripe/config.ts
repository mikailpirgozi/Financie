export const STRIPE_PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    interval: 'month' as const,
    features: [
      '1 domácnosť',
      '3 členovia max',
      'Základné funkcie',
      'Mesačné výkazy',
      'Export do CSV',
    ],
    limits: {
      households: 1,
      members: 3,
      loans: 5,
      categories: 10,
    },
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 9.99,
    interval: 'month' as const,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID,
    features: [
      '3 domácnosti',
      'Neobmedzený počet členov',
      'Všetky funkcie',
      'Prioritná podpora',
      'Export do PDF',
      'Pokročilé grafy',
    ],
    limits: {
      households: 3,
      members: -1, // unlimited
      loans: -1,
      categories: -1,
    },
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    price: 19.99,
    interval: 'month' as const,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID,
    features: [
      'Neobmedzené domácnosti',
      'Neobmedzený počet členov',
      'Všetky funkcie',
      'VIP podpora',
      'API prístup',
      'Vlastné reporty',
      'White-label možnosti',
    ],
    limits: {
      households: -1,
      members: -1,
      loans: -1,
      categories: -1,
    },
  },
} as const;

export type PlanId = keyof typeof STRIPE_PLANS;

