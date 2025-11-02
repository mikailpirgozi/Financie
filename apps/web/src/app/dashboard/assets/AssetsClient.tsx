'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@finapp/ui';
import { DeleteDialog } from '@/components/DeleteDialog';

interface Asset {
  id: string;
  kind: string;
  name: string;
  acquisition_value: number;
  current_value: number;
  acquisition_date: string;
}

interface AssetsClientProps {
  assets: Asset[];
}

export function AssetsClient({ assets }: AssetsClientProps): React.JSX.Element {
  const router = useRouter();

  const handleDelete = async (id: string) => {
    const response = await fetch(`/api/assets/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Nepodarilo sa zmazať majetok');
    }

    router.refresh();
  };

  const getKindLabel = (kind: string) => {
    switch (kind) {
      case 'real_estate':
        return '🏠 Nehnuteľnosť';
      case 'vehicle':
        return '🚗 Vozidlo';
      case 'business':
        return '💼 Podnikanie';
      case 'loan_receivable':
        return '💰 Poskytnutá pôžička';
      case 'other':
        return '📦 Iné';
      default:
        return kind;
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left p-4">Názov</th>
            <th className="text-left p-4">Typ</th>
            <th className="text-right p-4">Nákupná cena</th>
            <th className="text-right p-4">Aktuálna hodnota</th>
            <th className="text-right p-4">Zmena</th>
            <th className="text-left p-4">Dátum nákupu</th>
            <th className="text-right p-4">Akcie</th>
          </tr>
        </thead>
        <tbody>
          {assets.map((asset) => {
            const changePercent =
              ((Number(asset.current_value) - Number(asset.acquisition_value)) /
                Number(asset.acquisition_value)) *
              100;

            return (
              <tr key={asset.id} className="border-b hover:bg-muted/50">
                <td className="p-4 font-medium">{asset.name}</td>
                <td className="p-4">
                  <span className="inline-block px-2 py-1 rounded-full text-xs bg-primary/10 text-primary">
                    {getKindLabel(asset.kind)}
                  </span>
                </td>
                <td className="p-4 text-right text-muted-foreground">
                  {Number(asset.acquisition_value).toFixed(2)} €
                </td>
                <td className="p-4 text-right font-medium">
                  {Number(asset.current_value).toFixed(2)} €
                </td>
                <td className="p-4 text-right">
                  <span
                    className={`font-medium ${
                      changePercent >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {changePercent >= 0 ? '+' : ''}
                    {changePercent.toFixed(1)}%
                  </span>
                </td>
                <td className="p-4 text-muted-foreground">
                  {new Date(asset.acquisition_date).toLocaleDateString('sk-SK')}
                </td>
                <td className="p-4 text-right">
                  <div className="flex gap-2 justify-end">
                    <Link href={`/dashboard/assets/${asset.id}`}>
                      <Button variant="outline" size="sm">
                        Detail
                      </Button>
                    </Link>
                    <Link href={`/dashboard/assets/${asset.id}/edit`}>
                      <Button variant="outline" size="sm">
                        Upraviť
                      </Button>
                    </Link>
                    <DeleteDialog
                      title="Zmazať majetok"
                      description={`Naozaj chcete zmazať majetok "${asset.name}"? Táto akcia je nevratná.`}
                      onConfirm={() => handleDelete(asset.id)}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

