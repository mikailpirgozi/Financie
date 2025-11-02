'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

interface NetWorthChartProps {
  data: {
    month: string;
    netWorth: number;
    assets: number;
    liabilities: number;
  }[];
}

export function NetWorthChart({ data }: NetWorthChartProps): React.JSX.Element {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('sk-SK', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border rounded-lg shadow-lg">
          <p className="font-semibold mb-2">{label}</p>
          {payload.map((entry, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis tickFormatter={formatCurrency} />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <ReferenceLine y={0} stroke="#000" strokeDasharray="3 3" />
        <Line
          type="monotone"
          dataKey="assets"
          stroke="#10b981"
          strokeWidth={2}
          name="Assets"
          dot={{ r: 4 }}
        />
        <Line
          type="monotone"
          dataKey="liabilities"
          stroke="#ef4444"
          strokeWidth={2}
          name="Liabilities"
          dot={{ r: 4 }}
        />
        <Line
          type="monotone"
          dataKey="netWorth"
          stroke="#3b82f6"
          strokeWidth={3}
          name="Net Worth"
          dot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

