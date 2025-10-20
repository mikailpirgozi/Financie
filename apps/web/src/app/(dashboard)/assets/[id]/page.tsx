import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Card, CardHeader, CardTitle, CardContent } from '@finapp/ui';

export default async function AssetDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Get asset
  const { data: asset, error: assetError } = await supabase
    .from('assets')
    .select('*')
    .eq('id', params.id)
    .single();

  if (assetError || !asset) {
    notFound();
  }

  // Get valuations history
  const { data: valuations } = await supabase
    .from('asset_valuations')
    .select('*')
    .eq('asset_id', params.id)
    .order('date', { ascending: false });

  const changePercent =
    ((Number(asset.current_value) - Number(asset.acquisition_value)) /
      Number(asset.acquisition_value)) *
    100;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/assets" className="text-sm text-muted-foreground hover:underline">
          ← Späť na majetok
        </Link>
        <h1 className="text-3xl font-bold mt-2">{asset.name}</h1>
        <p className="text-muted-foreground">
          {asset.kind === 'real_estate' && '🏠 Nehnuteľnosť'}
          {asset.kind === 'vehicle' && '🚗 Vozidlo'}
          {asset.kind === 'business' && '💼 Podnikanie'}
          {asset.kind === 'loan_receivable' && '💰 Poskytnutá pôžička'}
          {asset.kind === 'other' && '📦 Iné'}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Nákupná cena
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Number(asset.acquisition_value).toFixed(2)} €
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {new Date(asset.acquisition_date).toLocaleDateString('sk-SK')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Aktuálna hodnota
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {Number(asset.current_value).toFixed(2)} €
            </div>
            <p className="text-xs text-muted-foreground mt-1">Posledná aktualizácia</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Zmena hodnoty
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                changePercent >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {changePercent >= 0 ? '+' : ''}
              {changePercent.toFixed(2)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {changePercent >= 0 ? 'Zhodnotenie' : 'Pokles'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Details */}
      <Card>
        <CardHeader>
          <CardTitle>Detaily</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Typ majetku:</span>
            <span className="font-medium">
              {asset.kind === 'real_estate' && 'Nehnuteľnosť'}
              {asset.kind === 'vehicle' && 'Vozidlo'}
              {asset.kind === 'business' && 'Podnikanie'}
              {asset.kind === 'loan_receivable' && 'Poskytnutá pôžička'}
              {asset.kind === 'other' && 'Iné'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Dátum nadobudnutia:</span>
            <span className="font-medium">
              {new Date(asset.acquisition_date).toLocaleDateString('sk-SK')}
            </span>
          </div>
          {asset.index_rule && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Automatické preceňovanie:</span>
              <span className="font-medium">
                {(asset.index_rule as { annualPercentage: number }).annualPercentage}% ročne
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Valuations History */}
      {valuations && valuations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>História oceňovania</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Dátum</th>
                    <th className="text-right p-2">Hodnota</th>
                    <th className="text-center p-2">Zdroj</th>
                  </tr>
                </thead>
                <tbody>
                  {valuations.map((valuation) => (
                    <tr key={valuation.id} className="border-b hover:bg-muted/50">
                      <td className="p-2">
                        {new Date(valuation.date).toLocaleDateString('sk-SK')}
                      </td>
                      <td className="text-right p-2 font-medium">
                        {Number(valuation.value).toFixed(2)} €
                      </td>
                      <td className="text-center p-2">
                        <span
                          className={`inline-block px-2 py-1 rounded text-xs ${
                            valuation.source === 'manual'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-green-100 text-green-700'
                          }`}
                        >
                          {valuation.source === 'manual' ? 'Manuálne' : 'Automatické'}
                        </span>
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

