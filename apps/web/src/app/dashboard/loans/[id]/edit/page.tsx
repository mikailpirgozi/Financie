'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@finapp/ui';
import { Input } from '@finapp/ui';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@finapp/ui';

export default function EditLoanPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [lender, setLender] = useState('');
  const [loanType, setLoanType] = useState('annuity');
  const [principal, setPrincipal] = useState('');
  const [annualRate, setAnnualRate] = useState('');
  const [termMonths, setTermMonths] = useState('');
  const [startDate, setStartDate] = useState('');
  const [status, setStatus] = useState('active');

  useEffect(() => {
    async function loadLoan() {
      try {
        const response = await fetch(`/api/loans/${params.id}`);
        if (!response.ok) throw new Error('Nepodarilo sa načítať úver');
        
        const { loan } = await response.json();
        
        setLender(loan.lender);
        setLoanType(loan.loan_type);
        setPrincipal(loan.principal.toString());
        setAnnualRate(loan.annual_rate.toString());
        setTermMonths(loan.term_months.toString());
        setStartDate(loan.start_date);
        setStatus(loan.status);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Chyba pri načítaní');
      } finally {
        setLoading(false);
      }
    }

    loadLoan();
  }, [params.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/loans/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lender,
          loanType,
          principal: parseFloat(principal),
          annualRate: parseFloat(annualRate),
          termMonths: parseInt(termMonths),
          startDate: new Date(startDate),
          status,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Nepodarilo sa uložiť');
      }

      router.push(`/dashboard/loans/${params.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chyba pri ukladaní');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Načítavam...</div>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <Link href={`/dashboard/loans/${params.id}`}>
          <Button variant="ghost" size="sm">
            ← Späť na detail úveru
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upraviť úver</CardTitle>
          <CardDescription>
            Upravte základné údaje úveru. Zmena parametrov neovplyvní už vytvorené splátky.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">
                Veriteľ *
              </label>
              <Input
                type="text"
                value={lender}
                onChange={(e) => setLender(e.target.value)}
                placeholder="napr. Slovenská sporiteľňa"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Typ úveru *
              </label>
              <select
                value={loanType}
                onChange={(e) => setLoanType(e.target.value)}
                className="w-full border rounded-md px-3 py-2"
                required
              >
                <option value="annuity">Anuitný</option>
                <option value="fixed_principal">Fixná istina</option>
                <option value="interest_only">Len úrok</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Istina (€) *
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={principal}
                  onChange={(e) => setPrincipal(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Úrok (% p.a.) *
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={annualRate}
                  onChange={(e) => setAnnualRate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Doba splácania (mesiace) *
                </label>
                <Input
                  type="number"
                  min="1"
                  value={termMonths}
                  onChange={(e) => setTermMonths(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Dátum začiatku *
                </label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Status *
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full border rounded-md px-3 py-2"
                required
              >
                <option value="active">Aktívny</option>
                <option value="paid_off">Splatený</option>
                <option value="defaulted">Neplnený</option>
              </select>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={saving} className="flex-1">
                {saving ? 'Ukladám...' : 'Uložiť zmeny'}
              </Button>
              <Link href={`/dashboard/loans/${params.id}`} className="flex-1">
                <Button type="button" variant="outline" className="w-full">
                  Zrušiť
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

