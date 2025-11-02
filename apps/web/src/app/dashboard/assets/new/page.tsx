'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@finapp/ui';
import { Input } from '@finapp/ui';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@finapp/ui';

export default function NewAssetPage(): React.JSX.Element {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [householdId, setHouseholdId] = useState<string>('');

  const [formData, setFormData] = useState({
    name: '',
    kind: 'real_estate' as 'real_estate' | 'vehicle' | 'business' | 'loan_receivable' | 'other',
    acquisitionValue: '',
    currentValue: '',
    acquisitionDate: new Date().toISOString().split('T')[0] ?? '',
    indexEnabled: false,
    indexPercentage: '',
  });

  useEffect(() => {
    async function loadData() {
      try {
        const householdRes = await fetch('/api/households/current');
        const { householdId: hId } = await householdRes.json();
        setHouseholdId(hId);
      } catch (err) {
        setError('Načítanie dát zlyhalo');
      }
    }
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          householdId,
          name: formData.name,
          kind: formData.kind,
          acquisitionValue: parseFloat(formData.acquisitionValue),
          currentValue: parseFloat(formData.currentValue),
          acquisitionDate: formData.acquisitionDate,
          indexRule: formData.indexEnabled
            ? {
                enabled: true,
                annualPercentage: parseFloat(formData.indexPercentage),
              }
            : undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Vytvorenie majetku zlyhalo');
      }

      router.push('/dashboard/assets');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Neznáma chyba');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Nový majetok</h1>
        <p className="text-muted-foreground">Pridajte nový majetok do portfólia</p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Detaily majetku</CardTitle>
            <CardDescription>Vyplňte informácie o majetku</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Názov *
              </label>
              <Input
                id="name"
                placeholder="Názov majetku"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="kind" className="text-sm font-medium">
                Typ majetku *
              </label>
              <select
                id="kind"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.kind}
                onChange={(e) =>
                  setFormData({ ...formData, kind: e.target.value as typeof formData.kind })
                }
                required
                disabled={loading}
              >
                <option value="real_estate">🏠 Nehnuteľnosť</option>
                <option value="vehicle">🚗 Vozidlo</option>
                <option value="business">💼 Podnikanie</option>
                <option value="loan_receivable">💰 Poskytnutá pôžička</option>
                <option value="other">📦 Iné</option>
              </select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="acquisitionValue" className="text-sm font-medium">
                  Nákupná cena (€) *
                </label>
                <Input
                  id="acquisitionValue"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.acquisitionValue}
                  onChange={(e) =>
                    setFormData({ ...formData, acquisitionValue: e.target.value })
                  }
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="currentValue" className="text-sm font-medium">
                  Aktuálna hodnota (€) *
                </label>
                <Input
                  id="currentValue"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.currentValue}
                  onChange={(e) => setFormData({ ...formData, currentValue: e.target.value })}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="acquisitionDate" className="text-sm font-medium">
                Dátum nadobudnutia *
              </label>
              <Input
                id="acquisitionDate"
                type="date"
                value={formData.acquisitionDate}
                onChange={(e) => setFormData({ ...formData, acquisitionDate: e.target.value })}
                required
                disabled={loading}
              />
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-4">
                <input
                  type="checkbox"
                  id="indexEnabled"
                  checked={formData.indexEnabled}
                  onChange={(e) =>
                    setFormData({ ...formData, indexEnabled: e.target.checked })
                  }
                  disabled={loading}
                />
                <label htmlFor="indexEnabled" className="text-sm font-medium">
                  Automatické preceňovanie
                </label>
              </div>

              {formData.indexEnabled && (
                <div className="space-y-2">
                  <label htmlFor="indexPercentage" className="text-sm font-medium">
                    Ročný index rastu/poklesu (%)
                  </label>
                  <Input
                    id="indexPercentage"
                    type="number"
                    step="0.01"
                    placeholder="5.00"
                    value={formData.indexPercentage}
                    onChange={(e) =>
                      setFormData({ ...formData, indexPercentage: e.target.value })
                    }
                    disabled={loading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Kladné číslo = rast, záporné = pokles (napr. -10 pre 10% pokles ročne)
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? 'Ukladám...' : 'Uložiť majetok'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={loading}
              >
                Zrušiť
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}


