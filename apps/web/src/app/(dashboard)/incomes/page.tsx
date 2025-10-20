import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@finapp/ui';
import { Card, CardContent } from '@finapp/ui';

export default async function IncomesPage() {
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

  const total = incomes?.reduce((sum, inc) => sum + Number(inc.amount), 0) ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Príjmy</h1>
          <p className="text-muted-foreground">Správa vašich príjmov</p>
        </div>
        <Link href="/dashboard/incomes/new">
          <Button>➕ Nový príjem</Button>
        </Link>
      </div>

      {/* Summary */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Celkové príjmy</p>
              <p className="text-3xl font-bold">{total.toFixed(2)} €</p>
            </div>
            <div className="text-4xl">💵</div>
          </div>
        </CardContent>
      </Card>

      {/* Incomes List */}
      {!incomes || incomes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-6xl mb-4">💵</div>
            <h3 className="text-lg font-semibold mb-2">Žiadne príjmy</h3>
            <p className="text-muted-foreground text-center mb-4">
              Zatiaľ nemáte zaznamenané žiadne príjmy.
            </p>
            <Link href="/dashboard/incomes/new">
              <Button>Pridať prvý príjem</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4">Dátum</th>
                    <th className="text-left p-4">Kategória</th>
                    <th className="text-left p-4">Zdroj</th>
                    <th className="text-left p-4">Poznámka</th>
                    <th className="text-right p-4">Suma</th>
                  </tr>
                </thead>
                <tbody>
                  {incomes.map((income) => (
                    <tr key={income.id} className="border-b hover:bg-muted/50">
                      <td className="p-4">
                        {new Date(income.date).toLocaleDateString('sk-SK')}
                      </td>
                      <td className="p-4">
                        <span className="inline-block px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">
                          {income.categories?.name}
                        </span>
                      </td>
                      <td className="p-4 font-medium">{income.source}</td>
                      <td className="p-4 text-muted-foreground max-w-xs truncate">
                        {income.note || '-'}
                      </td>
                      <td className="p-4 text-right font-medium text-green-600">
                        +{Number(income.amount).toFixed(2)} €
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

