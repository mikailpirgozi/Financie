import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

/**
 * Shimmer efekt pre skeleton loading
 */
function SkeletonShimmer({ width = '100%', height = 20, borderRadius = 8, style }: {
  width?: string | number;
  height?: number;
  borderRadius?: number;
  style?: any;
}) {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmer = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );
    shimmer.start();
    return () => shimmer.stop();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: '#e0e0e0',
          opacity,
        },
        style,
      ]}
    />
  );
}

/**
 * Skeleton pre KPI kartu
 */
function KPICardSkeleton() {
  return (
    <View style={styles.kpiCard}>
      <SkeletonShimmer width="60%" height={16} />
      <View style={{ height: 8 }} />
      <SkeletonShimmer width="80%" height={24} />
      <View style={{ height: 4 }} />
      <SkeletonShimmer width="40%" height={14} />
    </View>
  );
}

/**
 * Skeleton pre summary kartu (loans/assets)
 */
function SummaryCardSkeleton() {
  return (
    <View style={styles.summaryCard}>
      <SkeletonShimmer width="50%" height={18} />
      <View style={{ height: 12 }} />
      <SkeletonShimmer width="70%" height={28} />
      <View style={{ height: 12 }} />
      <SkeletonShimmer width="100%" height={1} />
      <View style={{ height: 12 }} />
      <SkeletonShimmer width="90%" height={16} />
      <View style={{ height: 8 }} />
      <SkeletonShimmer width="80%" height={16} />
    </View>
  );
}

/**
 * Kompletný dashboard skeleton
 */
export function DashboardSkeleton() {
  return (
    <View style={styles.wrapper}>
      {/* Header */}
      <View style={styles.header}>
        <SkeletonShimmer width="40%" height={32} style={{ marginBottom: 8 }} />
        <SkeletonShimmer width="30%" height={16} />
      </View>

      <View style={styles.container}>
        {/* KPI Cards - 4x grid */}
        <View style={styles.kpiSection}>
          <KPICardSkeleton />
          <KPICardSkeleton />
          <KPICardSkeleton />
          <KPICardSkeleton />
        </View>

        {/* Summary Cards - 2x */}
        <View style={styles.summarySection}>
          <SummaryCardSkeleton />
          <SummaryCardSkeleton />
        </View>

        {/* Charts Section */}
        <View style={styles.chartSection}>
          <SkeletonShimmer width="60%" height={20} style={{ marginBottom: 16 }} />
          <SkeletonShimmer width="100%" height={200} />
        </View>

        {/* History Section */}
        <View style={styles.historySection}>
          <SkeletonShimmer width="50%" height={18} style={{ marginBottom: 12 }} />
          <SkeletonShimmer width="100%" height={80} style={{ marginBottom: 12 }} />
          <SkeletonShimmer width="100%" height={80} style={{ marginBottom: 12 }} />
          <SkeletonShimmer width="100%" height={80} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  container: {
    flex: 1,
    paddingBottom: 40,
  },
  kpiSection: {
    padding: 16,
  },
  kpiCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  summarySection: {
    paddingHorizontal: 16,
  },
  summaryCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  chartSection: {
    padding: 16,
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  historySection: {
    padding: 16,
    marginTop: 12,
  },
});

