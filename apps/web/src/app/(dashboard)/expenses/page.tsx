import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@finapp/ui';
import { Card, CardContent } from '@finapp/ui';

export default async function ExpensesPage() {
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

  // Get expenses
  const { data: expenses } = await supabase
    .from('expenses')
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

  const total = expenses?.reduce((sum, exp) => sum + Number(exp.amount), 0) ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Výdavky</h1>
          <p className="text-muted-foreground">Správa vašich výdavkov</p>
        </div>
        <Link href="/dashboard/expenses/new">
          <Button>➕ Nový výdavok</Button>
        </Link>
      </div>

      {/* Summary */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Celkové výdavky</p>
              <p className="text-3xl font-bold">{total.toFixed(2)} €</p>
            </div>
            <div className="text-4xl">💸</div>
          </div>
        </CardContent>
      </Card>

      {/* Expenses List */}
      {!expenses || expenses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-6xl mb-4">💸</div>
            <h3 className="text-lg font-semibold mb-2">Žiadne výdavky</h3>
            <p className="text-muted-foreground text-center mb-4">
              Zatiaľ nemáte zaznamenané žiadne výdavky.
            </p>
            <Link href="/dashboard/expenses/new">
              <Button>Pridať prvý výdavok</Button>
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
                    <th className="text-left p-4">Obchodník</th>
                    <th className="text-left p-4">Poznámka</th>
                    <th className="text-right p-4">Suma</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((expense) => (
                    <tr key={expense.id} className="border-b hover:bg-muted/50">
                      <td className="p-4">
                        {new Date(expense.date).toLocaleDateString('sk-SK')}
                      </td>
                      <td className="p-4">
                        <span className="inline-block px-2 py-1 rounded-full text-xs bg-primary/10 text-primary">
                          {expense.categories?.name}
                        </span>
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {expense.merchant || '-'}
                      </td>
                      <td className="p-4 text-muted-foreground max-w-xs truncate">
                        {expense.note || '-'}
                      </td>
                      <td className="p-4 text-right font-medium">
                        {Number(expense.amount).toFixed(2)} €
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

