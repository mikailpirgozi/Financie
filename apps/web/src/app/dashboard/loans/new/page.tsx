'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@finapp/ui';
import { Input } from '@finapp/ui';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@finapp/ui';
import { calculateLoan, calculateRateFromPayment, calculateTermFromPayment } from '@finapp/core';
import type { LoanCalculationInput } from '@finapp/core';

type CalculationMode = 'rate' | 'payment' | 'term' | 'auto';

export default function NewLoanPage(): React.JSX.Element {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Sledujeme, či používateľ ručne editoval polia
  const [manuallyEditedFields, setManuallyEditedFields] = useState({
    annualRate: false,
    termMonths: false,
  });

  const [formData, setFormData] = useState({
    lender: '',
    loanType: 'annuity' as 'annuity' | 'fixed_principal' | 'interest_only' | 'auto_loan',
    principal: '',
    annualRate: '',
    monthlyPayment: '',
    principalPayment: '', // For fixed_principal loans
    termMonths: '',
    startDate: new Date().toISOString().split('T')[0] ?? '',
    feeSetup: '',
    feeMonthly: '',
    insuranceMonthly: '',
    balloonAmount: '',
  });

  // Automatický prepočet úverových parametrov
  const calculatedData = useMemo(() => {
    const principal = parseFloat(formData.principal);
    const annualRate = parseFloat(formData.annualRate) || 0;
    const monthlyPayment = parseFloat(formData.monthlyPayment) || 0;
    const principalPayment = parseFloat(formData.principalPayment) || 0;
    const termMonths = parseInt(formData.termMonths) || 0;
    const startDate = formData.startDate;
    const feeSetup = formData.feeSetup ? parseFloat(formData.feeSetup) : 0;
    const feeMonthly = formData.feeMonthly ? parseFloat(formData.feeMonthly) : 0;
    const insuranceMonthly = formData.insuranceMonthly ? parseFloat(formData.insuranceMonthly) : 0;

    // Musíme mať aspoň výšku úveru a dátum
    if (!principal || principal <= 0 || !startDate) {
      return null;
    }

    try {
      let finalRate = annualRate;
      let finalTerm = termMonths;
      let calculationMode: CalculationMode = 'auto';

      // Určíme, čo máme vypočítať na základe toho, čo je zadané
      // Pole je "zadané" len ak používateľ RUČNE editoval alebo má nenulovu hodnotu
      const hasRate = (annualRate > 0 && manuallyEditedFields.annualRate);
      const hasPayment = monthlyPayment > 0;
      const hasTerm = termMonths > 0;

      // Scenár 1: Máme splátku a dobu → vypočítame úrok
      if (hasPayment && hasTerm && !hasRate) {
        calculationMode = 'rate';
        finalRate = calculateRateFromPayment(
          principal,
          monthlyPayment,
          termMonths,
          formData.loanType,
          feeSetup,
          feeMonthly,
          insuranceMonthly
        );
      }
      // Scenár 2: Máme úrok a splátku → vypočítame dobu
      else if (hasRate && hasPayment && !hasTerm) {
        calculationMode = 'term';
        finalTerm = calculateTermFromPayment(
          principal,
          annualRate,
          monthlyPayment,
          formData.loanType,
          feeSetup,
          feeMonthly,
          insuranceMonthly
        );
      }
      // Scenár 3: Máme úrok a dobu → vypočítame splátku (štandardný prípad)
      else if (hasRate && hasTerm && !hasPayment) {
        calculationMode = 'payment';
        // Splátku vypočítame zo štandardnej kalkulácie
      }
      // Scenár 4: Všetko je zadané → len prepočítame
      else if (hasRate && hasTerm) {
        calculationMode = 'auto';
      } else {
        // Nedostatok údajov
        return null;
      }

      // Teraz spustíme štandardný výpočet
      const input: LoanCalculationInput = {
        loanType: formData.loanType,
        principal,
        annualRate: finalRate,
        termMonths: finalTerm,
        startDate: new Date(startDate),
        dayCountConvention: '30E/360',
        feeSetup,
        feeMonthly,
        insuranceMonthly,
        balloonAmount:
          formData.loanType === 'interest_only' && formData.balloonAmount
            ? parseFloat(formData.balloonAmount)
            : undefined,
        // Ak bola zadaná mesačná splátka (annuity), použijeme ju presne
        fixedMonthlyPayment: formData.loanType !== 'fixed_principal' && hasPayment ? monthlyPayment : undefined,
        // Ak bola zadaná mesačná istina (fixed_principal), použijeme ju presne
        fixedPrincipalPayment: formData.loanType === 'fixed_principal' && principalPayment > 0 ? principalPayment : undefined,
      };

      const result = calculateLoan(input);

      // Výpočet dátumu konca splácania
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + finalTerm);

      return {
        effectiveRate: result.effectiveRate,
        totalInterest: result.totalInterest,
        totalFees: result.totalFees,
        totalPayment: result.totalPayment,
        endDate,
        calculatedRate: calculationMode === 'rate' ? finalRate : null,
        calculatedTerm: calculationMode === 'term' ? finalTerm : null,
        calculatedPayment: result.schedule[0]?.totalDue ?? 0,
        firstPayment: result.schedule[0]?.totalDue ?? 0,
        lastPayment: result.schedule[result.schedule.length - 1]?.totalDue ?? 0,
        calculationMode,
      };
    } catch (err) {
      console.error('Chyba pri výpočte:', err);
      return null;
    }
  }, [
    formData.loanType,
    formData.principal,
    formData.annualRate,
    formData.monthlyPayment,
    formData.principalPayment,
    formData.termMonths,
    formData.startDate,
    formData.feeSetup,
    formData.feeMonthly,
    formData.insuranceMonthly,
    formData.balloonAmount,
    manuallyEditedFields,
  ]);

  // Automaticky vyplníme vypočítané hodnoty s debouncing
  useEffect(() => {
    if (!calculatedData) return;

    // Debouncing - počkáme 500ms pred automatickým vyplnením
    const timer = setTimeout(() => {
      // Vyplníme úrok len ak používateľ NEEDIOVAL pole ručne
      if (calculatedData.calculatedRate !== null && !manuallyEditedFields.annualRate) {
        setFormData(prev => ({ ...prev, annualRate: calculatedData.calculatedRate!.toFixed(2) }));
      }
      
      // Vyplníme dobu len ak používateľ NEEDIOVAL pole ručne
      if (calculatedData.calculatedTerm !== null && !manuallyEditedFields.termMonths) {
        setFormData(prev => ({ ...prev, termMonths: calculatedData.calculatedTerm!.toString() }));
      }
    }, 500); // 500ms oneskorenie

    return () => clearTimeout(timer);
  }, [calculatedData, formData.annualRate, formData.termMonths, manuallyEditedFields]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Get household ID
      const householdResponse = await fetch('/api/households/current');
      const { householdId } = await householdResponse.json();

      // Use calculated values if available
      const finalRate = calculatedData?.calculatedRate ?? parseFloat(formData.annualRate);
      const finalTerm = calculatedData?.calculatedTerm ?? parseInt(formData.termMonths);

      // Ak bola zadaná mesačná splátka (annuity), pošleme ju do API
      const monthlyPayment = formData.loanType !== 'fixed_principal' && formData.monthlyPayment 
        ? parseFloat(formData.monthlyPayment) 
        : undefined;
      
      // Ak bola zadaná mesačná istina (fixed_principal), pošleme ju do API
      const principalPayment = formData.loanType === 'fixed_principal' && formData.principalPayment
        ? parseFloat(formData.principalPayment)
        : undefined;

      const response = await fetch('/api/loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          householdId,
          lender: formData.lender,
          loanType: formData.loanType,
          principal: parseFloat(formData.principal),
          annualRate: finalRate,
          termMonths: finalTerm,
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
          fixedMonthlyPayment: monthlyPayment,
          fixedPrincipalPayment: principalPayment,
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
          Zadajte dostupné údaje - systém automaticky dopočíta chybajúce hodnoty
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Základné informácie</CardTitle>
            <CardDescription>
              Stačí zadať 2 z 3 hodnôt: výška úveru + (úrok ALEBO splátka ALEBO doba)
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
                <option value="auto_loan">Autoúver (leasing)</option>
              </select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="principal" className="text-sm font-medium">
                  Výška úveru (€) *
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
              <h3 className="font-medium mb-4">
                Parametre úveru <span className="text-xs text-muted-foreground">(zadajte aspoň 2 z 3)</span>
              </h3>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <label htmlFor="annualRate" className="text-sm font-medium flex items-center gap-2">
                    Ročný úrok (%)
                    {calculatedData?.calculatedRate !== null && (
                      <span className="text-xs text-green-600">✓ vypočítané</span>
                    )}
                  </label>
                  <Input
                    id="annualRate"
                    type="number"
                    step="0.01"
                    placeholder="5.00"
                    value={formData.annualRate}
                    onChange={(e) => {
                      setFormData({ ...formData, annualRate: e.target.value });
                      // Označíme, že používateľ ručne editoval pole
                      setManuallyEditedFields(prev => ({ ...prev, annualRate: true }));
                    }}
                    onFocus={() => {
                      // Pri zameraní resetujeme flag, aby sa mohlo automaticky prepočítavať
                      setManuallyEditedFields(prev => ({ ...prev, annualRate: false }));
                    }}
                    disabled={loading}
                    className={calculatedData?.calculatedRate !== null && !manuallyEditedFields.annualRate ? 'bg-green-50' : ''}
                  />
                </div>

                {formData.loanType === 'fixed_principal' ? (
                  <div className="space-y-2">
                    <label htmlFor="principalPayment" className="text-sm font-medium flex items-center gap-2">
                      Mesačná istina (€)
                      <span className="text-xs text-muted-foreground">(fixná)</span>
                    </label>
                    <Input
                      id="principalPayment"
                      type="number"
                      step="0.01"
                      placeholder="348.00"
                      value={formData.principalPayment}
                      onChange={(e) => setFormData({ ...formData, principalPayment: e.target.value })}
                      disabled={loading}
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label htmlFor="monthlyPayment" className="text-sm font-medium flex items-center gap-2">
                      Mesačná splátka (€)
                      {calculatedData?.calculationMode === 'payment' && (
                        <span className="text-xs text-green-600">✓ vypočítané</span>
                      )}
                    </label>
                    <Input
                      id="monthlyPayment"
                      type="number"
                      step="0.01"
                      placeholder="250.00"
                      value={formData.monthlyPayment}
                      onChange={(e) => setFormData({ ...formData, monthlyPayment: e.target.value })}
                      disabled={loading}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <label htmlFor="termMonths" className="text-sm font-medium flex items-center gap-2">
                    Doba (mesiace)
                    {calculatedData?.calculatedTerm !== null && (
                      <span className="text-xs text-green-600">✓ vypočítané</span>
                    )}
                  </label>
                  <Input
                    id="termMonths"
                    type="number"
                    placeholder="60"
                    value={formData.termMonths}
                    onChange={(e) => {
                      setFormData({ ...formData, termMonths: e.target.value });
                      // Označíme, že používateľ ručne editoval pole
                      setManuallyEditedFields(prev => ({ ...prev, termMonths: true }));
                    }}
                    onFocus={() => {
                      // Pri zameraní resetujeme flag, aby sa mohlo automaticky prepočítavať
                      setManuallyEditedFields(prev => ({ ...prev, termMonths: false }));
                    }}
                    disabled={loading}
                    className={calculatedData?.calculatedTerm !== null && !manuallyEditedFields.termMonths ? 'bg-green-50' : ''}
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-medium mb-4">Poplatky (voliteľné)</h3>
              <p className="text-xs text-muted-foreground mb-3">
                Poplatky ovplyvňujú RPMN (skutočnú cenu úveru)
              </p>
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
                  Ak nevyplníte, použije sa celá výška úveru
                </p>
              </div>
            )}

            {calculatedData && (
              <div className="border-t pt-4 mt-6">
                <h3 className="font-medium mb-4 text-primary">📊 Automatický prepočet</h3>
                <div className="grid gap-4 md:grid-cols-2 bg-muted/50 p-4 rounded-lg">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">RPMN (efektívna úroková sadzba)</p>
                    <p className="text-lg font-semibold text-orange-600">
                      {calculatedData.effectiveRate.toFixed(2)}%
                    </p>
                    {Math.abs(calculatedData.effectiveRate - (parseFloat(formData.annualRate) || 0)) > 0.1 && (
                      <p className="text-xs text-orange-600">
                        ⚠️ RPMN je vyššie ako úrok kvôli poplatkom
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Dátum konca splácania</p>
                    <p className="text-lg font-semibold">
                      {calculatedData.endDate.toLocaleDateString('sk-SK', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">
                      {formData.loanType === 'annuity' ? 'Mesačná splátka' : 'Prvá splátka'}
                    </p>
                    <p className="text-lg font-semibold">
                      {calculatedData.firstPayment.toFixed(2)} €
                    </p>
                  </div>
                  {formData.loanType !== 'annuity' && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Posledná splátka</p>
                      <p className="text-lg font-semibold">
                        {calculatedData.lastPayment.toFixed(2)} €
                      </p>
                    </div>
                  )}
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Celkový úrok</p>
                    <p className="text-lg font-semibold text-orange-600">
                      {calculatedData.totalInterest.toFixed(2)} €
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Celkové poplatky</p>
                    <p className="text-lg font-semibold text-orange-600">
                      {calculatedData.totalFees.toFixed(2)} €
                    </p>
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <p className="text-xs text-muted-foreground">Celková suma na splatenie</p>
                    <p className="text-2xl font-bold text-primary">
                      {calculatedData.totalPayment.toFixed(2)} €
                    </p>
                    <p className="text-xs text-muted-foreground">
                      (výška úveru {parseFloat(formData.principal).toFixed(2)} € + úrok{' '}
                      {calculatedData.totalInterest.toFixed(2)} € + poplatky{' '}
                      {calculatedData.totalFees.toFixed(2)} €)
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-4 pt-4">
              <Button type="submit" className="flex-1" disabled={loading || !calculatedData}>
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
