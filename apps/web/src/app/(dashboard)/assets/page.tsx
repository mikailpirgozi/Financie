import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@finapp/ui';
import { Card, CardHeader, CardTitle, CardContent } from '@finapp/ui';

export default async function AssetsPage() {
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

  // Get assets
  const { data: assets } = await supabase
    .from('assets')
    .select('*')
    .eq('household_id', membership.household_id)
    .order('created_at', { ascending: false });

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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {assets.map((asset) => (
            <Link key={asset.id} href={`/dashboard/assets/${asset.id}`}>
              <Card className="hover:border-primary transition-colors cursor-pointer">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{asset.name}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {asset.kind === 'real_estate' && '🏠 Nehnuteľnosť'}
                        {asset.kind === 'vehicle' && '🚗 Vozidlo'}
                        {asset.kind === 'business' && '💼 Podnikanie'}
                        {asset.kind === 'loan_receivable' && '💰 Poskytnutá pôžička'}
                        {asset.kind === 'other' && '📦 Iné'}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Nákupná cena:</span>
                    <span className="font-medium">
                      {Number(asset.acquisition_value).toFixed(2)} €
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Aktuálna hodnota:</span>
                    <span className="font-medium text-primary">
                      {Number(asset.current_value).toFixed(2)} €
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Zmena:</span>
                    <span
                      className={`font-medium ${
                        Number(asset.current_value) >= Number(asset.acquisition_value)
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}
                    >
                      {(
                        ((Number(asset.current_value) - Number(asset.acquisition_value)) /
                          Number(asset.acquisition_value)) *
                        100
                      ).toFixed(1)}
                      %
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

