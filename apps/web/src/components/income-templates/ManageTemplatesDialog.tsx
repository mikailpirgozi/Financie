'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@finapp/ui';
import { Input } from '@finapp/ui';
import { DeleteDialog } from '@/components/DeleteDialog';

interface Category {
  id: string;
  name: string;
}

interface IncomeTemplate {
  id: string;
  name: string;
  category_id: string;
  default_amount: number | null;
  note: string | null;
  is_active: boolean;
  sort_order: number;
  categories: {
    id: string;
    name: string;
  } | null;
}

interface ManageTemplatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  householdId: string;
  categories: Category[];
}

export function ManageTemplatesDialog({
  open,
  onOpenChange,
  householdId,
  categories,
}: ManageTemplatesDialogProps) {
  const router = useRouter();
  const [templates, setTemplates] = useState<IncomeTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    categoryId: '',
    defaultAmount: '',
    note: '',
  });

  // Initialize categoryId when categories are available
  useEffect(() => {
    if (categories.length > 0 && !formData.categoryId) {
      setFormData((prev) => ({ ...prev, categoryId: categories[0].id }));
    }
  }, [categories, formData.categoryId]);

  const loadTemplates = async () => {
    try {
      const response = await fetch(
        `/api/income-templates?householdId=${householdId}&activeOnly=false`
      );
      const { templates: data } = await response.json();
      setTemplates(data);
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  };

  useEffect(() => {
    if (open) {
      loadTemplates();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = editingId
        ? `/api/income-templates/${editingId}`
        : '/api/income-templates';

      const response = await fetch(url, {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          householdId,
          name: formData.name,
          categoryId: formData.categoryId,
          defaultAmount: formData.defaultAmount
            ? parseFloat(formData.defaultAmount)
            : null,
          note: formData.note || null,
        }),
      });

      if (!response.ok) throw new Error('Failed to save template');

      await loadTemplates();
      resetForm();
      router.refresh();
    } catch (error) {
      console.error('Error saving template:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (template: IncomeTemplate) => {
    setEditingId(template.id);
    setFormData({
      name: template.name,
      categoryId: template.category_id,
      defaultAmount: template.default_amount?.toString() ?? '',
      note: template.note ?? '',
    });
    setShowNewForm(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/income-templates/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete template');

      await loadTemplates();
      router.refresh();
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      categoryId: categories[0]?.id ?? '',
      defaultAmount: '',
      note: '',
    });
    setEditingId(null);
    setShowNewForm(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Správa šablón príjmov</DialogTitle>
          <DialogDescription>
            Vytvorte a spravujte šablóny pre pravidelné príjmy
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* New/Edit Form */}
          {showNewForm ? (
            <form onSubmit={handleSubmit} className="space-y-3 p-4 border rounded-lg">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">
                  Názov šablóny *
                </label>
                <Input
                  id="name"
                  placeholder="napr. Výplata, Prenájom..."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  disabled={loading}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label htmlFor="categoryId" className="text-sm font-medium">
                    Kategória *
                  </label>
                  <select
                    id="categoryId"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={formData.categoryId}
                    onChange={(e) =>
                      setFormData({ ...formData, categoryId: e.target.value })
                    }
                    required
                    disabled={loading || !categories || categories.length === 0}
                  >
                    {categories && categories.length > 0 ? (
                      categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))
                    ) : (
                      <option value="">Žiadne kategórie</option>
                    )}
                  </select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="defaultAmount" className="text-sm font-medium">
                    Predvolená suma (€)
                  </label>
                  <Input
                    id="defaultAmount"
                    type="number"
                    step="0.01"
                    placeholder="voliteľné"
                    value={formData.defaultAmount}
                    onChange={(e) =>
                      setFormData({ ...formData, defaultAmount: e.target.value })
                    }
                    disabled={loading}
                  />
                </div>
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

              <div className="flex gap-2">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? 'Ukladám...' : editingId ? 'Uložiť zmeny' : 'Vytvoriť šablónu'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                  disabled={loading}
                >
                  Zrušiť
                </Button>
              </div>
            </form>
          ) : (
            <Button onClick={() => setShowNewForm(true)} className="w-full">
              ➕ Nová šablóna
            </Button>
          )}

          {/* Templates List */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Existujúce šablóny</h3>
            {!templates || templates.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Zatiaľ nemáte vytvorené žiadne šablóny
              </p>
            ) : (
              <div className="space-y-2">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">{template.name}</h4>
                      <p className="text-xs text-muted-foreground">
                        {template.categories?.name}
                        {template.default_amount &&
                          ` • ${Number(template.default_amount).toFixed(2)} €`}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(template)}
                      >
                        Upraviť
                      </Button>
                      <DeleteDialog
                        title="Zmazať šablónu"
                        description={`Naozaj chcete zmazať šablónu "${template.name}"?`}
                        onConfirm={() => handleDelete(template.id)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

