import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Card } from '@/components/ui/Card';
import type { PortfolioOverview } from '@finapp/core';
import { TrendingUp, TrendingDown, Home } from 'lucide-react-native';

interface PortfolioOverviewProps {
  data: PortfolioOverview;
}

export function PortfolioOverviewCard({ data }: PortfolioOverviewProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('sk-SK', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const debtRatioColor = data.debtToAssetRatio < 50 ? '#10b981' : data.debtToAssetRatio < 75 ? '#f59e0b' : '#ef4444';
  const cashFlowColor = data.totalMonthlyCashFlow >= 0 ? '#10b981' : '#ef4444';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Top KPI Cards */}
      <View style={styles.kpiSection}>
        {/* Net Worth */}
        <Card style={styles.kpiCard}>
          <View style={styles.kpiHeader}>
            <Text style={styles.kpiLabel}>Čistá hodnota</Text>
            <TrendingUp size={16} color="#8b5cf6" />
          </View>
          <Text style={[styles.kpiValue, { color: '#8b5cf6' }]}>
            {formatCurrency(data.netWorth)}
          </Text>
          <Text style={styles.kpiSubtitle}>majetok - dlhy</Text>
        </Card>

        {/* Debt Ratio */}
        <Card style={styles.kpiCard}>
          <View style={styles.kpiHeader}>
            <Text style={styles.kpiLabel}>Zadlženie</Text>
            <View style={[styles.indicator, { backgroundColor: debtRatioColor }]} />
          </View>
          <Text style={[styles.kpiValue, { color: debtRatioColor }]}>
            {formatPercentage(data.debtToAssetRatio)}
          </Text>
          <Text style={styles.kpiSubtitle}>
            {formatCurrency(data.totalDebt)} z {formatCurrency(data.totalAssetsValue)}
          </Text>
        </Card>

        {/* Cash Flow */}
        <Card style={styles.kpiCard}>
          <View style={styles.kpiHeader}>
            <Text style={styles.kpiLabel}>Mesačný CF</Text>
            {data.totalMonthlyCashFlow >= 0 ? (
              <TrendingUp size={16} color={cashFlowColor} />
            ) : (
              <TrendingDown size={16} color={cashFlowColor} />
            )}
          </View>
          <Text style={[styles.kpiValue, { color: cashFlowColor }]}>
            {formatCurrency(data.totalMonthlyCashFlow)}
          </Text>
          <Text style={styles.kpiSubtitle}>príjmy - výdavky - splátky</Text>
        </Card>

        {/* Portfolio */}
        <Card style={styles.kpiCard}>
          <View style={styles.kpiHeader}>
            <Text style={styles.kpiLabel}>Portfólio</Text>
            <Home size={16} color="#6b7280" />
          </View>
          <Text style={styles.kpiValue}>{data.totalAssetsCount}</Text>
          <Text style={styles.kpiSubtitle}>
            majetkov • {data.totalLoansCount} úverov
          </Text>
        </Card>
      </View>

      {/* Assets Breakdown */}
      <Card style={styles.detailCard}>
        <Text style={styles.cardTitle}>🏠 Majetky</Text>
        <Text style={styles.cardSubtitle}>Rozdelenie portfólia</Text>

        <View style={styles.valueRow}>
          <Text style={styles.label}>Celková hodnota</Text>
          <Text style={[styles.value, { color: '#f59e0b' }]}>
            {formatCurrency(data.totalAssetsValue)}
          </Text>
        </View>

        <View style={styles.breakdown}>
          {/* Productive Assets */}
          <View style={styles.breakdownItem}>
            <View style={styles.breakdownHeader}>
              <Text style={styles.breakdownLabel}>
                🟢 Produktívne ({data.productiveAssetsCount})
              </Text>
              <Text style={styles.breakdownValue}>
                {formatCurrency(data.productiveAssetsValue)}
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${(data.productiveAssetsValue / data.totalAssetsValue * 100)}%`,
                    backgroundColor: '#10b981',
                  },
                ]}
              />
            </View>
            <Text style={styles.breakdownNote}>
              Mesačný CF: {formatCurrency(data.netCashFlowFromAssets)}
            </Text>
          </View>

          {/* Non-Productive Assets */}
          <View style={styles.breakdownItem}>
            <View style={styles.breakdownHeader}>
              <Text style={styles.breakdownLabel}>
                🔴 Neproduktívne ({data.totalAssetsCount - data.productiveAssetsCount})
              </Text>
              <Text style={styles.breakdownValue}>
                {formatCurrency(data.nonProductiveAssetsValue)}
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${(data.nonProductiveAssetsValue / data.totalAssetsValue * 100)}%`,
                    backgroundColor: '#6b7280',
                  },
                ]}
              />
            </View>
          </View>
        </View>
      </Card>

      {/* Loans & Cash Flow */}
      <Card style={styles.detailCard}>
        <Text style={styles.cardTitle}>💳 Úvery & Cash Flow</Text>
        <Text style={styles.cardSubtitle}>Mesačné splátky a príjmy</Text>

        <View style={styles.section}>
          <View style={styles.valueRow}>
            <Text style={styles.label}>Celkové zadlženie</Text>
            <Text style={[styles.value, { color: '#ef4444' }]}>
              {formatCurrency(data.totalDebt)}
            </Text>
          </View>
          <View style={styles.valueRow}>
            <Text style={styles.label}>Mesačné splátky</Text>
            <Text style={[styles.value, { color: '#ef4444' }]}>
              -{formatCurrency(data.nextMonthLoanPayment)}
            </Text>
          </View>
        </View>

        <View style={[styles.section, styles.bordered]}>
          <View style={styles.valueRow}>
            <Text style={styles.label}>Príjmy z majetkov</Text>
            <Text style={[styles.value, { color: '#10b981' }]}>
              +{formatCurrency(data.monthlyIncomeFromAssets)}
            </Text>
          </View>
          <View style={styles.valueRow}>
            <Text style={styles.label}>Náklady majetkov</Text>
            <Text style={[styles.value, { color: '#ef4444' }]}>
              -{formatCurrency(data.monthlyExpensesFromAssets)}
            </Text>
          </View>
          <View style={styles.valueRow}>
            <Text style={styles.label}>Splátky úverov</Text>
            <Text style={[styles.value, { color: '#ef4444' }]}>
              -{formatCurrency(data.nextMonthLoanPayment)}
            </Text>
          </View>
        </View>

        <View style={[styles.section, styles.bordered]}>
          <View style={styles.valueRow}>
            <Text style={styles.labelBold}>Čistý mesačný CF</Text>
            <Text style={[styles.valueLarge, { color: cashFlowColor }]}>
              {formatCurrency(data.totalMonthlyCashFlow)}
            </Text>
          </View>
          {data.totalMonthlyCashFlow < 0 && (
            <Text style={styles.warningText}>
              ⚠️ Negatívny cash flow! Príjmy nepokrývajú výdavky.
            </Text>
          )}
          {data.totalMonthlyCashFlow >= 0 && data.totalMonthlyCashFlow < 500 && (
            <Text style={styles.cautionText}>
              ⚠️ Tesný cash flow. Odporúčame monitorovať výdavky.
            </Text>
          )}
        </View>
      </Card>
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
  kpiSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    minWidth: '47%',
    padding: 16,
  },
  kpiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  kpiLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  kpiValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  kpiSubtitle: {
    fontSize: 10,
    color: '#9ca3af',
  },
  detailCard: {
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 16,
  },
  valueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    color: '#6b7280',
  },
  labelBold: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  value: {
    fontSize: 15,
    fontWeight: '600',
  },
  valueLarge: {
    fontSize: 18,
    fontWeight: '700',
  },
  breakdown: {
    marginTop: 16,
    gap: 16,
  },
  breakdownItem: {
    gap: 8,
  },
  breakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  breakdownValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  breakdownNote: {
    fontSize: 10,
    color: '#6b7280',
  },
  section: {
    gap: 12,
    marginBottom: 12,
  },
  bordered: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  warningText: {
    fontSize: 11,
    color: '#ef4444',
    marginTop: 8,
  },
  cautionText: {
    fontSize: 11,
    color: '#f59e0b',
    marginTop: 8,
  },
});

