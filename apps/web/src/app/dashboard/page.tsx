import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { getCurrentSession } from '@/lib/auth/session';
import { DashboardClient } from './DashboardClient';

export default async function DashboardPage(): Promise<React.JSX.Element> {
  // Server-side: housedholdId získame raz v RSC (cache() deduplikuje s layoutom)
  const { householdId } = await getCurrentSession();

  if (!householdId) {
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

  return <DashboardClient householdId={householdId} />;
}
