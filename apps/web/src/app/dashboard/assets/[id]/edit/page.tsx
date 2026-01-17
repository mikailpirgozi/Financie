'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@finapp/ui';
import { Input } from '@finapp/ui';
import { Card, CardHeader, CardTitle, CardContent } from '@finapp/ui';

const ASSET_KINDS = [
  { value: 'real_estate', label: '🏠 Nehnuteľnosť' },
  { value: 'vehicle', label: '🚗 Vozidlo' },
  { value: 'business', label: '💼 Podnikanie' },
  { value: 'loan_receivable', label: '💰 Poskytnutá pôžička' },
  { value: 'other', label: '📦 Iné' },
];

export default function EditAssetPage(): React.JSX.Element {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const assetId = params.id;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [kind, setKind] = useState('');
  const [name, setName] = useState('');
  const [acquisitionValue, setAcquisitionValue] = useState('');
  const [currentValue, setCurrentValue] = useState('');
  const [acquisitionDate, setAcquisitionDate] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const assetRes = await fetch(`/api/assets/${assetId}`);
        if (!assetRes.ok) throw new Error('Nepodarilo sa načítať majetok');
        const { asset } = await assetRes.json();

        setKind(asset.kind);
        setName(asset.name);
        setAcquisitionValue(asset.acquisition_value.toString());
        setCurrentValue(asset.current_value.toString());
        setAcquisitionDate(asset.acquisition_date);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Chyba pri načítaní');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [assetId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/assets/${assetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind,
          name,
          acquisitionValue: parseFloat(acquisitionValue),
          currentValue: parseFloat(currentValue),
          acquisitionDate,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Nepodarilo sa uložiť');
      }

      router.push('/dashboard/assets');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chyba pri ukladaní');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Načítavam...</div>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <Link href="/dashboard/assets">
          <Button variant="ghost" size="sm">
            ← Späť na majetok
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upraviť majetok</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">
                Typ majetku *
              </label>
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value)}
                className="w-full border rounded-md px-3 py-2"
                required
              >
                <option value="">Vyberte typ</option>
                {ASSET_KINDS.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Názov *
              </label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="napr. Byt Bratislava, BMW X5"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Nákupná cena (€) *
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={acquisitionValue}
                onChange={(e) => setAcquisitionValue(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Aktuálna hodnota (€) *
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={currentValue}
                onChange={(e) => setCurrentValue(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Dátum nákupu *
              </label>
              <Input
                type="date"
                value={acquisitionDate}
                onChange={(e) => setAcquisitionDate(e.target.value)}
                required
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={saving} className="flex-1">
                {saving ? 'Ukladám...' : 'Uložiť zmeny'}
              </Button>
              <Link href="/dashboard/assets" className="flex-1">
                <Button type="button" variant="outline" className="w-full">
                  Zrušiť
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

