import { createClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@finapp/ui';
import { IncomesPageClient } from './IncomesPageClient';
import { getCurrentSession } from '@/lib/auth/session';

export default async function IncomesPage(): Promise<React.ReactNode> {
  const { user, householdId } = await getCurrentSession();
  if (!user) return null;

  if (!householdId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Príjmy</h1>
          <p className="text-muted-foreground">Správa vašich príjmov</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-6xl mb-4">⚠️</div>
            <h3 className="text-lg font-semibold mb-2">Žiadna domácnosť</h3>
            <p className="text-muted-foreground text-center mb-4">
              Nemáte priradenú žiadnu domácnosť. Kontaktujte administrátora alebo sa zaregistrujte
              znova.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const supabase = await createClient();

  // Paralelne – 3 nezávislé queries (predtým sériovo, ~3x latency).
  // POZN.: select('*') ostáva kvôli placeholder database.types; column-targeting
  // dorobíme v Phase 4 spolu s regeneráciou typov.
  const [incomesResult, templatesResult, categoriesResult] = await Promise.all([
    supabase
      .from('incomes')
      .select(`*, categories (id, name)`)
      .eq('household_id', householdId)
      .order('date', { ascending: false })
      .limit(50),

    supabase
      .from('income_templates')
      .select(`*, categories (id, name)`)
      .eq('household_id', householdId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true }),

    supabase
      .from('categories')
      .select('id, name')
      .eq('household_id', householdId)
      .eq('kind', 'income')
      .order('name', { ascending: true }),
  ]);

  const incomes = incomesResult.data ?? [];
  const templates = templatesResult.data ?? [];
  const categories = categoriesResult.data ?? [];
  const total = incomes.reduce((sum, inc) => sum + Number(inc.amount), 0);

  return (
    <IncomesPageClient
      incomes={incomes}
      templates={templates}
      categories={categories}
      householdId={householdId}
      total={total}
    />
  );
}
