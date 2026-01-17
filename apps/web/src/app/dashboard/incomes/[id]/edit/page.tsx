'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@finapp/ui';
import { Input } from '@finapp/ui';
import { Card, CardHeader, CardTitle, CardContent } from '@finapp/ui';

interface Category {
  id: string;
  name: string;
}

export default function EditIncomePage(): React.JSX.Element {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const incomeId = params.id;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [date, setDate] = useState('');
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        // Load income
        const incomeRes = await fetch(`/api/incomes/${incomeId}`);
        if (!incomeRes.ok) throw new Error('Nepodarilo sa načítať príjem');
        const { income } = await incomeRes.json();

        setDate(income.date);
        setAmount(income.amount.toString());
        setSource(income.source);
        setCategoryId(income.category_id);
        setNote(income.note || '');

        // Load categories
        const householdRes = await fetch('/api/households/current');
        const { household } = await householdRes.json();

        const categoriesRes = await fetch(`/api/categories?householdId=${household.id}&kind=income`);
        const { categories: cats } = await categoriesRes.json();
        setCategories(cats);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Chyba pri načítaní');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [incomeId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/incomes/${incomeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          amount: parseFloat(amount),
          source,
          categoryId,
          note: note || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Nepodarilo sa uložiť');
      }

      router.push('/dashboard/incomes');
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
        <Link href="/dashboard/incomes">
          <Button variant="ghost" size="sm">
            ← Späť na príjmy
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upraviť príjem</CardTitle>
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
                Dátum *
              </label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Suma (€) *
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Zdroj *
              </label>
              <Input
                type="text"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="napr. Mzda, Freelance"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Kategória *
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full border rounded-md px-3 py-2"
                required
              >
                <option value="">Vyberte kategóriu</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Poznámka
              </label>
              <Input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Voliteľná poznámka"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={saving} className="flex-1">
                {saving ? 'Ukladám...' : 'Uložiť zmeny'}
              </Button>
              <Link href="/dashboard/incomes" className="flex-1">
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

