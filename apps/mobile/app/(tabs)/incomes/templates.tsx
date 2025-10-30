import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import {
  getIncomeTemplates,
  deleteIncomeTemplate,
  applyIncomeTemplate,
  IncomeTemplate,
  getCategories,
  Category,
} from '@/lib/api';
import { getCurrentHousehold } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export default function IncomeTemplatesScreen() {
  const router = useRouter();
  const [templates, setTemplates] = useState<IncomeTemplate[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [tempsData, household] = await Promise.all([
        getIncomeTemplates(),
        getCurrentHousehold(),
      ]);

      setTemplates(tempsData);

      // Load categories
      const cats = await getCategories(household.id, 'income');
      setCategories(cats);
    } catch (err) {
      console.error('Failed to load templates:', err);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      await loadData();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      console.error('Failed to refresh:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleDelete = (template: IncomeTemplate) => {
    Alert.alert(
      'Zmazať šablónu',
      `Naozaj chcete zmazať šablónu "${template.name}"?`,
      [
        { text: 'Zrušiť', style: 'cancel' },
        {
          text: 'Zmazať',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteIncomeTemplate(template.id);
              setTemplates(templates.filter((t) => t.id !== template.id));
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (err) {
              console.error('Failed to delete template:', err);
              Alert.alert('Chyba', 'Nepodarilo sa zmazať šablónu');
            }
          },
        },
      ]
    );
  };

  const handleApply = (template: IncomeTemplate) => {
    const today = new Date().toISOString().split('T')[0];

    Alert.alert(
      'Použiť šablónu',
      `Vytvoriť príjem podľa šablóny "${template.name}" na dnešný deň?`,
      [
        { text: 'Zrušiť', style: 'cancel' },
        {
          text: 'Potvrdiť',
          onPress: async () => {
            try {
              await applyIncomeTemplate(template, today);
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Úspešne', 'Príjem bol vytvorený');
              // Refresh parent screen
              router.back();
            } catch (err) {
              console.error('Failed to apply template:', err);
              Alert.alert('Chyba', 'Nepodarilo sa vytvoriť príjem');
            }
          },
        },
      ]
    );
  };

  const getCategoryName = (categoryId: string): string => {
    return categories.find((c) => c.id === categoryId)?.name || 'Neznáma kategória';
  };

  const renderTemplate = ({ item }: { item: IncomeTemplate }) => (
    <Card style={styles.templateCard}>
      <View style={styles.templateHeader}>
        <View style={styles.templateInfo}>
          <Text style={styles.templateName}>{item.name}</Text>
          <Text style={styles.templateCategory}>
            📂 {getCategoryName(item.category_id)}
          </Text>
          {item.source && (
            <Text style={styles.templateSource}>📍 {item.source}</Text>
          )}
        </View>
        <Text style={styles.templateAmount}>{formatCurrency(item.amount.toString())}</Text>
      </View>

      <View style={styles.templateActions}>
        <Button
          onPress={() => handleApply(item)}
          variant="primary"
          size="small"
          style={styles.applyButton}
        >
          Použiť dnes
        </Button>
        <Button
          onPress={() => handleDelete(item)}
          variant="destructive"
          size="small"
          style={styles.deleteButton}
        >
          Zmazať
        </Button>
      </View>
    </Card>
  );

  const emptyComponent = (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📋</Text>
      <Text style={styles.emptyTitle}>Žiadne šablóny</Text>
      <Text style={styles.emptyText}>
        Vytvorte šablónu na rýchle vytváraní opakovaných príjmov
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Šablóny príjmov</Text>
      </View>

      <FlatList
        data={templates}
        renderItem={renderTemplate}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={emptyComponent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />

      <View style={styles.actions}>
        <Button
          onPress={() => router.push('/(tabs)/incomes/templates/new')}
          variant="primary"
          fullWidth
        >
          + Nová šablóna
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 100,
    flexGrow: 1,
  },
  templateCard: {
    marginBottom: 12,
    paddingVertical: 12,
  },
  templateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  templateInfo: {
    flex: 1,
  },
  templateName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  templateCategory: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  templateSource: {
    fontSize: 12,
    color: '#999',
  },
  templateAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10b981',
    marginLeft: 12,
  },
  templateActions: {
    flexDirection: 'row',
    gap: 8,
  },
  applyButton: {
    flex: 1,
  },
  deleteButton: {
    flex: 1,
  },
  actions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});
