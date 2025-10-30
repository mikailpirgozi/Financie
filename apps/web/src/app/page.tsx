import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Button } from '@finapp/ui';
import { createClient } from '@/lib/supabase/server';

export default async function HomePage() {
  // Check if user is authenticated
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // If authenticated, redirect to dashboard
  if (user) {
    redirect('/dashboard');
  }

  return (
    <main className="flex min-h-screen flex-col">
      {/* Hero Section */}
      <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
        <div className="max-w-4xl space-y-6">
          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
            FinApp
          </h1>
          <p className="text-xl text-muted-foreground sm:text-2xl">
            Inteligentná správa osobných financií
          </p>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Majte úplný prehľad o vašich úveroch, výdavkoch, príjmoch a majetku na jednom mieste.
            Automatické výpočty, mesačné prehľady a notifikácie.
          </p>
          
          <div className="flex gap-4 justify-center pt-4">
            <Link href="/auth/register">
              <Button size="lg">
                Začať zadarmo
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button size="lg" variant="outline">
                Prihlásiť sa
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="border-t bg-muted/30 p-8">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-3xl font-bold mb-12">
            Hlavné funkcie
          </h2>
          <div className="grid gap-8 md:grid-cols-3">
            <div className="space-y-3 text-center">
              <div className="text-4xl">💰</div>
              <h3 className="text-xl font-semibold">Úvery</h3>
              <p className="text-muted-foreground">
                Presné výpočty splátok s rozpadom istiny, úroku a poplatkov. 
                Podpora pre 3 typy úverov.
              </p>
            </div>
            <div className="space-y-3 text-center">
              <div className="text-4xl">📊</div>
              <h3 className="text-xl font-semibold">Výdavky & Príjmy</h3>
              <p className="text-muted-foreground">
                Kategorizácia, automatické pravidlá a mesačné prehľady 
                vašich financií.
              </p>
            </div>
            <div className="space-y-3 text-center">
              <div className="text-4xl">🏠</div>
              <h3 className="text-xl font-semibold">Majetok</h3>
              <p className="text-muted-foreground">
                Sledovanie hodnoty majetku s automatickým preceňovaním 
                a históriou oceňovania.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t p-6 text-center text-sm text-muted-foreground">
        <p>© 2024 FinApp. Všetky práva vyhradené.</p>
      </footer>
    </main>
  );
}
