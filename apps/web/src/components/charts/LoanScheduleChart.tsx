'use client';

import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { LoanScheduleEntry } from '@finapp/core';

interface LoanScheduleChartProps {
  schedule: LoanScheduleEntry[];
  type?: 'line' | 'area';
}

export function LoanScheduleChart({ schedule, type = 'area' }: LoanScheduleChartProps): React.JSX.Element {
  const data = schedule.map((entry) => ({
    installment: entry.installmentNo,
    principal: entry.principalDue,
    interest: entry.interestDue,
    fees: entry.feesDue,
    balance: entry.principalBalanceAfter,
    total: entry.totalDue,
  }));

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
          <p className="font-semibold mb-2">Installment {label}</p>
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

  if (type === 'area') {
    return (
      <ResponsiveContainer width="100%" height={400}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="installment" label={{ value: 'Installment', position: 'insideBottom', offset: -5 }} />
          <YAxis tickFormatter={formatCurrency} />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Area
            type="monotone"
            dataKey="principal"
            stackId="1"
            stroke="#3b82f6"
            fill="#3b82f6"
            name="Principal"
          />
          <Area
            type="monotone"
            dataKey="interest"
            stackId="1"
            stroke="#ef4444"
            fill="#ef4444"
            name="Interest"
          />
          <Area
            type="monotone"
            dataKey="fees"
            stackId="1"
            stroke="#f59e0b"
            fill="#f59e0b"
            name="Fees"
          />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="installment" label={{ value: 'Installment', position: 'insideBottom', offset: -5 }} />
        <YAxis tickFormatter={formatCurrency} />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Line type="monotone" dataKey="principal" stroke="#3b82f6" name="Principal" />
        <Line type="monotone" dataKey="interest" stroke="#ef4444" name="Interest" />
        <Line type="monotone" dataKey="balance" stroke="#10b981" name="Balance" />
      </LineChart>
    </ResponsiveContainer>
  );
}

