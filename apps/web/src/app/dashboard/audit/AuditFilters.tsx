'use client';

import { Card, CardContent } from '@finapp/ui';
import { useRouter, useSearchParams } from 'next/navigation';

export function AuditFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const entityType = searchParams.get('entityType') || '';
  const action = searchParams.get('action') || '';

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/dashboard/audit?${params.toString()}`);
  };

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="flex gap-4 flex-wrap">
          <div>
            <label className="text-sm font-medium">Typ entity:</label>
            <select
              className="ml-2 border rounded px-3 py-1"
              value={entityType}
              onChange={(e) => handleFilterChange('entityType', e.target.value)}
            >
              <option value="">Všetky</option>
              <option value="loan">Úvery</option>
              <option value="expense">Výdavky</option>
              <option value="income">Príjmy</option>
              <option value="asset">Majetok</option>
              <option value="household_member">Členovia</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Akcia:</label>
            <select
              className="ml-2 border rounded px-3 py-1"
              value={action}
              onChange={(e) => handleFilterChange('action', e.target.value)}
            >
              <option value="">Všetky</option>
              <option value="create">Vytvorené</option>
              <option value="update">Upravené</option>
              <option value="delete">Zmazané</option>
              <option value="payment">Platba</option>
            </select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
