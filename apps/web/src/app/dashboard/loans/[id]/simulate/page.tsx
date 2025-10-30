'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@finapp/ui';
import { Button } from '@finapp/ui';
import type { LoanComparisonResult, SimulationScenario } from '@finapp/core';

export default function LoanSimulatePage() {
  const params = useParams();
  const router = useRouter();
  const loanId = params.id as string;

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LoanComparisonResult | null>(null);
  const [scenarios, setScenarios] = useState<SimulationScenario[]>([
    {
      name: 'Baseline (No changes)',
      extraPaymentMonthly: 0,
    },
    {
      name: 'Extra €100/month',
      extraPaymentMonthly: 100,
    },
    {
      name: 'Extra €200/month',
      extraPaymentMonthly: 200,
    },
  ]);

  const handleSimulate = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/loans/${loanId}/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenarios }),
      });

      if (!response.ok) {
        throw new Error('Failed to simulate');
      }

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Simulation error:', error);
      alert('Failed to run simulation');
    } finally {
      setLoading(false);
    }
  };

  const addScenario = () => {
    setScenarios([
      ...scenarios,
      {
        name: `Custom Scenario ${scenarios.length + 1}`,
        extraPaymentMonthly: 0,
      },
    ]);
  };

  const updateScenario = (index: number, updates: Partial<SimulationScenario>) => {
    const newScenarios = [...scenarios];
    newScenarios[index] = { ...newScenarios[index], ...updates };
    setScenarios(newScenarios);
  };

  const removeScenario = (index: number) => {
    setScenarios(scenarios.filter((_, i) => i !== index));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('sk-SK', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Loan Simulation</h1>
        <Button variant="outline" onClick={() => router.back()}>
          Back
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Scenarios</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {scenarios.map((scenario, index) => (
            <div key={index} className="flex items-center gap-4 p-4 border rounded-lg">
              <div className="flex-1">
                <input
                  type="text"
                  value={scenario.name}
                  onChange={(e) => updateScenario(index, { name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Scenario name"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">
                  Extra Monthly Payment (€)
                </label>
                <input
                  type="number"
                  value={scenario.extraPaymentMonthly || 0}
                  onChange={(e) =>
                    updateScenario(index, {
                      extraPaymentMonthly: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-md"
                  min="0"
                  step="10"
                />
              </div>
              {index > 0 && (
                <Button
                  variant="outline"
                  onClick={() => removeScenario(index)}
                  className="text-red-600"
                >
                  Remove
                </Button>
              )}
            </div>
          ))}

          <div className="flex gap-2">
            <Button onClick={addScenario} variant="outline">
              Add Scenario
            </Button>
            <Button onClick={handleSimulate} disabled={loading}>
              {loading ? 'Simulating...' : 'Run Simulation'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Best Scenario: {result.bestScenario}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Total Interest Range</p>
                  <p className="text-lg font-semibold">
                    {formatCurrency(result.comparison.totalInterestRange.min)} -{' '}
                    {formatCurrency(result.comparison.totalInterestRange.max)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Payment Range</p>
                  <p className="text-lg font-semibold">
                    {formatCurrency(result.comparison.totalPaymentRange.min)} -{' '}
                    {formatCurrency(result.comparison.totalPaymentRange.max)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Months Saved Range</p>
                  <p className="text-lg font-semibold">
                    {result.comparison.monthsSavedRange.min} -{' '}
                    {result.comparison.monthsSavedRange.max} months
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4">
            {result.scenarios.map((scenario, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle>{scenario.scenario}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Total Interest</p>
                      <p className="text-lg font-semibold">
                        {formatCurrency(scenario.totalInterest)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total Payment</p>
                      <p className="text-lg font-semibold">
                        {formatCurrency(scenario.totalPayment)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Months Saved</p>
                      <p className="text-lg font-semibold">{scenario.monthsSaved}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total Saved</p>
                      <p className="text-lg font-semibold text-green-600">
                        {formatCurrency(scenario.totalSaved)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

