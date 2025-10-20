'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button } from '@finapp/ui';
import { Calendar, CreditCard, AlertCircle } from 'lucide-react';
import { STRIPE_PLANS } from '@/lib/stripe/config';

interface CurrentSubscriptionProps {
  plan: string;
  status: string;
  periodEnd: string | null;
}

export function CurrentSubscription({ plan, status, periodEnd }: CurrentSubscriptionProps) {
  const planDetails = STRIPE_PLANS[plan as keyof typeof STRIPE_PLANS];

  const handleManageSubscription = async () => {
    try {
      const response = await fetch('/api/subscription/portal', {
        method: 'POST',
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error opening customer portal:', error);
      alert('Nepodarilo sa otvoriť správu predplatného');
    }
  };

  return (
    <Card className="border-primary/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Aktuálne predplatné
        </CardTitle>
        <CardDescription>Vaše aktuálne nastavenie predplatného</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-muted-foreground">Plán</div>
            <div className="text-2xl font-bold">{planDetails?.name || plan}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground">Cena</div>
            <div className="text-2xl font-bold">€{planDetails?.price || 0}/mes</div>
          </div>
        </div>

        {status !== 'active' && (
          <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertCircle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <div className="font-medium text-yellow-900">Predplatné nie je aktívne</div>
              <div className="text-yellow-700">
                Status: {status === 'canceled' ? 'Zrušené' : status}
              </div>
            </div>
          </div>
        )}

        {periodEnd && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>
              {status === 'active' ? 'Obnovenie' : 'Platné do'}:{' '}
              {new Date(periodEnd).toLocaleDateString('sk-SK')}
            </span>
          </div>
        )}

        <Button onClick={handleManageSubscription} variant="outline" className="w-full">
          Spravovať predplatné
        </Button>
      </CardContent>
    </Card>
  );
}

