import { createClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@finapp/ui';
import { CategoriesClient } from './CategoriesClient';

export default async function CategoriesPage() {
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

  if (!membership) return null;

  // Get categories
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .eq('household_id', membership.household_id)
    .order('kind', { ascending: true })
    .order('name', { ascending: true });

  const expenseCategories = categories?.filter((c) => c.kind === 'expense') ?? [];
  const incomeCategories = categories?.filter((c) => c.kind === 'income') ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Kategórie</h1>
        <p className="text-muted-foreground">Správa kategórií pre výdavky a príjmy</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <CategoriesClient
            expenseCategories={expenseCategories}
            incomeCategories={incomeCategories}
          />
        </CardContent>
      </Card>
    </div>
  );
}


