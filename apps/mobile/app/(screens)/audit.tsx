import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { getAuditLog, getCurrentHousehold, type AuditLogEntry, type AuditLogFilters } from '../../src/lib/api';
import { ErrorMessage } from '../../src/components/ErrorMessage';
import { Badge } from '@/components/ui/Badge';
import { SkeletonCard } from '@/components/ui/Skeleton';

export default function AuditScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  // Filters
  const [selectedAction, setSelectedAction] = useState<string | undefined>();
  const [selectedEntityType, setSelectedEntityType] = useState<string | undefined>();

  useFocusEffect(
    useCallback(() => {
      loadAuditLog();
    }, [selectedAction, selectedEntityType])
  );

  const loadAuditLog = async () => {
    try {
      setLoading(true);
      setError(null);

      const household = await getCurrentHousehold();
      const filters: AuditLogFilters = {};
      
      if (selectedAction) filters.action = selectedAction;
      if (selectedEntityType) filters.entityType = selectedEntityType;

      const auditData = await getAuditLog(household.id, filters);
      setEntries(auditData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nepodarilo sa načítať audit log');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAuditLog();
    setRefreshing(false);
  };

  const getActionVariant = (action: string): 'success' | 'warning' | 'error' | 'default' => {
    switch (action) {
      case 'create': return 'success';
      case 'update': return 'warning';
      case 'delete': return 'error';
      default: return 'default';
    }
  };

  const getEntityIcon = (entityType: string): string => {
    const icons: Record<string, string> = {
      expense: '💸',
      income: '💰',
      loan: '🏦',
      asset: '🏠',
      category: '🏷️',
    };
    return icons[entityType] || '📄';
  };

  const formatRelativeTime = (timestamp: string): string => {
    const now = new Date();
    const then = new Date(timestamp);
    const diff = now.getTime() - then.getTime();
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Práve teraz';
    if (minutes < 60) return `Pred ${minutes} min`;
    if (hours < 24) return `Pred ${hours} h`;
    if (days === 1) return 'Včera';
    if (days < 7) return `Pred ${days} dňami`;
    
    return then.toLocaleDateString('sk-SK', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const renderEntry = ({ item }: { item: AuditLogEntry }) => {
    const isExpanded = expandedId === item.id;
    const hasChanges = item.changes && Object.keys(item.changes).length > 0;

    return (
      <TouchableOpacity
        style={styles.entryCard}
        onPress={() => {
          if (hasChanges) {
            setExpandedId(isExpanded ? null : item.id);
          }
        }}
        disabled={!hasChanges}
      >
        <View style={styles.entryHeader}>
          <Badge variant={getActionVariant(item.action)}>
            {item.action.toUpperCase()}
          </Badge>
          <View style={styles.entityInfo}>
            <Text style={styles.entityIcon}>{getEntityIcon(item.entity_type)}</Text>
            <Text style={styles.entityType}>{item.entity_type}</Text>
          </View>
        </View>

        <View style={styles.entryContent}>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>
              {item.user?.full_name || item.user?.email || 'Neznámy používateľ'}
            </Text>
            <Text style={styles.timestamp}>{formatRelativeTime(item.timestamp)}</Text>
          </View>

          {hasChanges && (
            <Text style={styles.changesIndicator}>
              {isExpanded ? '▼' : '▶'} {Object.keys(item.changes).length} zmien
            </Text>
          )}
        </View>

        {isExpanded && hasChanges && (
          <View style={styles.changesSection}>
            <View style={styles.changesDivider} />
            {Object.entries(item.changes).map(([key, value]) => (
              <View key={key} style={styles.changeRow}>
                <Text style={styles.changeKey}>{key}:</Text>
                <Text style={styles.changeValue} numberOfLines={3}>
                  {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const actionFilters = [
    { value: undefined, label: 'Všetky' },
    { value: 'create', label: 'Vytvorené' },
    { value: 'update', label: 'Upravené' },
    { value: 'delete', label: 'Zmazané' },
  ];

  const entityTypeFilters = [
    { value: undefined, label: 'Všetky' },
    { value: 'expense', label: 'Výdavky' },
    { value: 'income', label: 'Príjmy' },
    { value: 'loan', label: 'Úvery' },
    { value: 'asset', label: 'Majetok' },
    { value: 'category', label: 'Kategórie' },
  ];

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Audit Log</Text>
        </View>
        <View style={styles.content}>
          <SkeletonCard />
          <SkeletonCard />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <ErrorMessage message={error} onRetry={loadAuditLog} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Audit Log</Text>
        <Text style={styles.subtitle}>História zmien v domácnosti</Text>
      </View>

      {/* Filters */}
      <View style={styles.filtersSection}>
        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Akcia:</Text>
          <View style={styles.filterChips}>
            {actionFilters.map((filter) => (
              <TouchableOpacity
                key={filter.label}
                style={[
                  styles.filterChip,
                  selectedAction === filter.value && styles.filterChipSelected,
                ]}
                onPress={() => setSelectedAction(filter.value)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedAction === filter.value && styles.filterChipTextSelected,
                  ]}
                >
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Entita:</Text>
          <View style={styles.filterChips}>
            {entityTypeFilters.map((filter) => (
              <TouchableOpacity
                key={filter.label}
                style={[
                  styles.filterChip,
                  selectedEntityType === filter.value && styles.filterChipSelected,
                ]}
                onPress={() => setSelectedEntityType(filter.value)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedEntityType === filter.value && styles.filterChipTextSelected,
                  ]}
                >
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.content}>
        {entries.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📝</Text>
            <Text style={styles.emptyText}>Žiadne záznamy audit logu</Text>
            <Text style={styles.emptySubtext}>
              {selectedAction || selectedEntityType
                ? 'Skúste zmeniť filtre'
                : 'Audit log bude zobrazovať všetky zmeny v domácnosti'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={entries}
            keyExtractor={(item) => item.id}
            renderItem={renderEntry}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            contentContainerStyle={styles.list}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  filtersSection: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterGroup: {
    marginBottom: 8,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f3f4f6',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterChipSelected: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
  },
  filterChipTextSelected: {
    color: '#ffffff',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  list: {
    padding: 16,
    paddingBottom: 32,
  },
  entryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  entityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  entityIcon: {
    fontSize: 18,
  },
  entityType: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
    textTransform: 'capitalize',
  },
  entryContent: {
    gap: 8,
  },
  userInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  timestamp: {
    fontSize: 12,
    color: '#9ca3af',
  },
  changesIndicator: {
    fontSize: 12,
    color: '#6366f1',
    fontWeight: '500',
  },
  changesSection: {
    marginTop: 12,
  },
  changesDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginBottom: 12,
  },
  changeRow: {
    marginBottom: 8,
  },
  changeKey: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 2,
  },
  changeValue: {
    fontSize: 13,
    color: '#111827',
    fontFamily: 'monospace',
    backgroundColor: '#f9fafb',
    padding: 8,
    borderRadius: 6,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
});

