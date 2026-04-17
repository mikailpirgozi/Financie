import Link from 'next/link';
import { Check, Sparkles } from 'lucide-react';
import { Button } from '@finapp/ui';
import { STRIPE_PLANS } from '@/lib/stripe/config';
import { createClient } from '@/lib/supabase/server';

export const metadata = {
  title: 'Cenník — FinApp',
  description: 'Vyberte si plán, ktorý vám pomôže prevziať kontrolu nad rodinnými financiami.',
};

export default async function PricingPage(): Promise<React.JSX.Element> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const plans = Object.values(STRIPE_PLANS);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Link href="/" className="text-xl font-bold">
            FinApp
          </Link>
          <nav className="flex items-center gap-3">
            {user ? (
              <Link href="/dashboard">
                <Button variant="outline">Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link href="/auth/login">
                  <Button variant="ghost">Prihlásiť</Button>
                </Link>
                <Link href="/auth/register">
                  <Button>Vytvoriť účet</Button>
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 md:py-20">
        <div className="text-center mb-12 max-w-2xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Začnite zadarmo. Rastite s nami.</h1>
          <p className="text-muted-foreground text-lg">
            Bez záväzku, bez kreditnej karty pri Free pláne. Zrušíte kedykoľvek.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
          {plans.map((plan) => {
            const isPro = plan.id === 'pro';
            const ctaHref = user ? '/dashboard/subscription' : `/auth/register?plan=${plan.id}`;

            return (
              <div
                key={plan.id}
                className={`relative rounded-xl border-2 p-6 bg-card ${
                  isPro ? 'border-primary shadow-lg md:scale-105' : 'border-border'
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

                <Link href={ctaHref} className="block">
                  <Button className="w-full" variant={isPro ? 'default' : 'outline'}>
                    {plan.id === 'free' ? 'Začať zadarmo' : `Vybrať ${plan.name}`}
                  </Button>
                </Link>
              </div>
            );
          })}
        </div>

        <div className="mt-16 text-center text-sm text-muted-foreground max-w-2xl mx-auto space-y-2">
          <p>
            Ceny sú vrátane DPH. Predplatné si môžete kedykoľvek zmeniť alebo zrušiť v sekcii
            Predplatné.
          </p>
          <p>
            Hľadáte mobilnú aplikáciu? Stiahnite si FinApp z App Store alebo Google Play — nákupy sa
            spravujú priamo cez váš účet v obchode.
          </p>
        </div>
      </main>
    </div>
  );
}
