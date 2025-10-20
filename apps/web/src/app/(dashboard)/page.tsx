import { createClient } from '@/lib/supabase/server';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@finapp/ui';

export default async function DashboardPage() {
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
      <div className="flex items-center justify-center h-full">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Vitajte v FinApp</CardTitle>
            <CardDescription>
              Zatiaľ nemáte vytvorenú domácnosť. Kontaktujte administrátora.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Get stats
  const { data: loans } = await supabase
    .from('loans')
    .select('id, principal, status')
    .eq('household_id', membership.household_id)
    .eq('status', 'active');

  const { data: expenses } = await supabase
    .from('expenses')
    .select('amount')
    .eq('household_id', membership.household_id)
    .gte('date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);

  const { data: incomes } = await supabase
    .from('incomes')
    .select('amount')
    .eq('household_id', membership.household_id)
    .gte('date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);

  const { data: assets } = await supabase
    .from('assets')
    .select('current_value')
    .eq('household_id', membership.household_id);

  const totalLoans = loans?.reduce((sum, loan) => sum + Number(loan.principal), 0) ?? 0;
  const monthlyExpenses = expenses?.reduce((sum, exp) => sum + Number(exp.amount), 0) ?? 0;
  const monthlyIncomes = incomes?.reduce((sum, inc) => sum + Number(inc.amount), 0) ?? 0;
  const totalAssets = assets?.reduce((sum, asset) => sum + Number(asset.current_value), 0) ?? 0;

  const stats = [
    {
      title: 'Aktívne úvery',
      value: `${loans?.length ?? 0}`,
      description: `Celková istina: ${totalLoans.toFixed(2)} €`,
      icon: '💰',
    },
    {
      title: 'Mesačné výdavky',
      value: `${monthlyExpenses.toFixed(2)} €`,
      description: 'Tento mesiac',
      icon: '💸',
    },
    {
      title: 'Mesačné príjmy',
      value: `${monthlyIncomes.toFixed(2)} €`,
      description: 'Tento mesiac',
      icon: '💵',
    },
    {
      title: 'Celkový majetok',
      value: `${totalAssets.toFixed(2)} €`,
      description: 'Aktuálna hodnota',
      icon: '🏠',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Prehľad vašich financií
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <span className="text-2xl">{stat.icon}</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Rýchle akcie</CardTitle>
            <CardDescription>Často používané funkcie</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <a
              href="/dashboard/loans/new"
              className="block rounded-lg border p-3 hover:bg-accent transition-colors"
            >
              <div className="font-medium">➕ Pridať úver</div>
              <div className="text-sm text-muted-foreground">
                Vytvorte nový úver s automatickým harmonogramom
              </div>
            </a>
            <a
              href="/dashboard/expenses"
              className="block rounded-lg border p-3 hover:bg-accent transition-colors"
            >
              <div className="font-medium">💸 Pridať výdavok</div>
              <div className="text-sm text-muted-foreground">
                Zaznamenajte nový výdavok
              </div>
            </a>
            <a
              href="/dashboard/incomes"
              className="block rounded-lg border p-3 hover:bg-accent transition-colors"
            >
              <div className="font-medium">💵 Pridať príjem</div>
              <div className="text-sm text-muted-foreground">
                Zaznamenajte nový príjem
              </div>
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Nadchádzajúce splátky</CardTitle>
            <CardDescription>Najbližšie 7 dní</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              Zatiaľ žiadne nadchádzajúce splátky
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

