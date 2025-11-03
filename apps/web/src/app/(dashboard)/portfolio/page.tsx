import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PortfolioOverviewCard } from '@/components/portfolio';
import { Skeleton } from '@/components/ui/skeleton';
import type { PortfolioOverview } from '@finapp/core';

async function getPortfolioData(householdId: string): Promise<PortfolioOverview | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/portfolio/overview?householdId=${householdId}`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error('Portfolio API error:', response.statusText);
      return null;
    }

    const data = await response.json();
    return data.portfolio;
  } catch (error) {
    console.error('Failed to fetch portfolio:', error);
    return null;
  }
}

async function PortfolioContent() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/auth/login');
  }

  // Get current household
  const { data: membership } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', user.id)
    .single();

  if (!membership) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Žiadna domácnosť</h2>
          <p className="text-muted-foreground">
            Zatiaľ nemáte vytvorenú domácnosť. Kontaktujte administrátora.
          </p>
        </div>
      </div>
    );
  }

  const portfolio = await getPortfolioData(membership.household_id);

  if (!portfolio) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Chyba pri načítaní</h2>
          <p className="text-muted-foreground">
            Nepodarilo sa načítať dáta portfólia. Skúste to neskôr.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Portfolio Management</h1>
        <p className="text-muted-foreground mt-2">
          Prehľad vašich majetkov, úverov a finančných metrik
        </p>
      </div>

      <PortfolioOverviewCard data={portfolio} />
    </div>
  );
}

function PortfolioSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-5 w-96 mt-2" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    </div>
  );
}

export default function PortfolioPage() {
  return (
    <Suspense fallback={<PortfolioSkeleton />}>
      <PortfolioContent />
    </Suspense>
  );
}

