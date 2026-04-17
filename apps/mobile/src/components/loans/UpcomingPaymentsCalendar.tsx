import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Calendar as CalendarIcon, AlertTriangle } from 'lucide-react-native';
import { useTheme } from '../../contexts';
import type { Loan } from '../../lib/api';

interface UpcomingPaymentsCalendarProps {
  loans: Loan[];
  onPaymentPress?: (loanId: string) => void;
  limit?: number;
}

interface UpcomingPayment {
  loanId: string;
  lender: string;
  loanName?: string;
  dueDate: Date;
  amount: number;
  daysUntil: number;
  status: 'overdue' | 'due_today' | 'due_soon' | 'upcoming';
}

function parseAmount(val: number | string | null | undefined): number {
  if (val === undefined || val === null) return 0;
  const num = typeof val === 'string' ? parseFloat(val) : val;
  return Number.isFinite(num) ? num : 0;
}

/**
 * UpcomingPaymentsCalendar - aggregates next payments across all active loans
 * and shows a horizontal scrollable list of the next N installments.
 */
function UpcomingPaymentsCalendarComponent({
  loans,
  onPaymentPress,
  limit = 6,
}: UpcomingPaymentsCalendarProps) {
  const { theme } = useTheme();
  const colors = theme.colors;

  const payments = useMemo<UpcomingPayment[]>(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const collected: UpcomingPayment[] = [];

    for (const loan of loans) {
      if (loan.status === 'paid_off') continue;
      const next = loan.next_installment;
      const dueIso = next?.due_date || loan.next_payment_due_date;
      if (!dueIso) continue;

      const dueDate = new Date(dueIso);
      if (Number.isNaN(dueDate.getTime())) continue;

      const dueDay = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
      const daysUntil = Math.round((dueDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      const amount = parseAmount(next?.total_due ?? loan.monthly_payment);

      let status: UpcomingPayment['status'] = 'upcoming';
      if (daysUntil < 0) status = 'overdue';
      else if (daysUntil === 0) status = 'due_today';
      else if (daysUntil <= 5) status = 'due_soon';

      collected.push({
        loanId: loan.id,
        lender: loan.lender,
        loanName: loan.name ?? undefined,
        dueDate,
        amount,
        daysUntil,
        status,
      });
    }

    collected.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
    return collected.slice(0, limit);
  }, [loans, limit]);

  if (!payments.length) return null;

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('sk-SK', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

  const formatDay = (date: Date) => date.getDate().toString();
  const formatMonth = (date: Date) =>
    date.toLocaleDateString('sk-SK', { month: 'short' }).replace('.', '');

  const getStatusColor = (status: UpcomingPayment['status']) => {
    switch (status) {
      case 'overdue':
        return colors.danger;
      case 'due_today':
        return colors.warning;
      case 'due_soon':
        return colors.warning;
      default:
        return colors.primary;
    }
  };

  const getDaysLabel = (daysUntil: number) => {
    if (daysUntil < 0) return `${Math.abs(daysUntil)} d po`;
    if (daysUntil === 0) return 'Dnes';
    if (daysUntil === 1) return 'Zajtra';
    if (daysUntil <= 7) return `Za ${daysUntil} d`;
    return `Za ${daysUntil} d`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.headerTitleRow}>
          <CalendarIcon size={16} color={colors.textSecondary} />
          <Text style={[styles.headerTitle, { color: colors.textSecondary }]}>
            Kalendár splátok
          </Text>
        </View>
        <Text style={[styles.headerCount, { color: colors.textMuted }]}>
          najbližších {payments.length}
        </Text>
      </View>
      <View style={styles.list}>
        {payments.map((p) => {
          const statusColor = getStatusColor(p.status);
          return (
            <Pressable
              key={`${p.loanId}-${p.dueDate.toISOString()}`}
              onPress={() => onPaymentPress?.(p.loanId)}
              accessibilityRole="button"
              accessibilityLabel={`${p.loanName ?? p.lender}, splátka ${formatCurrency(p.amount)}, ${getDaysLabel(p.daysUntil)}`}
              style={({ pressed }) => [
                styles.item,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <View style={[styles.dateBadge, { backgroundColor: statusColor + '15' }]}>
                {p.status === 'overdue' ? (
                  <AlertTriangle size={14} color={statusColor} />
                ) : (
                  <>
                    <Text style={[styles.dateDay, { color: statusColor }]}>
                      {formatDay(p.dueDate)}
                    </Text>
                    <Text style={[styles.dateMonth, { color: statusColor }]}>
                      {formatMonth(p.dueDate)}
                    </Text>
                  </>
                )}
              </View>
              <View style={styles.itemBody}>
                <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={1}>
                  {p.loanName || p.lender}
                </Text>
                <Text style={[styles.itemAmount, { color: colors.text }]}>
                  {formatCurrency(p.amount)}
                </Text>
                <Text style={[styles.itemDays, { color: statusColor }]}>
                  {getDaysLabel(p.daysUntil)}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginBottom: 10,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headerCount: {
    fontSize: 11,
    fontWeight: '500',
  },
  list: {
    gap: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    gap: 12,
  },
  dateBadge: {
    width: 48,
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateDay: {
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 20,
  },
  dateMonth: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  itemBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  itemAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  itemDays: {
    fontSize: 11,
    fontWeight: '700',
    minWidth: 60,
    textAlign: 'right',
  },
});

export const UpcomingPaymentsCalendar = memo(UpcomingPaymentsCalendarComponent);
