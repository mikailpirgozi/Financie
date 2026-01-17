import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import {
  Target,
  CheckCircle2,
  Circle,
  Clock,
  Trophy,
  Star,
  Sparkles,
} from 'lucide-react-native';
import { useTheme } from '../../contexts';

interface Milestone {
  percentage: number;
  label: string;
  achieved: boolean;
  achievedDate?: string;
  expectedDate?: string;
}

interface LoanMilestonesProps {
  progress: number; // 0-100
  startDate: string;
  endDate: string;
  schedule: Array<{
    installment_no: number;
    due_date: string;
    status: 'paid' | 'pending' | 'overdue';
    principal_balance_after: string;
  }>;
  principal: number;
}

export function LoanMilestones({
  progress,
  startDate,
  endDate,
  schedule,
  principal,
}: LoanMilestonesProps) {
  const { theme } = useTheme();
  const colors = theme.colors;

  // Animation
  const lineProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(lineProgress, {
      toValue: progress,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('sk-SK', {
      month: 'short',
      year: 'numeric',
    });
  };

  // Calculate milestones from schedule
  const calculateMilestones = (): Milestone[] => {
    const milestones: Milestone[] = [
      { percentage: 25, label: '25%', achieved: false },
      { percentage: 50, label: '50%', achieved: false },
      { percentage: 75, label: '75%', achieved: false },
      { percentage: 100, label: '100%', achieved: false },
    ];

    if (!schedule || schedule.length === 0) {
      return milestones;
    }

    // Find achieved and expected dates for each milestone
    milestones.forEach((milestone) => {
      const targetBalance = principal * (1 - milestone.percentage / 100);

      // Find the installment that crossed this milestone
      for (let i = 0; i < schedule.length; i++) {
        const entry = schedule[i];
        const balanceAfter = parseFloat(entry.principal_balance_after);

        if (balanceAfter <= targetBalance) {
          if (entry.status === 'paid') {
            milestone.achieved = true;
            milestone.achievedDate = entry.due_date;
          } else {
            milestone.expectedDate = entry.due_date;
          }
          break;
        }
      }
    });

    return milestones;
  };

  const milestones = calculateMilestones();

  const getMilestoneIcon = (milestone: Milestone, index: number) => {
    if (milestone.achieved) {
      return <CheckCircle2 size={20} color={colors.success} />;
    }
    if (index === 3) {
      // 100%
      return <Trophy size={20} color={colors.textMuted} />;
    }
    if (index === 0) {
      return <Star size={20} color={colors.textMuted} />;
    }
    return <Circle size={20} color={colors.textMuted} />;
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.header}>
        <Target size={20} color={colors.primary} />
        <Text style={[styles.title, { color: colors.text }]}>
          Milniky
        </Text>
        <View style={[styles.progressBadge, { backgroundColor: colors.primaryLight }]}>
          <Text style={[styles.progressText, { color: colors.primary }]}>
            {progress.toFixed(0)}% splatene
          </Text>
        </View>
      </View>

      {/* Progress Timeline */}
      <View style={styles.timeline}>
        <View style={[styles.timelineTrack, { backgroundColor: colors.borderLight }]}>
          <Animated.View
            style={[
              styles.timelineFill,
              { backgroundColor: colors.primary },
              {
                width: lineProgress.interpolate({
                  inputRange: [0, 100],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>

        {/* Milestone markers */}
        <View style={styles.milestoneMarkers}>
          {milestones.map((milestone) => (
            <View
              key={milestone.percentage}
              style={[
                styles.markerContainer,
                { left: `${milestone.percentage}%` },
              ]}
            >
              <View
                style={[
                  styles.marker,
                  {
                    backgroundColor: milestone.achieved
                      ? colors.success
                      : colors.borderLight,
                    borderColor: milestone.achieved
                      ? colors.success
                      : colors.border,
                  },
                ]}
              />
            </View>
          ))}
        </View>
      </View>

      {/* Milestones List */}
      <View style={styles.milestonesList}>
        {milestones.map((milestone, index) => (
          <View
            key={milestone.percentage}
            style={[
              styles.milestoneItem,
              {
                backgroundColor: milestone.achieved
                  ? colors.successLight
                  : colors.surfacePressed,
                borderColor: milestone.achieved
                  ? colors.success
                  : colors.border,
              },
            ]}
          >
            <View style={styles.milestoneIcon}>
              {getMilestoneIcon(milestone, index)}
            </View>

            <View style={styles.milestoneContent}>
              <Text
                style={[
                  styles.milestoneLabel,
                  {
                    color: milestone.achieved
                      ? colors.success
                      : colors.text,
                  },
                ]}
              >
                {milestone.label} splatene
              </Text>

              {milestone.achieved && milestone.achievedDate && (
                <View style={styles.dateRow}>
                  <CheckCircle2 size={12} color={colors.success} />
                  <Text style={[styles.dateText, { color: colors.success }]}>
                    Dosiahnuté {formatDate(milestone.achievedDate)}
                  </Text>
                </View>
              )}

              {!milestone.achieved && milestone.expectedDate && (
                <View style={styles.dateRow}>
                  <Clock size={12} color={colors.textMuted} />
                  <Text style={[styles.dateText, { color: colors.textMuted }]}>
                    Ocakavane {formatDate(milestone.expectedDate)}
                  </Text>
                </View>
              )}

              {!milestone.achieved && !milestone.expectedDate && (
                <View style={styles.dateRow}>
                  <Clock size={12} color={colors.textMuted} />
                  <Text style={[styles.dateText, { color: colors.textMuted }]}>
                    Cakajuce
                  </Text>
                </View>
              )}
            </View>

            {milestone.achieved && (
              <Sparkles size={16} color={colors.success} />
            )}
          </View>
        ))}
      </View>

      {/* Dates info */}
      <View style={[styles.datesRow, { borderTopColor: colors.border }]}>
        <View style={styles.dateItem}>
          <Text style={[styles.dateItemLabel, { color: colors.textMuted }]}>
            Zaciatok
          </Text>
          <Text style={[styles.dateItemValue, { color: colors.text }]}>
            {formatDate(startDate)}
          </Text>
        </View>
        <View style={[styles.dateDivider, { backgroundColor: colors.border }]} />
        <View style={styles.dateItem}>
          <Text style={[styles.dateItemLabel, { color: colors.textMuted }]}>
            Planovany koniec
          </Text>
          <Text style={[styles.dateItemValue, { color: colors.text }]}>
            {formatDate(endDate)}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  progressBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '700',
  },
  timeline: {
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  timelineTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  timelineFill: {
    height: '100%',
    borderRadius: 4,
  },
  milestoneMarkers: {
    position: 'relative',
    height: 20,
    marginTop: -14,
  },
  markerContainer: {
    position: 'absolute',
    transform: [{ translateX: -6 }],
  },
  marker: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  milestonesList: {
    gap: 10,
  },
  milestoneItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  milestoneIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  milestoneContent: {
    flex: 1,
  },
  milestoneLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 11,
  },
  datesRow: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  dateItem: {
    flex: 1,
    alignItems: 'center',
  },
  dateDivider: {
    width: 1,
    alignSelf: 'stretch',
  },
  dateItemLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  dateItemValue: {
    fontSize: 14,
    fontWeight: '600',
  },
});
