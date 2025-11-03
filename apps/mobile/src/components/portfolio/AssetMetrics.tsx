import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { AssetROI } from '@finapp/core';
import { TrendingUp, TrendingDown } from 'lucide-react-native';

interface AssetMetricsProps {
  assetName: string;
  assetValue: number;
  loanBalance?: number;
  ltv?: number;
  equity?: number;
  netMonthlyCashFlow?: number;
  roi?: AssetROI;
  linkedLoan?: {
    lender: string;
    monthlyPayment: number;
  };
}

export function AssetMetricsCard({
  assetName,
  assetValue,
  loanBalance = 0,
  ltv = 0,
  equity = 0,
  netMonthlyCashFlow = 0,
  roi,
  linkedLoan,
}: AssetMetricsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('sk-SK', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const getLTVColor = (ltvValue: number) => {
    if (ltvValue < 60) return '#10b981';
    if (ltvValue < 80) return '#f59e0b';
    if (ltvValue < 90) return '#fb923c';
    return '#ef4444';
  };

  const getLTVLabel = (ltvValue: number) => {
    if (ltvValue < 60) return 'Výborné';
    if (ltvValue < 80) return 'Dobré';
    if (ltvValue < 90) return 'Vysoké';
    return 'Kritické';
  };

  const ltvColor = getLTVColor(ltv);
  const ltvLabel = getLTVLabel(ltv);

  return (
    <View style={styles.container}>
      {/* Header */}
      <Card style={styles.headerCard}>
        <Text style={styles.assetName}>{assetName}</Text>
        <Text style={styles.assetValue}>{formatCurrency(assetValue)}</Text>
      </Card>

      {/* Linked Loan */}
      {linkedLoan && (
        <Card style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>💳 Prepojený úver</Text>
            <Badge variant="info">{linkedLoan.lender}</Badge>
          </View>

          <View style={styles.section}>
            <View style={styles.row}>
              <Text style={styles.label}>Zostatok úveru</Text>
              <Text style={[styles.value, { color: '#ef4444' }]}>
                {formatCurrency(loanBalance)}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Mesačná splátka</Text>
              <Text style={styles.value}>
                {formatCurrency(linkedLoan.monthlyPayment)}
              </Text>
            </View>
          </View>

          {/* LTV */}
          <View style={[styles.section, styles.bordered]}>
            <View style={styles.row}>
              <Text style={styles.labelBold}>LTV (Loan-to-Value)</Text>
              <View style={styles.ltvBadge}>
                <Text style={[styles.ltvValue, { color: ltvColor }]}>
                  {ltv.toFixed(1)}%
                </Text>
                <Text style={[styles.ltvLabel, { color: ltvColor }]}>
                  {ltvLabel}
                </Text>
              </View>
            </View>

            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(ltv, 100)}%`,
                    backgroundColor: ltvColor,
                  },
                ]}
              />
            </View>

            <Text style={styles.note}>
              {ltv < 60 && 'Výborný pomer vlastného a cudzieho kapitálu'}
              {ltv >= 60 && ltv < 80 && 'Dobrý pomer, bežný pri hypotékach'}
              {ltv >= 80 && ltv < 90 && 'Vysoké zadlženie, zvážte zvýšenie equity'}
              {ltv >= 90 && 'Kritické zadlženie! Potrebné znížiť dlh'}
            </Text>
          </View>

          {/* Equity */}
          <View style={[styles.section, styles.bordered]}>
            <View style={styles.row}>
              <Text style={styles.labelBold}>Vlastný podiel (Equity)</Text>
              <Text style={[styles.valueLarge, { color: '#10b981' }]}>
                {formatCurrency(equity)}
              </Text>
            </View>
            <Text style={styles.note}>
              {((equity / assetValue) * 100).toFixed(1)}% z hodnoty majetku
            </Text>
          </View>
        </Card>
      )}

      {/* Cash Flow */}
      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>💰 Mesačný Cash Flow</Text>
        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.label}>Čistý cash flow</Text>
            <Text
              style={[
                styles.valueLarge,
                { color: netMonthlyCashFlow >= 0 ? '#10b981' : '#ef4444' },
              ]}
            >
              {netMonthlyCashFlow >= 0 ? '+' : ''}{formatCurrency(netMonthlyCashFlow)}
            </Text>
          </View>
          {netMonthlyCashFlow < 0 ? (
            <Text style={styles.warningText}>
              ⚠️ Majetok generuje negatívny cash flow
            </Text>
          ) : (
            <Text style={styles.successText}>
              ✅ Majetok je cash flow pozitívny
            </Text>
          )}
        </View>
      </Card>

      {/* ROI */}
      {roi && (
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>📈 Return on Investment</Text>

          <View style={styles.roiGrid}>
            <View style={styles.roiItem}>
              {roi.cashFlowRoi >= 0 ? (
                <TrendingUp size={20} color="#10b981" />
              ) : (
                <TrendingDown size={20} color="#ef4444" />
              )}
              <Text
                style={[
                  styles.roiValue,
                  { color: roi.cashFlowRoi >= 0 ? '#10b981' : '#ef4444' },
                ]}
              >
                {formatPercentage(roi.cashFlowRoi)}
              </Text>
              <Text style={styles.roiLabel}>Cash Flow ROI</Text>
            </View>

            <View style={styles.roiItem}>
              {roi.appreciationRoi >= 0 ? (
                <TrendingUp size={20} color="#10b981" />
              ) : (
                <TrendingDown size={20} color="#ef4444" />
              )}
              <Text
                style={[
                  styles.roiValue,
                  { color: roi.appreciationRoi >= 0 ? '#10b981' : '#ef4444' },
                ]}
              >
                {formatPercentage(roi.appreciationRoi)}
              </Text>
              <Text style={styles.roiLabel}>Zhodnotenie</Text>
            </View>

            <View style={styles.roiItem}>
              {roi.totalRoi >= 0 ? (
                <TrendingUp size={20} color="#10b981" />
              ) : (
                <TrendingDown size={20} color="#ef4444" />
              )}
              <Text
                style={[
                  styles.roiValue,
                  { color: roi.totalRoi >= 0 ? '#10b981' : '#ef4444' },
                ]}
              >
                {formatPercentage(roi.totalRoi)}
              </Text>
              <Text style={styles.roiLabel}>Celkový ROI</Text>
            </View>
          </View>

          <View style={[styles.section, styles.bordered]}>
            <View style={styles.row}>
              <Text style={styles.label}>Celkový príjem</Text>
              <Text style={[styles.value, { color: '#10b981' }]}>
                +{formatCurrency(roi.totalIncome)}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Celkové výdavky</Text>
              <Text style={[styles.value, { color: '#ef4444' }]}>
                -{formatCurrency(roi.totalExpenses)}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Zhodnotenie</Text>
              <Text
                style={[
                  styles.value,
                  { color: roi.valueChange >= 0 ? '#10b981' : '#ef4444' },
                ]}
              >
                {roi.valueChange >= 0 ? '+' : ''}{formatCurrency(roi.valueChange)}
              </Text>
            </View>
          </View>
        </Card>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
    gap: 16,
  },
  headerCard: {
    padding: 16,
    alignItems: 'center',
  },
  assetName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  assetValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#f59e0b',
  },
  card: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  section: {
    gap: 12,
  },
  bordered: {
    paddingTop: 16,
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  ltvBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ltvValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  ltvLabel: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#f3f4f6',
  },
  progressBar: {
    height: 12,
    backgroundColor: '#e5e7eb',
    borderRadius: 6,
    overflow: 'hidden',
    marginTop: 8,
  },
  progressFill: {
    height: '100%',
  },
  note: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 8,
  },
  warningText: {
    fontSize: 11,
    color: '#ef4444',
  },
  successText: {
    fontSize: 11,
    color: '#10b981',
  },
  roiGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  roiItem: {
    alignItems: 'center',
    gap: 8,
  },
  roiValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  roiLabel: {
    fontSize: 10,
    color: '#6b7280',
    textAlign: 'center',
  },
});

