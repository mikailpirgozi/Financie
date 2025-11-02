'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@finapp/ui';
import { Input } from '@finapp/ui';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface RevaluationDialogProps {
  assetId: string;
  assetName: string;
  currentValue: number;
}

export function RevaluationDialog({ assetId, assetName, currentValue }: RevaluationDialogProps): React.JSX.Element {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Default to current month
  const now = new Date();
  const defaultDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

  const [date, setDate] = useState(defaultDate);
  const [value, setValue] = useState(currentValue.toString());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/assets/${assetId}/revaluations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          value: parseFloat(value),
          source: 'manual',
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Nepodarilo sa vytvoriť precenovanie');
      }

      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chyba pri vytváraní precenovania');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>💰 Preceniť majetok</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Preceniť majetok</DialogTitle>
          <DialogDescription>
            Vytvorte nové ocenenie majetku &quot;{assetName}&quot; k určitému dátumu.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">
              Dátum precenovania *
            </label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Vyberte prvý deň mesiaca, ku ktorému chcete majetok preceniť
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Nová hodnota (€) *
            </label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="0.00"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Aktuálna hodnota: {currentValue.toFixed(2)} €
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              Zrušiť
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Ukladám...' : 'Vytvoriť precenovanie'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

