'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@finapp/ui';
import { Input } from '@finapp/ui';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@finapp/ui';
import { calculateLoanData, LOAN_TYPE_INFO, type LoanCalculationMode } from '@finapp/core';
import type { LoanType } from '@finapp/core';
import { SmartSlider } from '@/components/loans/SmartSlider';
import { LenderSelect } from '@/components/loans/LenderSelect';
import { LoanModeSelector } from '@/components/loans/LoanModeSelector';
import { LoanPreviewCard } from '@/components/loans/LoanPreviewCard';

export default function NewLoanPage(): React.JSX.Element {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    lender: '',
    loanType: 'annuity' as LoanType,
    principal: 10000,
    annualRate: 5.5,
    monthlyPayment: 250,
    termMonths: 60,
    startDate: new Date().toISOString().split('T')[0] ?? '',
    feeSetup: 0,
    feeMonthly: 0,
    insuranceMonthly: 0,
    balloonAmount: 0,
    calculationMode: 'payment_term' as LoanCalculationMode,
  });

  const [showAdvanced, setShowAdvanced] = useState(false);

  // Calculate loan with memoized calculator
  const calculatedData = useMemo(
    () =>
      calculateLoanData({
        loanType: formData.loanType,
        principal: formData.principal,
        annualRate: formData.calculationMode !== 'payment_term' ? formData.annualRate : undefined,
        monthlyPayment: formData.calculationMode !== 'rate_term' ? formData.monthlyPayment : undefined,
        termMonths: formData.calculationMode !== 'rate_payment' ? formData.termMonths : undefined,
        startDate: new Date(formData.startDate),
        feeSetup: formData.feeSetup,
        feeMonthly: formData.feeMonthly,
        insuranceMonthly: formData.insuranceMonthly,
        balloonAmount: formData.loanType === 'interest_only' ? formData.balloonAmount : undefined,
        calculationMode: formData.calculationMode,
      }),
    [
      formData.loanType,
      formData.principal,
      formData.annualRate,
      formData.monthlyPayment,
      formData.termMonths,
      formData.startDate,
      formData.feeSetup,
      formData.feeMonthly,
      formData.insuranceMonthly,
      formData.balloonAmount,
      formData.calculationMode,
    ]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!calculatedData?.isValid) {
      setError('Prosím vyplňte všetky požadované polia');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get household ID
      const householdResponse = await fetch('/api/households/current');
      const { householdId } = await householdResponse.json();

      // Use calculated values
      const finalRate = calculatedData.calculatedRate ?? formData.annualRate;
      const finalTerm = calculatedData.calculatedTerm ?? formData.termMonths;
      const finalPayment = calculatedData.calculatedPayment ?? formData.monthlyPayment;

      const response = await fetch('/api/loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          householdId,
          name: formData.name || undefined,
          lender: formData.lender,
          loanType: formData.loanType,
          principal: formData.principal,
          annualRate: finalRate,
          termMonths: finalTerm,
          startDate: formData.startDate,
          rateType: 'fixed',
          dayCountConvention: '30E/360',
          feeSetup: formData.feeSetup || 0,
          feeMonthly: formData.feeMonthly || 0,
          insuranceMonthly: formData.insuranceMonthly || 0,
          balloonAmount:
            formData.loanType === 'interest_only' && formData.balloonAmount
              ? formData.balloonAmount
              : undefined,
          fixedMonthlyPayment: formData.loanType !== 'fixed_principal' ? finalPayment : undefined,
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

  const loanTypeInfo = LOAN_TYPE_INFO[formData.loanType];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Nový úver</h1>
        <p className="text-muted-foreground">
          Zadajte údaje o úvere - systém automaticky dopočíta chýbajúce hodnoty
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left column - Form */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Základné informácie</CardTitle>
                <CardDescription>
                  Zadajte veriteľa, typ úveru a základné parametre
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {error && (
                  <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                  </div>
                )}

                {/* Name (optional) */}
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-medium">
                    Názov úveru
                  </label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="napr. Auto BMW X5, Hypotéka byt..."
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    disabled={loading}
                    maxLength={200}
                  />
                  <p className="text-xs text-muted-foreground">
                    Vlastný popis pre jednoduchšiu identifikáciu úveru (nepovinné)
                  </p>
                </div>

                {/* Lender */}
                <LenderSelect
                  value={formData.lender}
                  onChange={(value) => setFormData({ ...formData, lender: value })}
                  disabled={loading}
                />

                <div className="grid gap-4 md:grid-cols-2">
                  {/* Loan Type */}
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
                          loanType: e.target.value as LoanType,
                        })
                      }
                      required
                      disabled={loading}
                    >
                      {Object.entries(LOAN_TYPE_INFO).map(([type, info]) => (
                        <option key={type} value={type}>
                          {info.icon} {info.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground">
                      {loanTypeInfo.description}
                    </p>
                  </div>

                  {/* Start Date */}
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
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>💰 Parametre úveru</CardTitle>
                <CardDescription>
                  Vyberte aké údaje poznáte, zvyšok sa dopočíta automaticky
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Principal Slider */}
                <SmartSlider
                  label="Výška úveru *"
                  value={formData.principal}
                  onChange={(value) => setFormData({ ...formData, principal: value })}
                  min={100}
                  max={500000}
                  step={100}
                  suffix=" €"
                  formatDisplay={(v) => `${v.toFixed(2)} €`}
                  disabled={loading}
                />

                <hr className="border-border" />

                {/* Calculation Mode Selector */}
                <LoanModeSelector
                  value={formData.calculationMode}
                  onChange={(value) => setFormData({ ...formData, calculationMode: value })}
                  disabled={loading}
                />

                <hr className="border-border" />

                {/* Conditional fields based on calculation mode */}
                {formData.calculationMode !== 'payment_term' && (
                  <SmartSlider
                    label="Úroková sadzba *"
                    value={formData.annualRate}
                    onChange={(value) => setFormData({ ...formData, annualRate: value })}
                    min={0}
                    max={25}
                    step={0.1}
                    suffix=" %"
                    formatDisplay={(v) => `${v.toFixed(1)}%`}
                    disabled={loading}
                  />
                )}

                {formData.calculationMode !== 'rate_term' && (
                  <SmartSlider
                    label="Mesačná splátka *"
                    value={formData.monthlyPayment}
                    onChange={(value) => setFormData({ ...formData, monthlyPayment: value })}
                    min={50}
                    max={10000}
                    step={0.5}
                    suffix=" €"
                    formatDisplay={(v) => `${v.toFixed(2)} €`}
                    disabled={loading}
                  />
                )}

                {formData.calculationMode !== 'rate_payment' && (
                  <SmartSlider
                    label="Doba splácania *"
                    value={formData.termMonths}
                    onChange={(value) => setFormData({ ...formData, termMonths: value })}
                    min={12}
                    max={360}
                    step={6}
                    suffix=" mes."
                    formatDisplay={(v) => {
                      const years = Math.floor(v / 12);
                      const months = v % 12;
                      if (years > 0 && months > 0) {
                        return `${years} r. ${months} mes.`;
                      } else if (years > 0) {
                        return `${years} ${years === 1 ? 'rok' : years < 5 ? 'roky' : 'rokov'}`;
                      } else {
                        return `${months} mes.`;
                      }
                    }}
                    disabled={loading}
                  />
                )}

                {/* Show calculated value */}
                {calculatedData?.calculatedRate !== null && calculatedData !== null && (
                  <div className="rounded-md bg-green-50 dark:bg-green-950 p-4 border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2">
                      <span className="text-green-600 dark:text-green-400">✓</span>
                      <span className="text-sm font-medium">
                        Úroková sadzba: {calculatedData.calculatedRate.toFixed(2)}% ročne
                      </span>
                      <span className="text-xs text-muted-foreground">(automaticky vypočítané)</span>
                    </div>
                  </div>
                )}

                {calculatedData?.calculatedTerm !== null && calculatedData !== null && (
                  <div className="rounded-md bg-green-50 dark:bg-green-950 p-4 border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2">
                      <span className="text-green-600 dark:text-green-400">✓</span>
                      <span className="text-sm font-medium">
                        Doba splácania: {calculatedData.calculatedTerm} mesiacov
                      </span>
                      <span className="text-xs text-muted-foreground">(automaticky vypočítané)</span>
                    </div>
                  </div>
                )}

                {calculatedData?.calculatedPayment !== null && calculatedData !== null && (
                  <div className="rounded-md bg-green-50 dark:bg-green-950 p-4 border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2">
                      <span className="text-green-600 dark:text-green-400">✓</span>
                      <span className="text-sm font-medium">
                        Mesačná splátka: {calculatedData.calculatedPayment.toFixed(2)} €
                      </span>
                      <span className="text-xs text-muted-foreground">(automaticky vypočítané)</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Advanced settings */}
            <Card>
              <CardHeader className="cursor-pointer" onClick={() => setShowAdvanced(!showAdvanced)}>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">⚙️ Poplatky a pokročilé nastavenia</CardTitle>
                  <span className="text-sm text-muted-foreground">
                    {showAdvanced ? '▲' : '▼'}
                  </span>
                </div>
                {!showAdvanced && (
                  <CardDescription>Voliteľné - kliknite pre rozbalenie</CardDescription>
                )}
              </CardHeader>
              {showAdvanced && (
                <CardContent className="space-y-4">
                  <p className="text-xs text-muted-foreground">
                    ℹ️ Poplatky ovplyvňujú RPMN (skutočnú cenu úveru)
                  </p>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <label htmlFor="feeSetup" className="text-sm font-medium">
                        Administratívny poplatok (€)
                      </label>
                      <Input
                        id="feeSetup"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={formData.feeSetup || ''}
                        onChange={(e) =>
                          setFormData({ ...formData, feeSetup: parseFloat(e.target.value) || 0 })
                        }
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
                        value={formData.feeMonthly || ''}
                        onChange={(e) =>
                          setFormData({ ...formData, feeMonthly: parseFloat(e.target.value) || 0 })
                        }
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
                        value={formData.insuranceMonthly || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            insuranceMonthly: parseFloat(e.target.value) || 0,
                          })
                        }
                        disabled={loading}
                      />
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
                        placeholder={formData.principal.toString()}
                        value={formData.balloonAmount || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            balloonAmount: parseFloat(e.target.value) || 0,
                          })
                        }
                        disabled={loading}
                      />
                      <p className="text-xs text-muted-foreground">
                        Ak nevyplníte, použije sa celá výška úveru
                      </p>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>

            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={loading}
                className="flex-1"
              >
                Zrušiť
              </Button>
              <Button
                type="submit"
                disabled={loading || !calculatedData?.isValid}
                className="flex-1"
              >
                {loading ? 'Vytváram...' : '💾 Vytvoriť úver'}
              </Button>
            </div>
          </div>

          {/* Right column - Preview (sticky) */}
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              <LoanPreviewCard result={calculatedData} principal={formData.principal} />
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
