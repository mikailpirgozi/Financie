import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import type { Vehicle } from '@/lib/api';

interface VehicleCardProps {
  vehicle: Vehicle;
  onPress: () => void;
  onLongPress?: () => void;
}

const FUEL_TYPE_LABELS: Record<string, string> = {
  petrol: 'Benzín',
  diesel: 'Diesel',
  electric: 'Elektro',
  hybrid: 'Hybrid',
  lpg: 'LPG',
  cng: 'CNG',
};

const FUEL_TYPE_ICONS: Record<string, string> = {
  petrol: 'flame-outline',
  diesel: 'flame-outline',
  electric: 'flash-outline',
  hybrid: 'leaf-outline',
  lpg: 'flame-outline',
  cng: 'flame-outline',
};

type ExpiryStatus = 'ok' | 'expiring' | 'expired' | 'missing';

function classifyExpiry(
  latestExpiry: string | null | undefined,
  expiringSoon: boolean | undefined
): ExpiryStatus {
  if (!latestExpiry) return 'missing';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(latestExpiry);
  if (expiry < today) return 'expired';
  if (expiringSoon) return 'expiring';
  return 'ok';
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('sk-SK', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('sk-SK');
}

export function VehicleCard({
  vehicle,
  onPress,
  onLongPress,
}: VehicleCardProps): React.JSX.Element {
  const { theme } = useTheme();

  const stkStatus = classifyExpiry(
    vehicle.latestStkExpiry ?? vehicle.stkExpiry ?? null,
    vehicle.stkExpiringSoon
  );
  const ekStatus = classifyExpiry(
    vehicle.latestEkExpiry ?? vehicle.ekExpiry ?? null,
    vehicle.ekExpiringSoon
  );
  const vignetteStatus = classifyExpiry(
    vehicle.latestVignetteExpiry ?? vehicle.vignetteExpiry ?? null,
    vehicle.vignetteExpiringSoon
  );

  const hasAlerts =
    vehicle.stkExpiringSoon ||
    vehicle.ekExpiringSoon ||
    vehicle.insuranceExpiringSoon ||
    vehicle.vignetteExpiringSoon ||
    vehicle.stkExpired ||
    vehicle.ekExpired ||
    vehicle.vignetteExpired ||
    vehicle.insuranceExpired ||
    stkStatus === 'expired' ||
    ekStatus === 'expired' ||
    vignetteStatus === 'expired';

  const statusColor = (status: ExpiryStatus) => {
    if (status === 'expired') return theme.colors.error;
    if (status === 'expiring') return theme.colors.warning;
    if (status === 'ok') return theme.colors.success;
    return theme.colors.textSecondary;
  };

  const statusLabel = (label: string, status: ExpiryStatus, dateStr: string | null | undefined) => {
    if (status === 'missing') return `${label} —`;
    if (status === 'expired') return `${label} expirovaná ${formatDate(dateStr)}`;
    return `${label} ${formatDate(dateStr)}`;
  };

  // Primary title: Make + Model if available, fallback to name
  const vehicleTitle = vehicle.make
    ? `${vehicle.make}${vehicle.model ? ' ' + vehicle.model : ''}`
    : vehicle.name;

  // Subtitle: ŠPZ + year + description (if different from make+model)
  const autoName = vehicle.make ? `${vehicle.make}${vehicle.model ? ' ' + vehicle.model : ''}` : '';
  const hasCustomDescription = vehicle.name && vehicle.name !== autoName;

  const subtitleParts: string[] = [];
  if (vehicle.licensePlate) subtitleParts.push(vehicle.licensePlate);
  if (vehicle.year) subtitleParts.push(vehicle.year.toString());
  if (hasCustomDescription) subtitleParts.push(vehicle.name);

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.card,
          borderColor: hasAlerts ? theme.colors.warning : theme.colors.border,
          borderWidth: hasAlerts ? 2 : 1,
        },
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: theme.colors.primary + '20' }]}>
          <Ionicons name="car" size={24} color={theme.colors.primary} />
        </View>
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={1}>
            {vehicleTitle}
          </Text>
          {subtitleParts.length > 0 && (
            <Text
              style={[styles.subtitle, { color: theme.colors.textSecondary }]}
              numberOfLines={1}
            >
              {subtitleParts.join(' • ')}
            </Text>
          )}
        </View>
        <View style={styles.valueContainer}>
          <Text style={[styles.value, { color: theme.colors.text }]}>
            {formatCurrency(vehicle.currentValue)}
          </Text>
        </View>
      </View>

      {/* Info row */}
      <View style={styles.infoRow}>
        {vehicle.registeredCompany && (
          <View style={styles.infoItem}>
            <Ionicons name="business-outline" size={14} color={theme.colors.textSecondary} />
            <Text
              style={[styles.infoText, { color: theme.colors.textSecondary }]}
              numberOfLines={1}
            >
              {vehicle.registeredCompany}
            </Text>
          </View>
        )}
        {vehicle.mileage && (
          <View style={styles.infoItem}>
            <Ionicons name="speedometer-outline" size={14} color={theme.colors.textSecondary} />
            <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
              {vehicle.mileage.toLocaleString('sk-SK')} km
            </Text>
          </View>
        )}
        {vehicle.fuelType && (
          <View style={styles.infoItem}>
            <Ionicons
              name={
                (FUEL_TYPE_ICONS[vehicle.fuelType] ||
                  'flash-outline') as keyof typeof Ionicons.glyphMap
              }
              size={14}
              color={theme.colors.textSecondary}
            />
            <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
              {FUEL_TYPE_LABELS[vehicle.fuelType] || vehicle.fuelType}
            </Text>
          </View>
        )}
      </View>

      {/* Status badges */}
      <View style={styles.badgeRow}>
        {vehicle.totalLoanBalance > 0 && (
          <View style={[styles.badge, { backgroundColor: theme.colors.primary + '20' }]}>
            <Ionicons name="wallet-outline" size={12} color={theme.colors.primary} />
            <Text style={[styles.badgeText, { color: theme.colors.primary }]}>
              {formatCurrency(vehicle.totalLoanBalance)}
            </Text>
          </View>
        )}

        {vehicle.activeInsuranceCount > 0 ? (
          <View
            style={[
              styles.badge,
              {
                backgroundColor: vehicle.insuranceExpiringSoon
                  ? theme.colors.warning + '20'
                  : theme.colors.success + '20',
              },
            ]}
          >
            <Ionicons
              name="shield-checkmark-outline"
              size={12}
              color={vehicle.insuranceExpiringSoon ? theme.colors.warning : theme.colors.success}
            />
            <Text
              style={[
                styles.badgeText,
                {
                  color: vehicle.insuranceExpiringSoon
                    ? theme.colors.warning
                    : theme.colors.success,
                },
              ]}
            >
              {vehicle.insuranceExpiringSoon ? 'Končí!' : 'Poistené'}
            </Text>
          </View>
        ) : (
          <View style={[styles.badge, { backgroundColor: theme.colors.error + '20' }]}>
            <Ionicons name="shield-outline" size={12} color={theme.colors.error} />
            <Text style={[styles.badgeText, { color: theme.colors.error }]}>Bez poistky</Text>
          </View>
        )}

        {stkStatus !== 'missing' && (
          <View style={[styles.badge, { backgroundColor: statusColor(stkStatus) + '20' }]}>
            <Ionicons name="document-text-outline" size={12} color={statusColor(stkStatus)} />
            <Text style={[styles.badgeText, { color: statusColor(stkStatus) }]} numberOfLines={1}>
              {statusLabel('STK', stkStatus, vehicle.latestStkExpiry ?? vehicle.stkExpiry ?? null)}
            </Text>
          </View>
        )}

        {ekStatus !== 'missing' && (
          <View style={[styles.badge, { backgroundColor: statusColor(ekStatus) + '20' }]}>
            <Ionicons name="leaf-outline" size={12} color={statusColor(ekStatus)} />
            <Text style={[styles.badgeText, { color: statusColor(ekStatus) }]} numberOfLines={1}>
              {statusLabel('EK', ekStatus, vehicle.latestEkExpiry ?? vehicle.ekExpiry ?? null)}
            </Text>
          </View>
        )}

        {vignetteStatus !== 'missing' && (
          <View style={[styles.badge, { backgroundColor: statusColor(vignetteStatus) + '20' }]}>
            <Ionicons name="trail-sign-outline" size={12} color={statusColor(vignetteStatus)} />
            <Text
              style={[styles.badgeText, { color: statusColor(vignetteStatus) }]}
              numberOfLines={1}
            >
              {statusLabel(
                'Známka',
                vignetteStatus,
                vehicle.latestVignetteExpiry ?? vehicle.vignetteExpiry ?? null
              )}
            </Text>
          </View>
        )}

        {vehicle.unpaidFineCount > 0 && (
          <View style={[styles.badge, { backgroundColor: theme.colors.error + '20' }]}>
            <Ionicons name="warning-outline" size={12} color={theme.colors.error} />
            <Text style={[styles.badgeText, { color: theme.colors.error }]}>
              {vehicle.unpaidFineCount} pokút
            </Text>
          </View>
        )}
      </View>

      {/* Footer */}
      <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
        <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>
          TCO: {formatCurrency(vehicle.totalCostOfOwnership)}
        </Text>
        <View style={styles.arrowContainer}>
          <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  titleContainer: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
  },
  valueContainer: {
    alignItems: 'flex-end',
  },
  value: {
    fontSize: 16,
    fontWeight: '700',
  },
  infoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoText: {
    fontSize: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: 12,
  },
  footerText: {
    fontSize: 12,
  },
  arrowContainer: {
    opacity: 0.5,
  },
});
