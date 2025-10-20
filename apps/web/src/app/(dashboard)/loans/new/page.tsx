'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@finapp/ui';
import { Input } from '@finapp/ui';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@finapp/ui';

export default function NewLoanPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    lender: '',
    loanType: 'annuity' as 'annuity' | 'fixed_principal' | 'interest_only',
    principal: '',
    annualRate: '',
    termMonths: '',
    startDate: new Date().toISOString().split('T')[0] ?? '',
    feeSetup: '',
    feeMonthly: '',
    insuranceMonthly: '',
    balloonAmount: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Get household ID (in real app, this would come from context/store)
      const householdResponse = await fetch('/api/households/current');
      const { householdId } = await householdResponse.json();

      const response = await fetch('/api/loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          householdId,
          lender: formData.lender,
          loanType: formData.loanType,
          principal: parseFloat(formData.principal),
          annualRate: parseFloat(formData.annualRate),
          termMonths: parseInt(formData.termMonths),
          startDate: formData.startDate,
          rateType: 'fixed',
          dayCountConvention: '30E/360',
          feeSetup: formData.feeSetup ? parseFloat(formData.feeSetup) : undefined,
          feeMonthly: formData.feeMonthly ? parseFloat(formData.feeMonthly) : undefined,
          insuranceMonthly: formData.insuranceMonthly
            ? parseFloat(formData.insuranceMonthly)
            : undefined,
          balloonAmount:
            formData.loanType === 'interest_only' && formData.balloonAmount
              ? parseFloat(formData.balloonAmount)
              : undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Vytvorenie úveru zlyhalo');
      }

      const { loan } = await response.json();
      router.push(`/dashboard/loans/${loan.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Neznáma chyba');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Nový úver</h1>
        <p className="text-muted-foreground">
          Vytvorte nový úver s automatickým výpočtom harmonogramu
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Základné informácie</CardTitle>
            <CardDescription>
              Zadajte detaily úveru pre automatický výpočet splátok
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="lender" className="text-sm font-medium">
                Veriteľ *
              </label>
              <Input
                id="lender"
                placeholder="Názov banky alebo veriteľa"
                value={formData.lender}
                onChange={(e) => setFormData({ ...formData, lender: e.target.value })}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="loanType" className="text-sm font-medium">
                Typ úveru *
              </label>
              <select
                id="loanType"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.loanType}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    loanType: e.target.value as typeof formData.loanType,
                  })
                }
                required
                disabled={loading}
              >
                <option value="annuity">Anuitný (fixná splátka)</option>
                <option value="fixed_principal">Fixná istina (klesajúca splátka)</option>
                <option value="interest_only">Interest-only + balón</option>
              </select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="principal" className="text-sm font-medium">
                  Istina (€) *
                </label>
                <Input
                  id="principal"
                  type="number"
                  step="0.01"
                  placeholder="10000.00"
                  value={formData.principal}
                  onChange={(e) => setFormData({ ...formData, principal: e.target.value })}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="annualRate" className="text-sm font-medium">
                  Ročný úrok (%) *
                </label>
                <Input
                  id="annualRate"
                  type="number"
                  step="0.01"
                  placeholder="5.00"
                  value={formData.annualRate}
                  onChange={(e) => setFormData({ ...formData, annualRate: e.target.value })}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="termMonths" className="text-sm font-medium">
                  Doba splácania (mesiace) *
                </label>
                <Input
                  id="termMonths"
                  type="number"
                  placeholder="60"
                  value={formData.termMonths}
                  onChange={(e) => setFormData({ ...formData, termMonths: e.target.value })}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="startDate" className="text-sm font-medium">
                  Dátum začiatku *
                </label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-medium mb-4">Poplatky (voliteľné)</h3>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <label htmlFor="feeSetup" className="text-sm font-medium">
                    Vstupný poplatok (€)
                  </label>
                  <Input
                    id="feeSetup"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.feeSetup}
                    onChange={(e) => setFormData({ ...formData, feeSetup: e.target.value })}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="feeMonthly" className="text-sm font-medium">
                    Mesačný poplatok (€)
                  </label>
                  <Input
                    id="feeMonthly"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.feeMonthly}
                    onChange={(e) => setFormData({ ...formData, feeMonthly: e.target.value })}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="insuranceMonthly" className="text-sm font-medium">
                    Poistenie (€/mesiac)
                  </label>
                  <Input
                    id="insuranceMonthly"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.insuranceMonthly}
                    onChange={(e) =>
                      setFormData({ ...formData, insuranceMonthly: e.target.value })
                    }
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {formData.loanType === 'interest_only' && (
              <div className="space-y-2">
                <label htmlFor="balloonAmount" className="text-sm font-medium">
                  Balónová splátka (€)
                </label>
                <Input
                  id="balloonAmount"
                  type="number"
                  step="0.01"
                  placeholder={formData.principal || '0.00'}
                  value={formData.balloonAmount}
                  onChange={(e) => setFormData({ ...formData, balloonAmount: e.target.value })}
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  Ak nevyplníte, použije sa celá istina
                </p>
              </div>
            )}

            <div className="flex gap-4 pt-4">
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? 'Vytváram...' : 'Vytvoriť úver'}
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

