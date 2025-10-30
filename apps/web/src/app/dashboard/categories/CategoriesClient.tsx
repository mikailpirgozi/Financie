'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@finapp/ui';
import { Input } from '@finapp/ui';
import { DeleteDialog } from '@/components/DeleteDialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Category {
  id: string;
  name: string;
  kind: string;
  created_at?: string;
}

interface CategoriesClientProps {
  expenseCategories: Category[];
  incomeCategories: Category[];
}

export function CategoriesClient({ expenseCategories, incomeCategories }: CategoriesClientProps) {
  const router = useRouter();
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    const response = await fetch(`/api/categories/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Nepodarilo sa zmazať kategóriu');
    }

    router.refresh();
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setEditName(category.name);
    setError(null);
  };

  const handleSaveEdit = async () => {
    if (!editingCategory) return;

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/categories/${editingCategory.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Nepodarilo sa uložiť');
      }

      setEditingCategory(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chyba pri ukladaní');
    } finally {
      setSaving(false);
    }
  };

  const renderCategoryList = (categories: Category[]) => {
    if (categories.length === 0) {
      return <p className="text-sm text-muted-foreground">Žiadne kategórie</p>;
    }

    return (
      <div className="space-y-2">
        {categories.map((category) => (
          <div
            key={category.id}
            className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50"
          >
            <div className="flex-1">
              <span className="font-medium">{category.name}</span>
              {category.created_at && (
                <span className="text-xs text-muted-foreground ml-3">
                  {new Date(category.created_at).toLocaleDateString('sk-SK')}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => handleEdit(category)}>
                Upraviť
              </Button>
              <DeleteDialog
                title="Zmazať kategóriu"
                description={`Naozaj chcete zmazať kategóriu "${category.name}"? Táto akcia je nevratná.`}
                onConfirm={() => handleDelete(category.id)}
              />
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2">
        {/* Expense Categories */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Kategórie výdavkov</h3>
          {renderCategoryList(expenseCategories)}
        </div>

        {/* Income Categories */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Kategórie príjmov</h3>
          {renderCategoryList(incomeCategories)}
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingCategory} onOpenChange={(open) => !open && setEditingCategory(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upraviť kategóriu</DialogTitle>
            <DialogDescription>
              Zmeňte názov kategórie &quot;{editingCategory?.name}&quot;
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">
                Názov kategórie *
              </label>
              <Input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="napr. Potraviny, Plat"
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditingCategory(null)}
              disabled={saving}
            >
              Zrušiť
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving || !editName.trim()}>
              {saving ? 'Ukladám...' : 'Uložiť'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

