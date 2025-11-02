import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface PieSlice {
  label: string;
  value: number;
  color: string;
}

interface SimplePieChartProps {
  data: PieSlice[];
  size?: number;
  title?: string;
}

export function SimplePieChart({ data, size = 150, title }: SimplePieChartProps) {
  if (!data || data.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>Bez dát</Text>
      </View>
    );
  }

  // Validate and filter data
  const validData = data.filter(d => 
    d.value != null && 
    !isNaN(d.value) && 
    isFinite(d.value) && 
    d.value > 0
  );

  if (validData.length === 0) {
    return (
      <View style={styles.container}>
        {title && <Text style={styles.title}>{title}</Text>}
        <Text style={styles.emptyText}>Žiadne dáta na zobrazenie</Text>
      </View>
    );
  }

  const total = validData.reduce((sum, d) => sum + d.value, 0);
  
  // Safety check for total
  if (total <= 0 || isNaN(total) || !isFinite(total)) {
    return (
      <View style={styles.container}>
        {title && <Text style={styles.title}>{title}</Text>}
        <Text style={styles.emptyText}>Žiadne dáta na zobrazenie</Text>
      </View>
    );
  }

  const radius = size / 2 - 10;
  const center = size / 2;

  let currentAngle = -Math.PI / 2; // Start from top
  const slices = validData.map((item) => {
    const sliceAngle = (item.value / total) * Math.PI * 2;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sliceAngle;

    const x1 = center + radius * Math.cos(startAngle);
    const y1 = center + radius * Math.sin(startAngle);
    const x2 = center + radius * Math.cos(endAngle);
    const y2 = center + radius * Math.sin(endAngle);

    const largeArc = sliceAngle > Math.PI ? 1 : 0;

    const pathData = [
      `M ${center} ${center}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
      'Z',
    ].join(' ');

    currentAngle = endAngle;

    return {
      ...item,
      pathData,
      percentage: ((item.value / total) * 100).toFixed(1),
    };
  });

  const renderLegendItem = ({ item }: { item: (typeof slices)[0] }) => (
    <View style={styles.legendItem}>
      <View style={[styles.legendColor, { backgroundColor: item.color }]} />
      <View style={styles.legendLabel}>
        <Text style={styles.legendLabelText}>{item.label}</Text>
        <Text style={styles.legendValue}>{item.percentage}%</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {title && <Text style={styles.title}>{title}</Text>}

      <View style={styles.chartContainer}>
        <Svg width={size} height={size}>
          {slices.map((slice, idx) => (
            <Path key={`slice-${idx}`} d={slice.pathData} fill={slice.color} />
          ))}
        </Svg>
      </View>

      <FlatList
        data={slices}
        renderItem={renderLegendItem}
        keyExtractor={(_, idx) => `legend-${idx}`}
        scrollEnabled={false}
        style={styles.legend}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 12,
    marginVertical: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  chartContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  legend: {
    flexGrow: 0,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 2,
    marginRight: 8,
  },
  legendLabel: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  legendLabelText: {
    fontSize: 13,
    color: '#666',
  },
  legendValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
    paddingVertical: 20,
  },
});
