'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@finapp/ui';
import { Input } from '@finapp/ui';

interface IncomeTemplate {
  id: string;
  name: string;
  default_amount: number | null;
  note: string | null;
  categories: {
    id: string;
    name: string;
  } | null;
}

interface QuickAddIncomeDialogProps {
  template: IncomeTemplate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickAddIncomeDialog({
  template,
  open,
  onOpenChange,
}: QuickAddIncomeDialogProps): React.JSX.Element {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0] ?? '',
    amount: template?.default_amount?.toString() ?? '',
    note: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!template) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/incomes/from-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: template.id,
          date: formData.date,
          amount: parseFloat(formData.amount),
          note: formData.note || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Vytvorenie príjmu zlyhalo');
      }

      onOpenChange(false);
      router.refresh();
      
      // Reset form
      setFormData({
        date: new Date().toISOString().split('T')[0] ?? '',
        amount: template?.default_amount?.toString() ?? '',
        note: '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Neznáma chyba');
    } finally {
      setLoading(false);
    }
  };

  if (!template) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pridať príjem: {template.name}</DialogTitle>
          <DialogDescription>
            Kategória: {template.categories?.name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

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
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="note" className="text-sm font-medium">
                Poznámka
              </label>
              <Input
                id="note"
                placeholder={template.note ?? 'Voliteľná poznámka'}
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                disabled={loading}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Zrušiť
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Ukladám...' : 'Uložiť príjem'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

