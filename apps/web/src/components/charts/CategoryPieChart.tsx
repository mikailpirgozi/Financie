'use client';

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';

interface CategoryPieChartProps {
  data: {
    name: string;
    value: number;
    color?: string;
  }[];
}

const DEFAULT_COLORS = [
  '#3b82f6',
  '#ef4444',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#84cc16',
];

export function CategoryPieChart({
  data,
}: CategoryPieChartProps): React.JSX.Element | null {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('sk-SK', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { fill: string; total: number } }> }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-white p-4 border rounded-lg shadow-lg">
          <p className="font-semibold">{data.name}</p>
          <p style={{ color: data.payload.fill }}>
            {formatCurrency(data.value)}
          </p>
          <p className="text-sm text-gray-500">
            {((data.value / data.payload.total) * 100).toFixed(1)}%
          </p>
        </div>
      );
    }
    return null;
  };

  const total = data.reduce((sum, entry) => sum + entry.value, 0);
  const dataWithTotal = data.map((entry) => ({ ...entry, total }));

  return (
    <ResponsiveContainer width="100%" height={400}>
      <PieChart>
        <Pie
          data={dataWithTotal}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''} (${((percent ?? 0) * 100).toFixed(0)}%)`}
          outerRadius={120}
          fill="#8884d8"
          dataKey="value"
        >
          {dataWithTotal.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
            />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

