import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { MonthlyLoanCalendar } from '@finapp/core';
import { ChevronDown, ChevronRight } from 'lucide-react-native';

interface LoanCalendarProps {
  calendar: MonthlyLoanCalendar[];
  summary: {
    totalMonths: number;
    totalPayments: number;
    totalPrincipal: number;
    totalInterest: number;
    totalFees: number;
  };
}

const LOAN_TYPE_ICONS: Record<string, string> = {
  annuity: '🏠',
  fixed_principal: '📊',
  interest_only: '💼',
  auto_loan: '🚗',
};

export function LoanCalendar({ calendar, summary }: LoanCalendarProps) {
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(
    new Set([calendar[0]?.month])
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('sk-SK', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('sk-SK', { year: 'numeric', month: 'long' });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('sk-SK', {
      day: 'numeric',
      month: 'short',
    });
  };

  const toggleMonth = (month: string) => {
    setExpandedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(month)) {
        next.delete(month);
      } else {
        next.add(month);
      }
      return next;
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Summary Card */}
      <Card style={styles.summaryCard}>
        <Text style={styles.title}>📅 Splátkový kalendár</Text>
        <Text style={styles.subtitle}>Najbližších {summary.totalMonths} mesiacov</Text>

        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: '#ef4444' }]}>
              {formatCurrency(summary.totalPayments)}
            </Text>
            <Text style={styles.summaryLabel}>Celkové splátky</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: '#0070f3' }]}>
              {formatCurrency(summary.totalPrincipal)}
            </Text>
            <Text style={styles.summaryLabel}>Istina</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: '#f59e0b' }]}>
              {formatCurrency(summary.totalInterest)}
            </Text>
            <Text style={styles.summaryLabel}>Úroky</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: '#6b7280' }]}>
              {formatCurrency(summary.totalFees)}
            </Text>
            <Text style={styles.summaryLabel}>Poplatky</Text>
          </View>
        </View>
      </Card>

      {/* Monthly Calendar */}
      {calendar.map((monthData) => {
        const isExpanded = expandedMonths.has(monthData.month);
        const isCurrentMonth = monthData.month === new Date().toISOString().slice(0, 7);

        return (
          <Card
            key={monthData.month}
            style={isCurrentMonth ? [styles.monthCard, styles.currentMonthCard] : styles.monthCard}
          >
            <TouchableOpacity
              onPress={() => toggleMonth(monthData.month)}
              style={styles.monthHeader}
            >
              <View style={styles.monthHeaderLeft}>
                {isExpanded ? (
                  <ChevronDown size={20} color="#6b7280" />
                ) : (
                  <ChevronRight size={20} color="#6b7280" />
                )}
                <View>
                  <View style={styles.monthTitleRow}>
                    <Text style={styles.monthTitle}>{formatMonth(monthData.month)}</Text>
                    {isCurrentMonth && (
                      <Badge variant="default">Aktuálny</Badge>
                    )}
                  </View>
                  <Text style={styles.monthSubtitle}>
                    {monthData.entries.length}{' '}
                    {monthData.entries.length === 1 ? 'splátka' : 'splátky'}
                  </Text>
                </View>
              </View>
              <View style={styles.monthHeaderRight}>
                <Text style={[styles.monthTotal, { color: '#ef4444' }]}>
                  {formatCurrency(monthData.totalPayments)}
                </Text>
                <Text style={styles.monthBreakdown}>
                  Istina: {formatCurrency(monthData.totalPrincipal)}
                </Text>
              </View>
            </TouchableOpacity>

            {isExpanded && (
              <View style={styles.monthContent}>
                {monthData.entries.map((entry) => (
                  <View
                    key={`${entry.loanId}-${entry.installmentNo}`}
                    style={styles.entryCard}
                  >
                    <View style={styles.entryHeader}>
                      <View style={styles.entryHeaderLeft}>
                        <Text style={styles.loanIcon}>
                          {LOAN_TYPE_ICONS[entry.loanType] || '💰'}
                        </Text>
                        <View>
                          <Text style={styles.loanName}>{entry.loanName}</Text>
                          <View style={styles.entryMeta}>
                            <Text style={styles.entryMetaText}>
                              {formatDate(typeof entry.dueDate === 'string' ? entry.dueDate : entry.dueDate.toISOString())}
                            </Text>
                            <Text style={styles.entryMetaText}>•</Text>
                            <Text style={styles.entryMetaText}>
                              Splátka #{entry.installmentNo}
                            </Text>
                          </View>
                          {entry.linkedAssetName && (
                            <Text style={styles.linkedAsset}>
                              🏠 {entry.linkedAssetName}
                            </Text>
                          )}
                        </View>
                      </View>
                      <Badge
                        variant={entry.status === 'paid' ? 'success' : entry.status === 'overdue' ? 'error' : 'warning'}
                        size="sm"
                      >
                        {entry.status === 'paid'
                          ? 'Zaplatené'
                          : entry.status === 'overdue'
                          ? 'Po splatnosti'
                          : 'Čaká'}
                      </Badge>
                    </View>

                    <View style={styles.entryDetails}>
                      <View style={styles.entryDetailRow}>
                        <Text style={styles.entryDetailLabel}>Celkom</Text>
                        <Text style={styles.entryDetailValue}>
                          {formatCurrency(entry.totalDue)}
                        </Text>
                      </View>
                      <View style={styles.entryDetailRow}>
                        <Text style={styles.entryDetailLabel}>Istina</Text>
                        <Text style={styles.entryDetailValue}>
                          {formatCurrency(entry.principalDue)}
                        </Text>
                      </View>
                      <View style={styles.entryDetailRow}>
                        <Text style={styles.entryDetailLabel}>Úrok</Text>
                        <Text style={styles.entryDetailValue}>
                          {formatCurrency(entry.interestDue)}
                        </Text>
                      </View>
                      {entry.feesDue > 0 && (
                        <View style={styles.entryDetailRow}>
                          <Text style={styles.entryDetailLabel}>Poplatky</Text>
                          <Text style={styles.entryDetailValue}>
                            {formatCurrency(entry.feesDue)}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))}

                {/* Month Summary */}
                <View style={styles.monthSummary}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryRowLabel}>Celkom:</Text>
                    <Text style={styles.summaryRowValue}>
                      {formatCurrency(monthData.totalPayments)}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryRowLabel}>Istina:</Text>
                    <Text style={styles.summaryRowValue}>
                      {formatCurrency(monthData.totalPrincipal)}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryRowLabel}>Úroky:</Text>
                    <Text style={styles.summaryRowValue}>
                      {formatCurrency(monthData.totalInterest)}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryRowLabel}>Poplatky:</Text>
                    <Text style={styles.summaryRowValue}>
                      {formatCurrency(monthData.totalFees)}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </Card>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  summaryCard: {
    padding: 16,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryItem: {
    flex: 1,
    minWidth: '47%',
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 10,
    color: '#6b7280',
    textAlign: 'center',
  },
  monthCard: {
    marginBottom: 12,
    padding: 0,
    overflow: 'hidden',
  },
  currentMonthCard: {
    borderWidth: 2,
    borderColor: '#0070f3',
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  monthHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  monthTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  monthSubtitle: {
    fontSize: 12,
    color: '#6b7280',
  },
  monthHeaderRight: {
    alignItems: 'flex-end',
  },
  monthTotal: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  monthBreakdown: {
    fontSize: 10,
    color: '#6b7280',
  },
  monthContent: {
    padding: 16,
    paddingTop: 0,
    gap: 12,
  },
  entryCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  entryHeaderLeft: {
    flexDirection: 'row',
    gap: 12,
    flex: 1,
  },
  loanIcon: {
    fontSize: 24,
  },
  loanName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  entryMeta: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
  },
  entryMetaText: {
    fontSize: 10,
    color: '#6b7280',
  },
  linkedAsset: {
    fontSize: 10,
    color: '#6b7280',
  },
  entryDetails: {
    gap: 8,
  },
  entryDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  entryDetailLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  entryDetailValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  monthSummary: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryRowLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  summaryRowValue: {
    fontSize: 12,
    fontWeight: '600',
  },
});

