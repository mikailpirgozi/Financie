import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@finapp/ui';
import { VehicleForm } from '@/components/vehicles';

export default async function NewVehiclePage(): Promise<React.ReactNode> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

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
          <h1 className="text-3xl font-bold">Nové vozidlo</h1>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-6xl mb-4">🚫</div>
            <h3 className="text-lg font-semibold mb-2">Žiadna domácnosť</h3>
            <p className="text-muted-foreground text-center mb-4">
              Nemáte priradenú žiadnu domácnosť.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/vehicles" className="text-sm text-muted-foreground hover:underline">
          ← Späť na vozidlá
        </Link>
        <h1 className="text-3xl font-bold mt-2">Nové vozidlo</h1>
        <p className="text-muted-foreground">
          Pridajte nové vozidlo do evidencie
        </p>
      </div>

      <VehicleForm householdId={membership.household_id} mode="create" />
    </div>
  );
}
