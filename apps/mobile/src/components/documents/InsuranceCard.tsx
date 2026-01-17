import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Insurance,
  INSURANCE_TYPE_LABELS,
  PAYMENT_FREQUENCY_LABELS,
  getExpirationStatus,
  getDaysUntilExpiry,
} from '@finapp/core';
import { useTheme } from '@/contexts/ThemeContext';

interface InsuranceCardProps {
  insurance: Insurance;
  onPress: () => void;
  onLongPress?: () => void;
}

export function InsuranceCard({ insurance, onPress, onLongPress }: InsuranceCardProps) {
  const { theme } = useTheme();
  const status = getExpirationStatus(insurance.validTo);
  const daysUntil = getDaysUntilExpiry(insurance.validTo);
  const isExpired = status === 'expired';
  const isExpiring = status === 'expiring';

  const getStatusColor = () => {
    if (isExpired) return '#ef4444';
    if (isExpiring) return '#f97316';
    return '#22c55e';
  };

  const getStatusLabel = () => {
    if (isExpired) return 'Expirovaná';
    if (isExpiring) return `${daysUntil} dní`;
    return 'Aktívna';
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('sk-SK');
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { 
          backgroundColor: theme.colors.surface,
          borderColor: isExpired 
            ? 'rgba(239, 68, 68, 0.3)' 
            : isExpiring 
            ? 'rgba(249, 115, 22, 0.3)' 
            : theme.colors.border,
        }
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <View style={[
            styles.iconCircle,
            { 
              backgroundColor: isExpired 
                ? 'rgba(239, 68, 68, 0.1)' 
                : isExpiring 
                ? 'rgba(249, 115, 22, 0.1)' 
                : 'rgba(59, 130, 246, 0.1)' 
            }
          ]}>
            <Ionicons 
              name="shield-checkmark" 
              size={20} 
              color={isExpired ? '#ef4444' : isExpiring ? '#f97316' : '#3b82f6'} 
            />
          </View>
          <View style={styles.titleContainer}>
            <Text style={[styles.type, { color: theme.colors.text }]}>
              {INSURANCE_TYPE_LABELS[insurance.type] || insurance.type}
            </Text>
            <Text style={[styles.policyNumber, { color: theme.colors.textSecondary }]}>
              {insurance.policyNumber}
            </Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor()}15` }]}>
          {(isExpired || isExpiring) && (
            <Ionicons name="warning" size={12} color={getStatusColor()} style={{ marginRight: 4 }} />
          )}
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {getStatusLabel()}
          </Text>
        </View>
      </View>

      <View style={styles.details}>
        {insurance.company && (
          <View style={styles.detailRow}>
            <Ionicons name="business-outline" size={14} color={theme.colors.textSecondary} />
            <Text style={[styles.detailText, { color: theme.colors.textSecondary }]}>
              {insurance.company}
            </Text>
          </View>
        )}
        {insurance.asset && (
          <View style={styles.detailRow}>
            <Ionicons name="car-outline" size={14} color={theme.colors.textSecondary} />
            <Text style={[styles.detailText, { color: theme.colors.textSecondary }]}>
              {insurance.asset.name}
              {insurance.asset.licensePlate && ` (${insurance.asset.licensePlate})`}
            </Text>
          </View>
        )}
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={14} color={theme.colors.textSecondary} />
          <Text style={[styles.detailText, { color: theme.colors.textSecondary }]}>
            {formatDate(insurance.validFrom)} - {formatDate(insurance.validTo)}
          </Text>
        </View>
      </View>

      <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
        <View>
          <Text style={[styles.price, { color: theme.colors.text }]}>
            {Number(insurance.price).toLocaleString('sk-SK')}€
          </Text>
          <Text style={[styles.frequency, { color: theme.colors.textSecondary }]}>
            {PAYMENT_FREQUENCY_LABELS[insurance.paymentFrequency]}
          </Text>
        </View>
        {insurance.filePaths && insurance.filePaths.length > 0 && (
          <View style={styles.filesIndicator}>
            <Ionicons name="document-text" size={16} color={theme.colors.primary} />
            {insurance.filePaths.length > 1 && (
              <Text style={[styles.filesCount, { color: theme.colors.primary }]}>
                +{insurance.filePaths.length - 1}
              </Text>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    paddingBottom: 12,
  },
  iconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  titleContainer: {
    flex: 1,
  },
  type: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  policyNumber: {
    fontSize: 13,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  details: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  price: {
    fontSize: 18,
    fontWeight: '700',
  },
  frequency: {
    fontSize: 11,
  },
  filesIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  filesCount: {
    fontSize: 12,
    fontWeight: '500',
  },
});
