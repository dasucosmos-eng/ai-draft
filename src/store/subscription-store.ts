import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type PlanType = 'free' | 'pro' | 'enterprise'

export interface PlanFeature {
  name: string
  free: boolean | string
  pro: boolean | string
  enterprise: boolean | string
}

export interface PlanConfig {
  id: PlanType
  name: string
  price: number
  yearlyPrice: number
  yearlySavings: number
  description: string
  features: string[]
  highlighted: boolean
  badge?: string
  ctaText: string
}


export const FEATURE_COMPARISON: PlanFeature[] = [
  { name: 'AI Queries / day', free: '5', pro: '50', enterprise: 'Unlimited' },
  { name: 'Document Drafting', free: true, pro: true, enterprise: true },
  { name: 'Case Management', free: '5 cases', pro: '50 cases', enterprise: 'Unlimited' },
  { name: 'AI Research & Case Law', free: false, pro: true, enterprise: true },
  { name: 'Litigation Strategy', free: false, pro: true, enterprise: true },
  { name: 'AI Intake & Auto-Draft', free: false, pro: true, enterprise: true },
  { name: 'Argument Analyzer', free: false, pro: true, enterprise: true },
  { name: 'Defense Builder', free: false, pro: true, enterprise: true },
  { name: 'Civil/Criminal/Family/Execution', free: false, pro: true, enterprise: true },
  { name: 'PDF Download w/ Letterhead', free: false, pro: true, enterprise: true },
  { name: 'CRM & Client Management', free: false, pro: true, enterprise: true },
  { name: 'Cross-Device Sync', free: false, pro: true, enterprise: true },
  { name: 'Priority Support', free: false, pro: true, enterprise: true },
  { name: 'Custom AI Training', free: false, pro: false, enterprise: true },
]


export const PLANS: PlanConfig[] = [
  {
    id: 'free',
    name: 'Starter',
    price: 0,
    yearlyPrice: 0,
    yearlySavings: 0,
    description: 'Try AI-powered legal tools risk-free',
    features: [
      '5 AI queries per day',
      'Basic document drafting',
      'Case management (up to 5 cases)',
      'Document analysis (upload & summarize)',
      'Email support',
    ],
    highlighted: false,
    ctaText: 'Get Started Free',
  },
  {
    id: 'pro',
    name: 'Professional',
    price: 999,
    yearlyPrice: 7990,
    yearlySavings: 3998,
    description: 'Full AI legal suite for practicing advocates',
    features: [
      'Unlimited AI queries',
      'Advanced drafting with legal citations',
      'Full case law search (Indian Kanoon 3M+ judgments)',
      'Defense Builder & Argument Analyzer',
      'AI-powered legal research with precedent analysis',
      'Up to 100 active cases',
      'Civil, Criminal, Family & Execution modules',
      'AI Chat — your 24/7 legal assistant',
      'Priority email support',
      'API access',
    ],
    highlighted: true,
    badge: 'Most Popular',
    ctaText: 'Start Pro Trial',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 4999,
    yearlyPrice: 39990,
    yearlySavings: 19998,
    description: 'For law firms with 5+ advocates',
    features: [
      'Everything in Pro',
      'Unlimited cases & documents',
      'Custom AI model fine-tuning for your practice area',
      'Firm-wide analytics & reporting',
      'Zoho CRM integration',
      'Custom integrations (Tally, PracticeLeap, etc.)',
      'Dedicated account manager',
      'Onboarding & training for your team',
      'White-label option',
      'SLA guarantee (99.9% uptime)',
    ],
    highlighted: false,
    badge: 'Best Value',
    ctaText: 'Contact Sales',
  },
]

export interface SubscriptionState {
  plan: PlanType
  usageToday: number
  usageLimit: number
  lastReset: string
  queryHistory: { module: string; timestamp: number }[]

  // Actions
  setPlan: (plan: PlanType) => void
  incrementUsage: (module: string) => boolean  // returns false if limit reached
  resetUsage: () => void
  getRemainingQueries: () => number
  canAccessFeature: (feature: string) => boolean
  getUsageHistory: () => { module: string; timestamp: number }[]
}

export const useSubscriptionStore = create<SubscriptionState>()(
  persist(
    (set, get) => ({
      plan: 'free',
      usageToday: 0,
      usageLimit: 5,
      lastReset: new Date().toISOString().split('T')[0],
      queryHistory: [],

      setPlan: (plan) => {
        const limits: Record<PlanType, number> = { free: 5, pro: -1, enterprise: -1 }
        set({ plan, usageLimit: limits[plan], usageToday: 0 })
      },

      incrementUsage: (module) => {
        const state = get()
        const today = new Date().toISOString().split('T')[0]

        // Reset if new day
        if (state.lastReset !== today) {
          set({ usageToday: 0, lastReset: today, queryHistory: [] })
        }

        // Check limit (unlimited for pro/enterprise)
        if (state.usageLimit !== -1 && state.usageToday >= state.usageLimit) {
          return false
        }

        set({
          usageToday: state.usageToday + 1,
          queryHistory: [
            ...state.queryHistory,
            { module, timestamp: Date.now() },
          ].slice(-100), // Keep last 100 queries
        })
        return true
      },

      resetUsage: () => {
        set({
          usageToday: 0,
          lastReset: new Date().toISOString().split('T')[0],
          queryHistory: [],
        })
      },

      getRemainingQueries: () => {
        const state = get()
        if (state.usageLimit === -1) return -1 // unlimited
        return Math.max(0, state.usageLimit - state.usageToday)
      },

      canAccessFeature: (feature) => {
        const state = get()
        const proFeatures = [
          'advancedDrafting', 'caseLawSearch', 'defenseBuilder',
          'argumentAnalyzer', 'aiResearch', 'apiAccess',
        ]
        const enterpriseFeatures = [...proFeatures, 'customIntegrations', 'analytics', 'whiteLabel']

        if (state.plan === 'pro') return proFeatures.includes(feature)
        if (state.plan === 'enterprise') return enterpriseFeatures.includes(feature)
        return false // Free tier
      },

      getUsageHistory: () => get().queryHistory,
    }),
    {
      name: 'aidraft-subscription',
      storage: createJSONStorage({
        getItem: (name) => {
          if (typeof window === 'undefined') return null
          return localStorage.getItem(name)
        },
        setItem: (name, value) => {
          if (typeof window === 'undefined') return
          localStorage.setItem(name, value)
        },
        removeItem: (name) => {
          if (typeof window === 'undefined') return
          localStorage.removeItem(name)
        },
      }),
      partialize: (state) => ({
        plan: state.plan,
        usageToday: state.usageToday,
        usageLimit: state.usageLimit,
        lastReset: state.lastReset,
      }),
    }
  )
)
