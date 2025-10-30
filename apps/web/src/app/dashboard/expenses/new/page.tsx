'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@finapp/ui';
import { Input } from '@finapp/ui';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@finapp/ui';

interface Category {
  id: string;
  name: string;
}

export default function NewExpensePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [householdId, setHouseholdId] = useState<string>('');

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0] ?? '',
    amount: '',
    categoryId: '',
    merchant: '',
    note: '',
  });

  useEffect(() => {
    async function loadData() {
      try {
        // Get household
        const householdRes = await fetch('/api/households/current');
        const { householdId: hId } = await householdRes.json();
        setHouseholdId(hId);

        // Get categories
        const categoriesRes = await fetch(`/api/categories?householdId=${hId}&kind=expense`);
        const { categories: cats } = await categoriesRes.json();
        setCategories(cats);
        if (cats.length > 0) {
          setFormData((prev) => ({ ...prev, categoryId: cats[0].id }));
        }
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
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          householdId,
          date: formData.date,
          amount: parseFloat(formData.amount),
          categoryId: formData.categoryId,
          merchant: formData.merchant || undefined,
          note: formData.note || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Vytvorenie výdavku zlyhalo');
      }

      router.push('/dashboard/expenses');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Neznáma chyba');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Nový výdavok</h1>
        <p className="text-muted-foreground">Zaznamenajte nový výdavok</p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Detaily výdavku</CardTitle>
            <CardDescription>Vyplňte informácie o výdavku</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="date" className="text-sm font-medium">
                  Dátum *
                </label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="amount" className="text-sm font-medium">
                  Suma (€) *
                </label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="categoryId" className="text-sm font-medium">
                Kategória *
              </label>
              <select
                id="categoryId"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                required
                disabled={loading}
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="merchant" className="text-sm font-medium">
                Obchodník
              </label>
              <Input
                id="merchant"
                placeholder="Názov obchodu"
                value={formData.merchant}
                onChange={(e) => setFormData({ ...formData, merchant: e.target.value })}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="note" className="text-sm font-medium">
                Poznámka
              </label>
              <Input
                id="note"
                placeholder="Voliteľná poznámka"
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                disabled={loading}
              />
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? 'Ukladám...' : 'Uložiť výdavok'}
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


