import { createClient } from '@/lib/supabase/server';
import { Card, CardHeader, CardTitle, CardContent } from '@finapp/ui';

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

      <div className="grid gap-6 md:grid-cols-2">
        {/* Expense Categories */}
        <Card>
          <CardHeader>
            <CardTitle>Kategórie výdavkov</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {expenseCategories.length === 0 ? (
                <p className="text-sm text-muted-foreground">Žiadne kategórie</p>
              ) : (
                expenseCategories.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50"
                  >
                    <span className="font-medium">{category.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {category.created_at
                        ? new Date(category.created_at).toLocaleDateString('sk-SK')
                        : ''}
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Income Categories */}
        <Card>
          <CardHeader>
            <CardTitle>Kategórie príjmov</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {incomeCategories.length === 0 ? (
                <p className="text-sm text-muted-foreground">Žiadne kategórie</p>
              ) : (
                incomeCategories.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50"
                  >
                    <span className="font-medium">{category.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {category.created_at
                        ? new Date(category.created_at).toLocaleDateString('sk-SK')
                        : ''}
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

