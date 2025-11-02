'use client';

import type { LoanCalculatorResult } from '@finapp/core';
import { Card, CardContent } from '@finapp/ui';

interface LoanPreviewCardProps {
  result: LoanCalculatorResult | null;
  principal: number;
}

/**
 * Preview card showing calculated loan details
 */
export function LoanPreviewCard({
  result,
  principal,
}: LoanPreviewCardProps): React.JSX.Element {
  if (!result) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <div className="text-4xl mb-4">📊</div>
          <p className="text-sm text-muted-foreground">
            Zadajte parametre úveru pre zobrazenie prepočtu
          </p>
        </CardContent>
      </Card>
    );
  }

  const { firstPayment, effectiveRate, totalPayment, totalInterest, totalFees, endDate } = result;
  const rateWarning = Math.abs(effectiveRate - (result.calculatedRate ?? effectiveRate)) > 0.5;

  return (
    <Card className="border-primary/50 shadow-lg">
      <CardContent className="pt-6 space-y-6">
        {/* Main payment amount */}
        <div className="text-center">
          <div className="text-sm text-muted-foreground mb-2">💳 Mesačná splátka</div>
          <div className="text-5xl font-bold text-primary">
            {firstPayment.toFixed(2)} €
          </div>
          <div className="text-xs text-muted-foreground mt-1">/mesiac</div>
        </div>

        <hr className="border-border" />

        {/* Key metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-muted-foreground mb-1">
              RPMN (skutočná cena)
              {rateWarning && ' ⚠️'}
            </div>
            <div className="text-lg font-semibold text-orange-600">
              {effectiveRate.toFixed(2)}%
            </div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">Koniec splácania</div>
            <div className="text-lg font-semibold">
              {endDate.toLocaleDateString('sk-SK', { month: 'short', year: 'numeric' })}
            </div>
          </div>
        </div>

        <hr className="border-border" />

        {/* Totals breakdown */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Celková suma k splateniu:</span>
            <span className="text-xl font-bold">{totalPayment.toFixed(2)} €</span>
          </div>

          <div className="pl-4 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Výška úveru:</span>
              <span>{principal.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Celkový úrok:</span>
              <span className="text-orange-600">
                {totalInterest.toFixed(2)} € ({((totalInterest / principal) * 100).toFixed(0)}%)
              </span>
            </div>
            {totalFees > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Celkové poplatky:</span>
                <span className="text-orange-600">{totalFees.toFixed(2)} €</span>
              </div>
            )}
          </div>
        </div>

        {rateWarning && (
          <div className="rounded-md bg-orange-50 dark:bg-orange-950 p-3 text-xs text-orange-800 dark:text-orange-200">
            ⚠️ RPMN je výrazne vyššie ako nominálny úrok kvôli poplatkom
          </div>
        )}
      </CardContent>
    </Card>
  );
}

