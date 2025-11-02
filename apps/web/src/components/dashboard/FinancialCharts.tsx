'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { MonthlyDashboardData } from '@finapp/core';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts';

interface FinancialChartsProps {
  data: MonthlyDashboardData[];
}

export function FinancialCharts({
  data,
}: FinancialChartsProps): React.JSX.Element | null {
  // Sort data by month ascending for charts
  const sortedData = [...data].sort((a, b) => a.month.localeCompare(b.month));

  // Transform data for charts
  const chartData = sortedData.map((item) => ({
    month: item.month.slice(5), // Get MM part
    fullMonth: item.month,
    income: parseFloat(item.totalIncome),
    expenses: parseFloat(item.totalExpenses),
    netWorth: parseFloat(item.netWorth),
    loanBalance: parseFloat(item.loanBalanceRemaining),
    loanPayment: parseFloat(item.loanPaymentsTotal),
    netWorthChange: parseFloat(item.netWorthChange),
  }));

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('sk-SK', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{ value: number; name: string; color: string }>;
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-semibold mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>📈 Grafy - Vývoj za rok</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="income-expenses" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="income-expenses">Príjmy vs Výdaje</TabsTrigger>
            <TabsTrigger value="net-worth">Čistá hodnota</TabsTrigger>
            <TabsTrigger value="loans">Úvery</TabsTrigger>
            <TabsTrigger value="growth">Rast majetku</TabsTrigger>
          </TabsList>

          <TabsContent value="income-expenses" className="mt-6">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => formatCurrency(value)} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="income" name="Príjmy" fill="hsl(142, 76%, 36%)" />
                <Bar dataKey="expenses" name="Výdaje" fill="hsl(0, 84%, 60%)" />
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="net-worth" className="mt-6">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => formatCurrency(value)} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="netWorth"
                  name="Čistá hodnota"
                  stroke="hsl(221, 83%, 53%)"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="loans" className="mt-6">
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => formatCurrency(value)} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="loanBalance"
                  name="Zostatok dlhu"
                  stroke="hsl(0, 84%, 60%)"
                  strokeWidth={2}
                />
                <Bar dataKey="loanPayment" name="Mesačná splátka" fill="hsl(221, 83%, 53%)" />
              </ComposedChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="growth" className="mt-6">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => formatCurrency(value)} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="netWorthChange"
                  name="Mesačný rast"
                  fill="hsl(142, 76%, 36%)"
                  stroke="hsl(142, 76%, 36%)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

