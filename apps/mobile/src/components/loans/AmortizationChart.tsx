import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts';

interface AmortizationEntry {
  installment_no: number;
  due_date: string;
  principal_due: string | number;
  interest_due: string | number;
  total_due?: string | number;
  status: 'pending' | 'paid' | 'overdue';
}

interface AmortizationChartProps {
  schedule: AmortizationEntry[];
  /** Max bars to render (subsamples if schedule is longer). */
  maxBars?: number;
  height?: number;
}

function parseAmount(val: string | number | null | undefined): number {
  if (val === null || val === undefined) return 0;
  const num = typeof val === 'string' ? parseFloat(val) : val;
  return Number.isFinite(num) ? num : 0;
}

/**
 * Lightweight stacked bar chart showing principal vs interest split
 * over the lifetime of the loan. Purely View-based (no SVG dependency).
 */
function AmortizationChartComponent({
  schedule,
  maxBars = 36,
  height = 140,
}: AmortizationChartProps) {
  const { theme } = useTheme();
  const colors = theme.colors;

  const data = useMemo(() => {
    if (!schedule.length) return [];
    // Subsample to maxBars evenly across the schedule
    if (schedule.length <= maxBars) return schedule;
    const step = schedule.length / maxBars;
    const sampled: AmortizationEntry[] = [];
    for (let i = 0; i < maxBars; i++) {
      const idx = Math.min(Math.floor(i * step), schedule.length - 1);
      const entry = schedule[idx];
      if (entry) sampled.push(entry);
    }
    return sampled;
  }, [schedule, maxBars]);

  const maxTotal = useMemo(() => {
    let max = 0;
    for (const entry of data) {
      const t = parseAmount(entry.principal_due) + parseAmount(entry.interest_due);
      if (t > max) max = t;
    }
    return max || 1;
  }, [data]);

  const totals = useMemo(() => {
    let principal = 0;
    let interest = 0;
    for (const entry of schedule) {
      principal += parseAmount(entry.principal_due);
      interest += parseAmount(entry.interest_due);
    }
    return { principal, interest, sum: principal + interest };
  }, [schedule]);

  if (!data.length) return null;

  const principalShare = totals.sum ? (totals.principal / totals.sum) * 100 : 0;

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('sk-SK', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(amount);

  const firstEntry = data[0];
  const lastEntry = data[data.length - 1];

  return (
    <View
      style={styles.container}
      accessible
      accessibilityLabel={`Amortizačný graf. Istina ${Math.round(principalShare)} percent, úrok ${Math.round(100 - principalShare)} percent.`}
    >
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
          <Text style={[styles.legendLabel, { color: colors.textSecondary }]}>
            Istina {formatCurrency(totals.principal)}
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.warning }]} />
          <Text style={[styles.legendLabel, { color: colors.textSecondary }]}>
            Úrok {formatCurrency(totals.interest)}
          </Text>
        </View>
      </View>

      <View style={[styles.chart, { height }]}>
        {data.map((entry, idx) => {
          const principal = parseAmount(entry.principal_due);
          const interest = parseAmount(entry.interest_due);
          const total = principal + interest;
          const totalHeight = (total / maxTotal) * height;
          const principalHeight = total ? (principal / total) * totalHeight : 0;
          const interestHeight = totalHeight - principalHeight;
          const isPaid = entry.status === 'paid';

          return (
            <View key={`${entry.installment_no}-${idx}`} style={styles.barColumn}>
              <View style={styles.barStack}>
                <View
                  style={{
                    width: '100%',
                    height: interestHeight,
                    backgroundColor: colors.warning,
                    opacity: isPaid ? 0.45 : 1,
                    borderTopLeftRadius: 2,
                    borderTopRightRadius: 2,
                  }}
                />
                <View
                  style={{
                    width: '100%',
                    height: principalHeight,
                    backgroundColor: colors.primary,
                    opacity: isPaid ? 0.45 : 1,
                    borderBottomLeftRadius: 2,
                    borderBottomRightRadius: 2,
                  }}
                />
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.xAxisRow}>
        <Text style={[styles.axisLabel, { color: colors.textMuted }]}>
          #{firstEntry?.installment_no ?? 1}
        </Text>
        <Text style={[styles.axisLabel, { color: colors.textMuted }]}>
          #{lastEntry?.installment_no ?? schedule.length}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  legendRow: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    marginTop: 4,
  },
  barColumn: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  barStack: {
    width: '100%',
    justifyContent: 'flex-end',
  },
  xAxisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  axisLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
});

export const AmortizationChart = memo(AmortizationChartComponent);
