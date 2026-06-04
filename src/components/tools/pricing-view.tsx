'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

const plans = [
  {
    name: 'Free',
    price: '₹0',
    period: '/month',
    description: 'Get started with basic features',
    features: [
      '5 Cases', '10 Documents', 'Basic AI Drafting', 'Case Management',
      'Client Directory', 'Email Support',
    ],
    cta: 'Current Plan',
    highlighted: false,
  },
  {
    name: 'Professional',
    price: '₹999',
    period: '/month',
    description: 'For practicing advocates',
    features: [
      'Unlimited Cases', 'Unlimited Documents', 'Advanced AI Drafting',
      'AI Legal Research', 'Litigation Tools', 'Defense Builder',
      'Priority Support', 'PDF Generation with Letterhead',
    ],
    cta: 'Upgrade to Pro',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: '₹2,999',
    period: '/month',
    description: 'For law firms and teams',
    features: [
      'Everything in Pro', 'Team Collaboration', 'Firm Analytics',
      'Custom Templates', 'API Access', 'Dedicated Support',
      'Bulk Document Processing', 'White Label Option',
    ],
    cta: 'Contact Sales',
    highlighted: false,
  },
];

export function PricingView() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">Pricing Plans</h1>
        <p className="text-sm text-muted-foreground mt-1">Choose the plan that fits your practice.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {plans.map((plan) => (
          <Card key={plan.name} className={cn(
            'border-border/50 relative',
            plan.highlighted && 'border-primary shadow-lg shadow-primary/10'
          )}>
            {plan.highlighted && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground gap-1">
                  <Star className="h-3 w-3" /> Popular
                </Badge>
              </div>
            )}
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{plan.name}</CardTitle>
              <CardDescription className="text-xs">{plan.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <span className="text-3xl font-bold">{plan.price}</span>
                <span className="text-sm text-muted-foreground">{plan.period}</span>
              </div>
              <ul className="space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                className={cn('w-full', plan.highlighted ? '' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80')}
                variant={plan.highlighted ? 'default' : 'secondary'}
              >
                {plan.cta}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
