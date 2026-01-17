import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import {
  Calendar,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  Clock,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../contexts';

interface NextPaymentCardProps {
  installmentNo: number;
  amount: number;
  dueDate: string;
  status: 'pending' | 'overdue' | 'paid';
  daysUntil: number;
  onMarkPaid: () => void;
  onViewDetails?: () => void;
}

export function NextPaymentCard({
  installmentNo,
  amount,
  dueDate,
  status,
  daysUntil,
  onMarkPaid,
  onViewDetails,
}: NextPaymentCardProps) {
  const { theme } = useTheme();
  const colors = theme.colors;

  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 8,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('sk-SK', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('sk-SK', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const getDaysLabel = () => {
    if (status === 'overdue') {
      return `${Math.abs(daysUntil)} ${Math.abs(daysUntil) === 1 ? 'deň' : 'dní'} po splatnosti`;
    }
    if (daysUntil === 0) return 'Dnes';
    if (daysUntil === 1) return 'Zajtra';
    return `Za ${daysUntil} ${daysUntil === 1 ? 'deň' : 'dní'}`;
  };

  const getStatusColors = () => {
    if (status === 'overdue') {
      return {
        bg: colors.dangerLight,
        border: colors.danger,
        accent: colors.danger,
        badgeBg: colors.danger,
      };
    }
    if (daysUntil <= 3) {
      return {
        bg: colors.warningLight,
        border: colors.warning,
        accent: colors.warning,
        badgeBg: colors.warning,
      };
    }
    return {
      bg: colors.primaryLight,
      border: colors.primary,
      accent: colors.primary,
      badgeBg: colors.primary,
    };
  };

  const statusColors = getStatusColors();

  const handleMarkPaid = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onMarkPaid();
  };

  if (status === 'paid') {
    return (
      <Animated.View
        style={[
          styles.container,
          styles.containerPaid,
          {
            backgroundColor: colors.successLight,
            borderColor: colors.success,
            opacity: opacityAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View style={styles.paidContent}>
          <CheckCircle size={24} color={colors.success} />
          <View style={styles.paidTextContainer}>
            <Text style={[styles.paidTitle, { color: colors.success }]}>
              Všetky splátky uhradené
            </Text>
            <Text style={[styles.paidSubtitle, { color: colors.textMuted }]}>
              Gratulujeme! Nemáte žiadne neuhradené splátky.
            </Text>
          </View>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: statusColors.bg,
          borderColor: statusColors.border,
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.iconContainer, { backgroundColor: statusColors.badgeBg + '20' }]}>
            {status === 'overdue' ? (
              <AlertTriangle size={20} color={statusColors.accent} />
            ) : (
              <Calendar size={20} color={statusColors.accent} />
            )}
          </View>
          <View>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              {status === 'overdue' ? 'Po splatnosti' : 'Najbližšia splátka'}
            </Text>
            <Text style={[styles.installmentNo, { color: colors.textMuted }]}>
              Splátka #{installmentNo}
            </Text>
          </View>
        </View>
        <View style={[styles.badge, { backgroundColor: statusColors.badgeBg }]}>
          <Clock size={12} color="#ffffff" />
          <Text style={styles.badgeText}>{getDaysLabel()}</Text>
        </View>
      </View>

      {/* Amount & Date */}
      <View style={styles.mainContent}>
        <Text style={[styles.amount, { color: colors.text }]}>
          {formatCurrency(amount)}
        </Text>
        <Text style={[styles.date, { color: colors.textMuted }]}>
          Splatnosť: {formatDate(dueDate)}
        </Text>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: statusColors.accent }]}
          onPress={handleMarkPaid}
          activeOpacity={0.8}
        >
          <CheckCircle size={18} color="#ffffff" />
          <Text style={styles.primaryButtonText}>Označiť ako uhradenú</Text>
        </TouchableOpacity>

        {onViewDetails && (
          <TouchableOpacity
            style={[styles.secondaryButton, { borderColor: colors.border }]}
            onPress={onViewDetails}
            activeOpacity={0.7}
          >
            <Text style={[styles.secondaryButtonText, { color: colors.textSecondary }]}>
              Detaily
            </Text>
            <ChevronRight size={16} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  containerPaid: {
    paddingVertical: 20,
  },
  paidContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  paidTextContainer: {
    flex: 1,
  },
  paidTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  paidSubtitle: {
    fontSize: 13,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  installmentNo: {
    fontSize: 13,
    marginTop: 2,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  mainContent: {
    marginBottom: 16,
  },
  amount: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  date: {
    fontSize: 14,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
