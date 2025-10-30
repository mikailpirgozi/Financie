'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@finapp/ui';
import { DeleteDialog } from '@/components/DeleteDialog';

interface Expense {
  id: string;
  date: string;
  amount: number;
  merchant: string | null;
  note: string | null;
  categories: {
    id: string;
    name: string;
  } | null;
}

interface ExpensesClientProps {
  expenses: Expense[];
}

export function ExpensesClient({ expenses }: ExpensesClientProps) {
  const router = useRouter();

  const handleDelete = async (id: string) => {
    const response = await fetch(`/api/expenses/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Nepodarilo sa zmazať výdavok');
    }

    router.refresh();
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left p-4">Dátum</th>
            <th className="text-left p-4">Kategória</th>
            <th className="text-left p-4">Obchodník</th>
            <th className="text-left p-4">Poznámka</th>
            <th className="text-right p-4">Suma</th>
            <th className="text-right p-4">Akcie</th>
          </tr>
        </thead>
        <tbody>
          {expenses.map((expense) => (
            <tr key={expense.id} className="border-b hover:bg-muted/50">
              <td className="p-4">
                {new Date(expense.date).toLocaleDateString('sk-SK')}
              </td>
              <td className="p-4">
                <span className="inline-block px-2 py-1 rounded-full text-xs bg-primary/10 text-primary">
                  {expense.categories?.name}
                </span>
              </td>
              <td className="p-4 text-muted-foreground">
                {expense.merchant || '-'}
              </td>
              <td className="p-4 text-muted-foreground max-w-xs truncate">
                {expense.note || '-'}
              </td>
              <td className="p-4 text-right font-medium">
                {Number(expense.amount).toFixed(2)} €
              </td>
              <td className="p-4 text-right">
                <div className="flex gap-2 justify-end">
                  <Link href={`/dashboard/expenses/${expense.id}/edit`}>
                    <Button variant="outline" size="sm">
                      Upraviť
                    </Button>
                  </Link>
                  <DeleteDialog
                    title="Zmazať výdavok"
                    description={`Naozaj chcete zmazať výdavok ${expense.merchant ? `"${expense.merchant}"` : ''} vo výške ${Number(expense.amount).toFixed(2)} €?`}
                    onConfirm={() => handleDelete(expense.id)}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

