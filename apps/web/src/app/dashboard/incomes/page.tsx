import { createClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@finapp/ui';
import { IncomesPageClient } from './IncomesPageClient';

export default async function IncomesPage(): Promise<React.ReactNode> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Get user's household
  const { data: membership } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', user.id)
    .single();

  if (!membership) {
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
              Nemáte priradenú žiadnu domácnosť. Kontaktujte administrátora alebo sa zaregistrujte znova.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get incomes
  const { data: incomes } = await supabase
    .from('incomes')
    .select(`
      *,
      categories (
        id,
        name
      )
    `)
    .eq('household_id', membership.household_id)
    .order('date', { ascending: false })
    .limit(50);

  // Get income templates
  const { data: templates } = await supabase
    .from('income_templates')
    .select(`
      *,
      categories (
        id,
        name
      )
    `)
    .eq('household_id', membership.household_id)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  // Get income categories
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name')
    .eq('household_id', membership.household_id)
    .eq('kind', 'income')
    .order('name', { ascending: true });

  const total = incomes?.reduce((sum, inc) => sum + Number(inc.amount), 0) ?? 0;

  return (
    <IncomesPageClient
      incomes={incomes ?? []}
      templates={templates ?? []}
      categories={categories ?? []}
      householdId={membership.household_id}
      total={total}
    />
  );
}


