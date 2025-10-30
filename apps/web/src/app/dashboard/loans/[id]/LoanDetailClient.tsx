'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@finapp/ui';
import { Loader2 } from 'lucide-react';

interface LoanScheduleEntry {
  id: string;
  installment_no: number;
  due_date: string;
  principal_due: string;
  interest_due: string;
  fees_due: string;
  total_due: string;
  principal_balance_after: string;
  status: string;
}

interface LoanDetailClientProps {
  loanId: string;
  schedule: LoanScheduleEntry[];
}

export function LoanDetailClient({ loanId, schedule }: LoanDetailClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRegenerateSchedule = async () => {
    if (!confirm('Naozaj chcete regenerovať splátkový kalendár? Toto vymaže existujúce záznamy.')) {
      return;
    }

    setLoading('regenerate');
    setError(null);

    try {
      const res = await fetch(`/api/loans/${loanId}/regenerate-schedule`, {
        method: 'POST',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to regenerate schedule');
      }

      router.refresh();
      alert('Splátkový kalendár bol úspešne regenerovaný!');
    } catch (err) {
      console.error('Error:', err);
      setError(err instanceof Error ? err.message : 'Nepodarilo sa regenerovať kalendár');
    } finally {
      setLoading(null);
    }
  };

  const handlePayInstallment = async (installmentId: string, amount: number) => {
    if (!confirm(`Naozaj chcete uhradiť splátku vo výške ${amount.toFixed(2)} €?`)) {
      return;
    }

    setLoading(installmentId);
    setError(null);

    try {
      const res = await fetch(`/api/loans/${loanId}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          installmentId,
          amount,
          date: new Date().toISOString().split('T')[0],
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to pay installment');
      }

      router.refresh();
      alert('Splátka bola úspešne uhradená!');
    } catch (err) {
      console.error('Error:', err);
      setError(err instanceof Error ? err.message : 'Nepodarilo sa uhradiť splátku');
    } finally {
      setLoading(null);
    }
  };

  const handleMarkPaidUntilToday = async () => {
    const today = new Date().toISOString().split('T')[0];
    
    console.log('=== DEBUG START ===');
    console.log('Today:', today);
    console.log('Schedule entries:', schedule.length);
    console.log('First 3 entries:', schedule.slice(0, 3).map(e => ({
      no: e.installment_no,
      due_date: e.due_date,
      status: e.status
    })));
    
    const pendingUntilToday = schedule.filter(
      (entry) => (entry.status === 'pending' || entry.status === 'overdue') && entry.due_date <= today
    );

    console.log('Pending until today count:', pendingUntilToday.length);
    console.log('Pending installments:', pendingUntilToday.map(e => ({
      no: e.installment_no,
      due_date: e.due_date,
      status: e.status
    })));
    console.log('=== DEBUG END ===');

    if (pendingUntilToday.length === 0) {
      alert('Žiadne splátky na označenie. Všetky splátky do dnešného dátumu sú už uhradené.');
      return;
    }

    if (!confirm(`Naozaj chcete označiť ${pendingUntilToday.length} splátok ako uhradené k dnešnému dátumu (${today})?`)) {
      return;
    }

    setLoading('mark-paid-today');
    setError(null);

    try {
      console.log('Calling API:', `/api/loans/${loanId}/mark-paid-until-today`);
      const res = await fetch(`/api/loans/${loanId}/mark-paid-until-today`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: today }),
      });

      console.log('Response status:', res.status);
      
      if (!res.ok) {
        const data = await res.json();
        console.error('Error response:', data);
        throw new Error(data.error || 'Failed to mark installments as paid');
      }

      const result = await res.json();
      console.log('Success:', result);

      router.refresh();
      alert(`${result.count} splátok bolo úspešne označených ako uhradených!`);
    } catch (err) {
      console.error('Error:', err);
      setError(err instanceof Error ? err.message : 'Nepodarilo sa označiť splátky');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {schedule.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded">
          <p className="font-medium">Splátkový kalendár nebol vygenerovaný</p>
          <Button
            onClick={handleRegenerateSchedule}
            disabled={loading === 'regenerate'}
            className="mt-2"
            size="sm"
          >
            {loading === 'regenerate' ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generujem...
              </>
            ) : (
              'Vygenerovať kalendár'
            )}
          </Button>
        </div>
      )}

      {schedule.length > 0 && (
        <>
          <div className="flex justify-end mb-4">
            <Button
              onClick={handleMarkPaidUntilToday}
              disabled={loading === 'mark-paid-today'}
              variant="outline"
              size="sm"
            >
              {loading === 'mark-paid-today' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Označujem...
                </>
              ) : (
                <>📅 Označiť splátky ako uhradené k dnešnému dátumu</>
              )}
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">#</th>
                <th className="text-left p-2">Dátum</th>
                <th className="text-right p-2">Istina</th>
                <th className="text-right p-2">Úrok</th>
                <th className="text-right p-2">Poplatky</th>
                <th className="text-right p-2">Celkom</th>
                <th className="text-right p-2">Zostatok</th>
                <th className="text-center p-2">Status</th>
                <th className="text-center p-2">Akcia</th>
              </tr>
            </thead>
            <tbody>
              {schedule.map((entry) => {
                const dueDate = new Date(entry.due_date);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                dueDate.setHours(0, 0, 0, 0);
                
                const dueSoonDate = new Date(today);
                dueSoonDate.setDate(dueSoonDate.getDate() + 7);
                
                const isDueSoon = entry.status !== 'paid' && dueDate >= today && dueDate <= dueSoonDate;
                const isOverdue = entry.status === 'overdue';
                
                return (
                  <tr 
                    key={entry.id} 
                    className={`border-b hover:bg-muted/50 ${
                      isOverdue ? 'bg-red-50' : isDueSoon ? 'bg-orange-50' : ''
                    }`}
                  >
                    <td className="p-2">{entry.installment_no}</td>
                    <td className="p-2">
                      {new Date(entry.due_date).toLocaleDateString('sk-SK')}
                      {isOverdue && (
                        <span className="ml-2 text-xs text-red-600">⚠️ Po splatnosti</span>
                      )}
                      {isDueSoon && !isOverdue && (
                        <span className="ml-2 text-xs text-orange-600">🔔 Čoskoro</span>
                      )}
                    </td>
                    <td className="text-right p-2">
                      {Number(entry.principal_due).toFixed(2)} €
                    </td>
                    <td className="text-right p-2">
                      {Number(entry.interest_due).toFixed(2)} €
                    </td>
                    <td className="text-right p-2">{Number(entry.fees_due).toFixed(2)} €</td>
                    <td className="text-right p-2 font-medium">
                      {Number(entry.total_due).toFixed(2)} €
                    </td>
                    <td className="text-right p-2 text-muted-foreground">
                      {Number(entry.principal_balance_after).toFixed(2)} €
                    </td>
                    <td className="text-center p-2">
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs ${
                          entry.status === 'paid'
                            ? 'bg-green-100 text-green-700'
                            : entry.status === 'overdue'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {entry.status === 'paid' && 'Zaplatené'}
                        {entry.status === 'overdue' && 'Omeškané'}
                        {entry.status === 'pending' && 'Čaká'}
                      </span>
                    </td>
                    <td className="text-center p-2">
                      {entry.status !== 'paid' && (
                        <Button
                          size="sm"
                          variant={isOverdue ? 'destructive' : 'outline'}
                          onClick={() =>
                            handlePayInstallment(entry.id, Number(entry.total_due))
                          }
                          disabled={loading === entry.id}
                        >
                          {loading === entry.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Uhradiť'
                          )}
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </>
      )}
    </div>
  );
}

