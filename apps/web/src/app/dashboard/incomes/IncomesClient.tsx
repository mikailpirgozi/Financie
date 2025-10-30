'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@finapp/ui';
import { DeleteDialog } from '@/components/DeleteDialog';

interface Income {
  id: string;
  date: string;
  amount: number;
  source: string;
  note: string | null;
  categories: {
    id: string;
    name: string;
  } | null;
}

interface IncomesClientProps {
  incomes: Income[];
}

export function IncomesClient({ incomes }: IncomesClientProps) {
  const router = useRouter();

  const handleDelete = async (id: string) => {
    const response = await fetch(`/api/incomes/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Nepodarilo sa zmazať príjem');
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
            <th className="text-left p-4">Zdroj</th>
            <th className="text-left p-4">Poznámka</th>
            <th className="text-right p-4">Suma</th>
            <th className="text-right p-4">Akcie</th>
          </tr>
        </thead>
        <tbody>
          {incomes.map((income) => (
            <tr key={income.id} className="border-b hover:bg-muted/50">
              <td className="p-4">
                {new Date(income.date).toLocaleDateString('sk-SK')}
              </td>
              <td className="p-4">
                <span className="inline-block px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">
                  {income.categories?.name}
                </span>
              </td>
              <td className="p-4 font-medium">{income.source}</td>
              <td className="p-4 text-muted-foreground max-w-xs truncate">
                {income.note || '-'}
              </td>
              <td className="p-4 text-right font-medium text-green-600">
                +{Number(income.amount).toFixed(2)} €
              </td>
              <td className="p-4 text-right">
                <div className="flex gap-2 justify-end">
                  <Link href={`/dashboard/incomes/${income.id}/edit`}>
                    <Button variant="outline" size="sm">
                      Upraviť
                    </Button>
                  </Link>
                  <DeleteDialog
                    title="Zmazať príjem"
                    description={`Naozaj chcete zmazať príjem "${income.source}" vo výške ${Number(income.amount).toFixed(2)} €?`}
                    onConfirm={() => handleDelete(income.id)}
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

