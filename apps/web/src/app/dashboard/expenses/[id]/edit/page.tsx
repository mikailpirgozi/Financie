'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@finapp/ui';
import { Input } from '@finapp/ui';
import { Card, CardHeader, CardTitle, CardContent } from '@finapp/ui';

interface Category {
  id: string;
  name: string;
}

export default function EditExpensePage({ params }: { params: { id: string } }): React.JSX.Element {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [date, setDate] = useState('');
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        // Load expense
        const expenseRes = await fetch(`/api/expenses/${params.id}`);
        if (!expenseRes.ok) throw new Error('Nepodarilo sa načítať výdavok');
        const { expense } = await expenseRes.json();

        setDate(expense.date);
        setAmount(expense.amount.toString());
        setMerchant(expense.merchant || '');
        setCategoryId(expense.category_id);
        setNote(expense.note || '');

        // Load categories
        const householdRes = await fetch('/api/households/current');
        const { household } = await householdRes.json();

        const categoriesRes = await fetch(`/api/categories?householdId=${household.id}&kind=expense`);
        const { categories: cats } = await categoriesRes.json();
        setCategories(cats);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Chyba pri načítaní');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [params.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/expenses/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          amount: parseFloat(amount),
          merchant: merchant || null,
          categoryId,
          note: note || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Nepodarilo sa uložiť');
      }

      router.push('/dashboard/expenses');
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
        <Link href="/dashboard/expenses">
          <Button variant="ghost" size="sm">
            ← Späť na výdavky
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upraviť výdavok</CardTitle>
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
                Obchodník
              </label>
              <Input
                type="text"
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
                placeholder="napr. Tesco, Kaufland"
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
              <Link href="/dashboard/expenses" className="flex-1">
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

