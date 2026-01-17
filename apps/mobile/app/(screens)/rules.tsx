import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Pressable,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { getCurrentHousehold, getRules, deleteRule, type Rule } from '../../src/lib/api';
import { ErrorMessage } from '../../src/components/ErrorMessage';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Toast } from '@/components/ui/Toast';
import { SkeletonCard } from '@/components/ui/Skeleton';
import * as Haptics from 'expo-haptics';

export default function RulesScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rules, setRules] = useState<Rule[]>([]);
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
    visible: false,
    message: '',
    type: 'success',
  });

  useFocusEffect(
    useCallback(() => {
      loadRules();
    }, [])
  );

  const loadRules = async () => {
    try {
      setLoading(true);
      setError(null);

      const household = await getCurrentHousehold();
      const rulesData = await getRules(household.id);
      setRules(rulesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nepodarilo sa načítať pravidlá');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRules();
    setRefreshing(false);
  };

  const handleDelete = async (rule: Rule) => {
    Alert.alert(
      'Zmazať pravidlo',
      `Naozaj chcete zmazať pravidlo "${rule.match_value}"?`,
      [
        { text: 'Zrušiť', style: 'cancel' },
        {
          text: 'Zmazať',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteRule(rule.id);
              setRules((prev) => prev.filter((r) => r.id !== rule.id));
              showToast('Pravidlo bolo zmazané', 'success');
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (error) {
              showToast('Nepodarilo sa zmazať pravidlo', 'error');
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }
          },
        },
      ]
    );
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ visible: true, message, type });
  };

  const getMatchTypeBadge = (matchType: string) => {
    const badges: Record<string, { variant: 'default' | 'success' | 'warning'; label: string }> = {
      contains: { variant: 'default', label: 'Obsahuje' },
      exact: { variant: 'success', label: 'Presne' },
      starts_with: { variant: 'warning', label: 'Začína' },
      ends_with: { variant: 'warning', label: 'Končí' },
    };
    return badges[matchType] || { variant: 'default', label: matchType };
  };

  const handleRuleLongPress = (rule: Rule) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      rule.match_value,
      'Vyberte akciu',
      [
        {
          text: 'Upraviť',
          onPress: () => router.push(`/(screens)/rules/${rule.id}/edit`),
        },
        {
          text: 'Zmazať',
          style: 'destructive',
          onPress: () => handleDelete(rule),
        },
        { text: 'Zrušiť', style: 'cancel' },
      ]
    );
  };

  const renderRuleItem = ({ item }: { item: Rule }) => {
    const matchTypeBadge = getMatchTypeBadge(item.match_type);
    
    return (
      <Pressable
        style={styles.ruleCard}
        onLongPress={() => handleRuleLongPress(item)}
      >
        <View style={styles.ruleHeader}>
          <Badge variant={matchTypeBadge.variant}>{matchTypeBadge.label}</Badge>
          <Badge variant={item.applies_to === 'expense' ? 'error' : 'success'}>
            {item.applies_to === 'expense' ? '💸 Výdavok' : '💰 Príjem'}
          </Badge>
        </View>
        
        <Text style={styles.matchValue}>"{item.match_value}"</Text>
        
        <View style={styles.arrow}>
          <Text style={styles.arrowText}>→</Text>
        </View>
        
        <View style={styles.categoryInfo}>
          <Text style={styles.categoryLabel}>Kategória:</Text>
          <Text style={styles.categoryName}>
            {item.target_category?.name || 'Neznáma kategória'}
          </Text>
        </View>
      </Pressable>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Pravidlá</Text>
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
        <ErrorMessage message={error} onRetry={loadRules} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Pravidlá</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/(screens)/rules/new')}
          >
            <Text style={styles.addButtonText}>+ Pridať</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.subtitle}>Automatická kategorizácia transakcií</Text>
      </View>

      <View style={styles.content}>
        {rules.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>⚡</Text>
            <Text style={styles.emptyText}>Zatiaľ nemáte žiadne pravidlá</Text>
            <Text style={styles.emptySubtext}>
              Vytvorte pravidlá pre automatickú kategorizáciu výdavkov a príjmov
            </Text>
            <Button
              onPress={() => router.push('/(screens)/rules/new')}
              style={{ marginTop: 16 }}
            >
              Vytvoriť prvé pravidlo
            </Button>
          </View>
        ) : (
          <FlatList
            data={rules}
            keyExtractor={(item) => item.id}
            renderItem={renderRuleItem}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            contentContainerStyle={styles.list}
          />
        )}
      </View>

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onDismiss={() => setToast({ ...toast, visible: false })}
      />
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
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  addButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  list: {
    padding: 16,
    paddingBottom: 32,
  },
  ruleCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  ruleHeader: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  matchValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  arrow: {
    alignItems: 'center',
    marginVertical: 8,
  },
  arrowText: {
    fontSize: 24,
    color: '#9ca3af',
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
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

