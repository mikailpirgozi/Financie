import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Polyline, Circle, Line as SvgLine, Text as SvgText } from 'react-native-svg';

interface DataPoint {
  label: string;
  value: number;
}

export interface SimpleLineChartProps {
  data: DataPoint[];
  height?: number;
  width?: number;
  title?: string;
  color?: string;
  formatter?: (value: number) => string;
}

export function SimpleLineChart({
  data,
  height = 200,
  width = Dimensions.get('window').width - 32,
  title,
  color = '#8b5cf6',
  formatter = (v) => `€${v}`,
}: SimpleLineChartProps) {
  if (!data || data.length === 0) {
    return (
      <View style={styles.container}>
        {title && <Text style={styles.title}>{title}</Text>}
        <Text style={styles.emptyText}>Bez dát</Text>
      </View>
    );
  }

  // Validate and filter data
  const validData = data.filter(d => 
    d.value != null && 
    !isNaN(d.value) && 
    isFinite(d.value)
  ).map(d => ({
    ...d,
    value: d.value || 0 // Replace null/undefined with 0
  }));

  if (validData.length === 0) {
    return (
      <View style={styles.container}>
        {title && <Text style={styles.title}>{title}</Text>}
        <Text style={styles.emptyText}>Žiadne dáta na zobrazenie</Text>
      </View>
    );
  }

  const values = validData.map((d) => d.value);
  const maxValue = Math.max(...values, 0);
  const minValue = Math.min(...values, 0);
  const range = maxValue - minValue || 1;

  const padding = 40;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  // Calculate points
  const points = validData.map((d, i) => {
    const x = (i / (validData.length - 1 || 1)) * chartWidth + padding;
    const y = height - ((d.value - minValue) / range) * chartHeight - padding;
    return { x, y, ...d };
  });

  const pointsString = points.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <View style={[styles.container, { width }]}>
      {title && <Text style={styles.title}>{title}</Text>}

      <Svg width={width} height={height}>
        {/* Grid lines */}
        {[0, 1, 2, 3, 4].map((i) => {
          const y = padding + (i / 4) * chartHeight;
          const value = maxValue - (i / 4) * range;
          return (
            <View key={`grid-${i}`}>
              <SvgLine x1={padding} y1={y} x2={width - padding} y2={y} stroke="#e5e7eb" strokeWidth={1} />
              <SvgText x={10} y={y + 4} fontSize={10} fill="#999">
                {formatter(value)}
              </SvgText>
            </View>
          );
        })}

        {/* Line */}
        <Polyline points={pointsString} fill="none" stroke={color} strokeWidth={2} />

        {/* Points */}
        {points.map((p, i) => (
          <Circle key={`point-${i}`} cx={p.x} cy={p.y} r={4} fill={color} />
        ))}

        {/* X-axis labels */}
        {points.map((p, i) => (
          i % Math.ceil(data.length / 4) === 0 && (
            <SvgText key={`label-${i}`} x={p.x} y={height - 10} fontSize={10} fill="#666" textAnchor="middle">
              {p.label}
            </SvgText>
          )
        ))}
      </Svg>
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
    marginBottom: 8,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
    paddingVertical: 20,
  },
});
