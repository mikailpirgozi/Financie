import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@finapp/ui';
import { Card, CardContent } from '@finapp/ui';
import { ExpensesClient } from './ExpensesClient';

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

  if (!membership) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Výdavky</h1>
          <p className="text-muted-foreground">Správa vašich výdavkov</p>
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
            <ExpensesClient expenses={expenses} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}


