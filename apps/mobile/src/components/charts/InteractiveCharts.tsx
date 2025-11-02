import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { LineChart, BarChart } from 'react-native-chart-kit';
import type { MonthlyDashboardData } from '../../lib/api';

interface InteractiveChartsProps {
  data: MonthlyDashboardData[];
}

type ChartTab = 'income-expenses' | 'net-worth' | 'loans' | 'growth';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - 32;
const CHART_HEIGHT = 220;

const chartConfig = {
  backgroundColor: '#ffffff',
  backgroundGradientFrom: '#ffffff',
  backgroundGradientTo: '#ffffff',
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(139, 92, 246, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
  style: {
    borderRadius: 16,
  },
  propsForDots: {
    r: '4',
    strokeWidth: '2',
    stroke: '#8b5cf6',
  },
};

export function InteractiveCharts({ data }: InteractiveChartsProps) {
  const [selectedTab, setSelectedTab] = useState<ChartTab>('income-expenses');

  // Prepare data (reverse to show oldest first)
  const chartData = [...data].reverse();

  // Format labels (show only month)
  const labels = chartData.map((d) => d.month.substring(5));

  // Prepare income vs expenses data
  const incomeData = chartData.map((d) => parseFloat(d.totalIncome));
  const expensesData = chartData.map((d) => parseFloat(d.totalExpenses));

  // Prepare net worth data
  const netWorthData = chartData.map((d) => parseFloat(d.netWorth));
  const totalAssetsData = chartData.map((d) => parseFloat(d.totalAssets));

  // Prepare loans data
  const loanBalanceData = chartData.map((d) => parseFloat(d.loanBalanceRemaining));
  const loanPrincipalData = chartData.map((d) => parseFloat(d.loanPrincipalPaid));
  const loanInterestData = chartData.map((d) => parseFloat(d.loanInterestPaid));

  // Prepare growth rate data
  const growthData = chartData.map((d, index) => {
    if (index === 0) return 0;
    const prevNetWorth = parseFloat(chartData[index - 1].netWorth);
    const currentNetWorth = parseFloat(d.netWorth);
    return prevNetWorth !== 0 ? ((currentNetWorth - prevNetWorth) / prevNetWorth) * 100 : 0;
  });

  const renderChart = () => {
    switch (selectedTab) {
      case 'income-expenses':
        return (
          <View>
            <Text style={styles.chartTitle}>Príjmy vs Výdaje</Text>
            <BarChart
              data={{
                labels,
                datasets: [
                  {
                    data: incomeData,
                  },
                  {
                    data: expensesData,
                  },
                ],
              }}
              width={CHART_WIDTH}
              height={CHART_HEIGHT}
              yAxisLabel="€"
              yAxisSuffix=""
              chartConfig={{
                ...chartConfig,
                color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
              }}
              style={styles.chart}
              showValuesOnTopOfBars
              withInnerLines={false}
            />
            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
                <Text style={styles.legendText}>Príjmy</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
                <Text style={styles.legendText}>Výdaje</Text>
              </View>
            </View>
          </View>
        );

      case 'net-worth':
        return (
          <View>
            <Text style={styles.chartTitle}>Čistá Hodnota</Text>
            <LineChart
              data={{
                labels,
                datasets: [
                  {
                    data: netWorthData,
                  },
                  {
                    data: totalAssetsData,
                  },
                ],
              }}
              width={CHART_WIDTH}
              height={CHART_HEIGHT}
              yAxisLabel="€"
              yAxisSuffix=""
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
            />
            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#8b5cf6' }]} />
                <Text style={styles.legendText}>Čistá hodnota</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
                <Text style={styles.legendText}>Aktíva</Text>
              </View>
            </View>
          </View>
        );

      case 'loans':
        return (
          <View>
            <Text style={styles.chartTitle}>Úvery</Text>
            <LineChart
              data={{
                labels,
                datasets: [
                  {
                    data: loanBalanceData,
                  },
                  {
                    data: loanPrincipalData,
                  },
                  {
                    data: loanInterestData,
                  },
                ],
              }}
              width={CHART_WIDTH}
              height={CHART_HEIGHT}
              yAxisLabel="€"
              yAxisSuffix=""
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
            />
            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
                <Text style={styles.legendText}>Zostatok</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
                <Text style={styles.legendText}>Istina</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#f59e0b' }]} />
                <Text style={styles.legendText}>Úrok</Text>
              </View>
            </View>
          </View>
        );

      case 'growth':
        return (
          <View>
            <Text style={styles.chartTitle}>Percentuálny Rast</Text>
            <BarChart
              data={{
                labels,
                datasets: [
                  {
                    data: growthData.map((v) => Math.abs(v)),
                  },
                ],
              }}
              width={CHART_WIDTH}
              height={CHART_HEIGHT}
              yAxisLabel=""
              yAxisSuffix="%"
              chartConfig={chartConfig}
              style={styles.chart}
              withInnerLines={false}
              fromZero
            />
            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
                <Text style={styles.legendText}>Pozitívny rast</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
                <Text style={styles.legendText}>Negatívny rast</Text>
              </View>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsContainer}
        contentContainerStyle={styles.tabsContent}
      >
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'income-expenses' && styles.tabActive]}
          onPress={() => setSelectedTab('income-expenses')}
        >
          <Text style={[styles.tabText, selectedTab === 'income-expenses' && styles.tabTextActive]}>
            Príjmy vs Výdaje
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'net-worth' && styles.tabActive]}
          onPress={() => setSelectedTab('net-worth')}
        >
          <Text style={[styles.tabText, selectedTab === 'net-worth' && styles.tabTextActive]}>
            Čistá Hodnota
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'loans' && styles.tabActive]}
          onPress={() => setSelectedTab('loans')}
        >
          <Text style={[styles.tabText, selectedTab === 'loans' && styles.tabTextActive]}>
            Úvery
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'growth' && styles.tabActive]}
          onPress={() => setSelectedTab('growth')}
        >
          <Text style={[styles.tabText, selectedTab === 'growth' && styles.tabTextActive]}>
            Rast
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={styles.chartContainer}>{renderChart()}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  tabsContainer: {
    marginBottom: 16,
  },
  tabsContent: {
    paddingHorizontal: 4,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  tabActive: {
    backgroundColor: '#8b5cf6',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  tabTextActive: {
    color: '#ffffff',
  },
  chartContainer: {
    alignItems: 'center',
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 4,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#6b7280',
  },
});
