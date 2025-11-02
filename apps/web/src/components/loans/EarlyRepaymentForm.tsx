'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button } from '@finapp/ui';
import type { EarlyRepaymentResult } from '@finapp/core';

interface EarlyRepaymentFormProps {
  loanId: string;
  onSuccess?: () => void;
}

export function EarlyRepaymentForm({ loanId, onSuccess }: EarlyRepaymentFormProps): React.JSX.Element {
  const [repaymentAmount, setRepaymentAmount] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EarlyRepaymentResult | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('sk-SK', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const handleCalculate = async () => {
    if (!repaymentAmount || parseFloat(repaymentAmount) <= 0) {
      alert('Please enter a valid repayment amount');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/loans/${loanId}/early-repayment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repaymentAmount: parseFloat(repaymentAmount),
          execute: false,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to calculate early repayment');
      }

      const data = await response.json();
      setResult(data);
      setShowConfirm(true);
    } catch (error) {
      console.error('Early repayment calculation error:', error);
      alert('Failed to calculate early repayment');
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async () => {
    if (!repaymentAmount || !result) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/loans/${loanId}/early-repayment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repaymentAmount: parseFloat(repaymentAmount),
          execute: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to execute early repayment');
      }

      alert('Early repayment executed successfully!');
      setShowConfirm(false);
      setResult(null);
      setRepaymentAmount('');
      onSuccess?.();
    } catch (error) {
      console.error('Early repayment execution error:', error);
      alert('Failed to execute early repayment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Early Repayment Calculator</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Repayment Amount (€)
            </label>
            <input
              type="number"
              value={repaymentAmount}
              onChange={(e) => setRepaymentAmount(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="Enter amount"
              min="0"
              step="100"
              disabled={loading}
            />
          </div>

          <Button onClick={handleCalculate} disabled={loading}>
            {loading ? 'Calculating...' : 'Calculate'}
          </Button>
        </CardContent>
      </Card>

      {result && showConfirm && (
        <Card>
          <CardHeader>
            <CardTitle>Early Repayment Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Penalty Amount</p>
                <p className="text-lg font-semibold text-red-600">
                  {formatCurrency(result.penaltyAmount)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Remaining Balance</p>
                <p className="text-lg font-semibold">
                  {formatCurrency(result.remainingBalance)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Saved</p>
                <p className="text-lg font-semibold text-green-600">
                  {formatCurrency(result.totalSaved)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">New Schedule Length</p>
                <p className="text-lg font-semibold">
                  {result.newSchedule.length} months
                </p>
              </div>
            </div>

            {result.remainingBalance === 0 ? (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-800 font-semibold">
                  ✓ This payment will fully pay off the loan!
                </p>
              </div>
            ) : (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-800">
                  After this payment, you will have {result.newSchedule.length} remaining
                  installments.
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={handleExecute} disabled={loading}>
                {loading ? 'Processing...' : 'Confirm & Execute'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowConfirm(false);
                  setResult(null);
                }}
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

