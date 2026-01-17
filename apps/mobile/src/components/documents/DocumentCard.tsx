import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  VehicleDocument,
  DOCUMENT_TYPE_LABELS,
  VIGNETTE_COUNTRY_LABELS,
  VIGNETTE_COUNTRY_FLAGS,
  getExpirationStatus,
  getDaysUntilExpiry,
} from '@finapp/core';
import { useTheme } from '@/contexts/ThemeContext';

interface DocumentCardProps {
  document: VehicleDocument;
  onPress: () => void;
  onLongPress?: () => void;
}

const getDocumentIcon = (type: string): keyof typeof Ionicons.glyphMap => {
  switch (type) {
    case 'stk':
      return 'document-text';
    case 'ek':
      return 'cloud-outline';
    case 'vignette':
      return 'ticket-outline';
    default:
      return 'document';
  }
};

export function DocumentCard({ document, onPress, onLongPress }: DocumentCardProps) {
  const { theme } = useTheme();
  const status = getExpirationStatus(document.validTo);
  const daysUntil = getDaysUntilExpiry(document.validTo);
  const isExpired = status === 'expired';
  const isExpiring = status === 'expiring';

  const getStatusColor = () => {
    if (isExpired) return '#ef4444';
    if (isExpiring) return '#f97316';
    return '#22c55e';
  };

  const getStatusLabel = () => {
    if (isExpired) return 'Expirované';
    if (isExpiring) return `${daysUntil} dní`;
    return 'Platné';
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('sk-SK');
  };

  // Calculate progress
  const getProgressWidth = () => {
    const now = new Date();
    const from = document.validFrom ? new Date(document.validFrom) : new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    const to = new Date(document.validTo);
    
    const totalDays = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)));
    const daysLeft = Math.max(0, Math.ceil((to.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    const daysUsed = totalDays - daysLeft;
    const percentage = Math.min(100, Math.max(0, (daysUsed / totalDays) * 100));
    
    return percentage;
  };

  const progressWidth = getProgressWidth();
  const progressColor = isExpired ? '#ef4444' : isExpiring ? '#f97316' : progressWidth >= 75 ? '#eab308' : '#22c55e';

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
              name={getDocumentIcon(document.documentType)} 
              size={20} 
              color={isExpired ? '#ef4444' : isExpiring ? '#f97316' : '#3b82f6'} 
            />
          </View>
          <View style={styles.titleContainer}>
            <Text style={[styles.type, { color: theme.colors.text }]}>
              {DOCUMENT_TYPE_LABELS[document.documentType]}
            </Text>
            {document.documentNumber && (
              <Text style={[styles.documentNumber, { color: theme.colors.textSecondary }]}>
                {document.documentNumber}
              </Text>
            )}
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
        {document.asset && (
          <View style={styles.detailRow}>
            <Ionicons name="car-outline" size={14} color={theme.colors.textSecondary} />
            <Text style={[styles.detailText, { color: theme.colors.textSecondary }]}>
              {document.asset.name}
              {document.asset.licensePlate && ` (${document.asset.licensePlate})`}
            </Text>
          </View>
        )}
        
        {document.documentType === 'vignette' && document.country && (
          <View style={styles.detailRow}>
            <Text style={styles.countryFlag}>
              {VIGNETTE_COUNTRY_FLAGS[document.country]}
            </Text>
            <Text style={[styles.detailText, { color: theme.colors.textSecondary }]}>
              {VIGNETTE_COUNTRY_LABELS[document.country]}
            </Text>
          </View>
        )}
        
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={14} color={theme.colors.textSecondary} />
          <Text style={[styles.detailText, { color: theme.colors.textSecondary }]}>
            {document.validFrom && `${formatDate(document.validFrom)} - `}
            {formatDate(document.validTo)}
          </Text>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressTrack, { backgroundColor: theme.colors.border }]}>
            <View 
              style={[styles.progressFill, { width: `${progressWidth}%`, backgroundColor: progressColor }]} 
            />
          </View>
          <Text style={[styles.progressText, { color: theme.colors.textSecondary }]}>
            {isExpired ? 'Expirované' : `${daysUntil} dní`}
          </Text>
        </View>
      </View>

      <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
        <View>
          {document.price ? (
            <>
              <Text style={[styles.price, { color: theme.colors.text }]}>
                {Number(document.price).toLocaleString('sk-SK')}€
              </Text>
              {document.kmState && (
                <Text style={[styles.kmState, { color: theme.colors.textSecondary }]}>
                  {document.kmState.toLocaleString('sk-SK')} km
                </Text>
              )}
            </>
          ) : document.kmState ? (
            <Text style={[styles.kmState, { color: theme.colors.textSecondary }]}>
              {document.kmState.toLocaleString('sk-SK')} km
            </Text>
          ) : null}
        </View>
        {document.filePaths && document.filePaths.length > 0 && (
          <View style={styles.filesIndicator}>
            <Ionicons name="document-text" size={16} color={theme.colors.primary} />
            {document.filePaths.length > 1 && (
              <Text style={[styles.filesCount, { color: theme.colors.primary }]}>
                +{document.filePaths.length - 1}
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
  documentNumber: {
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
  countryFlag: {
    fontSize: 14,
  },
  progressContainer: {
    marginTop: 4,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 11,
    marginTop: 4,
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
  kmState: {
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
