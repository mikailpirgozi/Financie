import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@finapp/ui';
import { Card, CardContent } from '@finapp/ui';
import { AssetsClient } from './AssetsClient';

export default async function AssetsPage(): Promise<React.ReactNode> {
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
          <h1 className="text-3xl font-bold">Majetok</h1>
          <p className="text-muted-foreground">Správa vášho majetku</p>
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

  // Get assets – pridany limit (ostatne stlpce vyfiltruje typovany consumer).
  // POZN.: select('*') ostal kvoli placeholder database.types; po regenerácii v
  // Phase 4 sa prepise na cieleny zoznam stlpcov.
  const { data: assets } = await supabase
    .from('assets')
    .select('*')
    .eq('household_id', membership.household_id)
    .order('created_at', { ascending: false })
    .limit(200);

  const totalValue = assets?.reduce((sum, asset) => sum + Number(asset.current_value), 0) ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Majetok</h1>
          <p className="text-muted-foreground">Správa vášho majetku</p>
        </div>
        <Link href="/dashboard/assets/new">
          <Button>➕ Nový majetok</Button>
        </Link>
      </div>

      {/* Summary */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Celková hodnota majetku</p>
              <p className="text-3xl font-bold">{totalValue.toFixed(2)} €</p>
            </div>
            <div className="text-4xl">🏠</div>
          </div>
        </CardContent>
      </Card>

      {/* Assets List */}
      {!assets || assets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-6xl mb-4">🏠</div>
            <h3 className="text-lg font-semibold mb-2">Žiadny majetok</h3>
            <p className="text-muted-foreground text-center mb-4">
              Zatiaľ nemáte zaznamenané žiadny majetok.
            </p>
            <Link href="/dashboard/assets/new">
              <Button>Pridať prvý majetok</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <AssetsClient assets={assets} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
