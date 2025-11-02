'use client';

import { useState } from 'react';
import { Button } from '@finapp/ui';
import { Check, Sparkles } from 'lucide-react';
import { STRIPE_PLANS, PlanId } from '@/lib/stripe/config';

interface PricingPlansProps {
  currentPlan: string;
}

export function PricingPlans({ currentPlan }: PricingPlansProps): React.JSX.Element {
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleSubscribe = async (planId: PlanId) => {
    if (planId === 'free') return;

    setIsLoading(planId);
    try {
      const response = await fetch('/api/subscription/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        alert('Nepodarilo sa vytvoriť checkout session');
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      alert('Nastala chyba pri vytváraní platby');
    } finally {
      setIsLoading(null);
    }
  };

  const plans = Object.values(STRIPE_PLANS);

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {plans.map((plan) => {
        const isCurrentPlan = currentPlan === plan.id;
        const isPro = plan.id === 'pro';

        return (
          <div
            key={plan.id}
            className={`relative rounded-lg border-2 p-6 ${
              isPro
                ? 'border-primary shadow-lg scale-105'
                : 'border-border'
            }`}
          >
            {isPro && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center gap-1 bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium">
                  <Sparkles className="h-3 w-3" />
                  Najpopulárnejší
                </span>
              </div>
            )}

            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-4xl font-bold">€{plan.price}</span>
                <span className="text-muted-foreground">/mesiac</span>
              </div>
            </div>

            <ul className="space-y-3 mb-6">
              {plan.features.map((feature, index) => (
                <li key={index} className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>

            {isCurrentPlan ? (
              <Button disabled className="w-full">
                Aktuálny plán
              </Button>
            ) : plan.id === 'free' ? (
              <Button variant="outline" disabled className="w-full">
                Free plán
              </Button>
            ) : (
              <Button
                onClick={() => handleSubscribe(plan.id as PlanId)}
                disabled={isLoading !== null}
                className="w-full"
                variant={isPro ? 'default' : 'outline'}
              >
                {isLoading === plan.id ? 'Načítavam...' : 'Vybrať plán'}
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}

