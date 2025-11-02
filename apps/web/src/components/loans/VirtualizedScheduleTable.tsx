'use client';

import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef, useMemo } from 'react';
import { Button } from '@finapp/ui';
import { Loader2 } from 'lucide-react';

interface ScheduleEntry {
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

interface Props {
  schedule: ScheduleEntry[];
  loading?: string | null;
  onPay: (id: string, amount: number) => void;
}

export function VirtualizedScheduleTable({
  schedule,
  loading,
  onPay,
}: Props): React.JSX.Element {
  const parentRef = useRef<HTMLDivElement>(null);

  // ✅ Memoizované výpočty (raz pri načítaní)
  const enrichedSchedule = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueSoonDate = new Date(today);
    dueSoonDate.setDate(dueSoonDate.getDate() + 7);

    return schedule.map((entry) => {
      const dueDate = new Date(entry.due_date);
      dueDate.setHours(0, 0, 0, 0);

      return {
        ...entry,
        dueDate,
        formattedDate: dueDate.toLocaleDateString('sk-SK'),
        isDueSoon:
          entry.status !== 'paid' && dueDate >= today && dueDate <= dueSoonDate,
        isOverdue: entry.status === 'overdue',
      };
    });
  }, [schedule]);

  // Virtualizer - renderuje len viditeľné riadky
  const virtualizer = useVirtualizer({
    count: enrichedSchedule.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 52, // row height in px
    overscan: 15, // render extra rows for smooth scrolling
  });

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header - sticky */}
      <div className="bg-muted/50 border-b sticky top-0 z-10">
        <div className="grid grid-cols-9 gap-2 p-2 text-sm font-medium">
          <div>#</div>
          <div>Dátum</div>
          <div className="text-right">Istina</div>
          <div className="text-right">Úrok</div>
          <div className="text-right">Poplatky</div>
          <div className="text-right">Celkom</div>
          <div className="text-right">Zostatok</div>
          <div className="text-center">Status</div>
          <div className="text-center">Akcia</div>
        </div>
      </div>

      {/* Virtualized body */}
      <div ref={parentRef} className="h-[600px] overflow-auto">
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const entry = enrichedSchedule[virtualRow.index];
            if (!entry) return null;

            return (
              <div
                key={virtualRow.key}
                data-index={virtualRow.index}
                className={`absolute top-0 left-0 w-full border-b hover:bg-muted/50 transition-colors ${
                  entry.isOverdue
                    ? 'bg-red-50'
                    : entry.isDueSoon
                      ? 'bg-orange-50'
                      : ''
                }`}
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <div className="grid grid-cols-9 gap-2 p-2 text-sm items-center h-full">
                  <div>{entry.installment_no}</div>
                  <div>
                    {entry.formattedDate}
                    {entry.isOverdue && (
                      <span className="ml-2 text-xs text-red-600">⚠️</span>
                    )}
                    {entry.isDueSoon && !entry.isOverdue && (
                      <span className="ml-2 text-xs text-orange-600">🔔</span>
                    )}
                  </div>
                  <div className="text-right">
                    {Number(entry.principal_due).toFixed(2)} €
                  </div>
                  <div className="text-right">
                    {Number(entry.interest_due).toFixed(2)} €
                  </div>
                  <div className="text-right">
                    {Number(entry.fees_due).toFixed(2)} €
                  </div>
                  <div className="text-right font-medium">
                    {Number(entry.total_due).toFixed(2)} €
                  </div>
                  <div className="text-right text-muted-foreground">
                    {Number(entry.principal_balance_after).toFixed(2)} €
                  </div>
                  <div className="text-center">
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
                  </div>
                  <div className="text-center">
                    {entry.status !== 'paid' && (
                      <Button
                        size="sm"
                        variant={entry.isOverdue ? 'destructive' : 'outline'}
                        onClick={() => onPay(entry.id, Number(entry.total_due))}
                        disabled={loading === entry.id}
                      >
                        {loading === entry.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Uhradiť'
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
