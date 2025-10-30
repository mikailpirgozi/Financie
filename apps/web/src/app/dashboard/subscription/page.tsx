import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@finapp/ui';
import { PricingPlans } from '@/components/subscription/PricingPlans';
import { CurrentSubscription } from '@/components/subscription/CurrentSubscription';

export default async function SubscriptionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Get user's subscription (from profiles table)
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_plan, subscription_status, subscription_period_end')
    .eq('id', user.id)
    .single();

  const currentPlan = profile?.subscription_plan || 'free';
  const subscriptionStatus = profile?.subscription_status || 'active';
  const periodEnd = profile?.subscription_period_end;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Predplatné</h1>
        <p className="text-muted-foreground">
          Spravujte svoje predplatné a vyberajte si plány
        </p>
      </div>

      {currentPlan !== 'free' && (
        <CurrentSubscription
          plan={currentPlan}
          status={subscriptionStatus}
          periodEnd={periodEnd}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Cenové plány</CardTitle>
          <CardDescription>
            Vyberte si plán, ktorý najlepšie vyhovuje vašim potrebám
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PricingPlans currentPlan={currentPlan} />
        </CardContent>
      </Card>
    </div>
  );
}

