import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Swipeable } from 'react-native-gesture-handler';
import { getCurrentHousehold, getCategories, deleteCategory, type Category } from '../../src/lib/api';
import { ErrorMessage } from '../../src/components/ErrorMessage';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Toast } from '@/components/ui/Toast';
import { SkeletonCard } from '@/components/ui/Skeleton';
import * as Haptics from 'expo-haptics';

interface CategoryGroup {
  title: string;
  data: Category[];
  kind: string;
}

const KIND_LABELS: Record<string, string> = {
  expense: '💸 Výdavky',
  income: '💰 Príjmy',
  asset: '🏠 Majetok',
  loan: '🏦 Úvery',
};

export default function CategoriesScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
    visible: false,
    message: '',
    type: 'success',
  });

  useFocusEffect(
    useCallback(() => {
      loadCategories();
    }, [])
  );

  const loadCategories = async () => {
    try {
      setLoading(true);
      setError(null);

      const household = await getCurrentHousehold();

      // Get all categories
      const allCategories = await getCategories(household.id);
      setCategories(allCategories);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nepodarilo sa načítať kategórie');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCategories();
    setRefreshing(false);
  };

  const handleDelete = async (category: Category) => {
    Alert.alert(
      'Zmazať kategóriu',
      `Naozaj chcete zmazať kategóriu "${category.name}"?`,
      [
        { text: 'Zrušiť', style: 'cancel' },
        {
          text: 'Zmazať',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCategory(category.id);
              setCategories((prev) => prev.filter((c) => c.id !== category.id));
              showToast('Kategória bola zmazaná', 'success');
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (error) {
              showToast('Nepodarilo sa zmazať kategóriu', 'error');
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

  const groupCategoriesByKind = (): CategoryGroup[] => {
    const grouped: Record<string, Category[]> = {
      expense: [],
      income: [],
      asset: [],
      loan: [],
    };

    categories.forEach((cat) => {
      if (grouped[cat.kind]) {
        grouped[cat.kind].push(cat);
      }
    });

    return Object.entries(grouped)
      .filter(([_, cats]) => cats.length > 0)
      .map(([kind, cats]) => ({
        title: KIND_LABELS[kind] || kind,
        data: cats.sort((a, b) => a.name.localeCompare(b.name)),
        kind,
      }));
  };

  const buildCategoryTree = (categories: Category[]): Category[] => {
    const categoryMap = new Map<string, Category & { children?: Category[] }>();
    const roots: (Category & { children?: Category[] })[] = [];

    // Build map
    categories.forEach((cat) => {
      categoryMap.set(cat.id, { ...cat, children: [] });
    });

    // Build tree
    categories.forEach((cat) => {
      const node = categoryMap.get(cat.id)!;
      if (cat.parent_id) {
        const parent = categoryMap.get(cat.parent_id);
        if (parent) {
          parent.children!.push(node);
        } else {
          roots.push(node);
        }
      } else {
        roots.push(node);
      }
    });

    // Flatten for display with indentation
    interface CategoryWithLevel extends Category {
      level: number;
    }
    const flatten = (cats: (Category & { children?: Category[] })[], level = 0): CategoryWithLevel[] => {
      let result: CategoryWithLevel[] = [];
      cats.forEach((cat) => {
        result.push({ ...cat, level });
        if (cat.children && cat.children.length > 0) {
          result = result.concat(flatten(cat.children, level + 1));
        }
      });
      return result;
    };

    return flatten(roots);
  };

  const renderRightActions = (category: Category) => {
    return (
      <View style={styles.swipeActions}>
        <TouchableOpacity
          style={[styles.swipeAction, styles.editAction]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push(`/(screens)/categories/${category.id}/edit`);
          }}
        >
          <Text style={styles.swipeActionText}>✏️</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.swipeAction, styles.deleteAction]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            handleDelete(category);
          }}
        >
          <Text style={styles.swipeActionText}>🗑️</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderCategoryItem = ({ item }: { item: Category & { level?: number } }) => {
    const level = item.level || 0;
    const indent = level * 20;

    return (
      <Swipeable renderRightActions={() => renderRightActions(item)}>
        <TouchableOpacity
          style={[styles.categoryItem, { paddingLeft: 16 + indent }]}
          onPress={() => router.push(`/(screens)/categories/${item.id}`)}
        >
          <View style={styles.categoryInfo}>
            {level > 0 && <Text style={styles.indent}>└─</Text>}
            <Text style={styles.categoryName}>{item.name}</Text>
          </View>
          {item.parent_id && (
            <Badge variant="default" style={styles.childBadge}>Sub</Badge>
          )}
        </TouchableOpacity>
      </Swipeable>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
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
        <ErrorMessage message={error} onRetry={loadCategories} />
      </View>
    );
  }

  const sections = groupCategoriesByKind().map((group) => ({
    ...group,
    data: buildCategoryTree(group.data),
  }));

  return (
    <View style={styles.container}>

      <View style={styles.content}>
        {sections.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📁</Text>
            <Text style={styles.emptyText}>Zatiaľ nemáte žiadne kategórie</Text>
            <Button
              onPress={() => router.push('/(screens)/categories/new')}
              style={{ marginTop: 16 }}
            >
              Pridať prvú kategóriu
            </Button>
          </View>
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={(item) => item.id}
            renderItem={renderCategoryItem}
            renderSectionHeader={({ section }) => (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                <Badge variant="default">{section.data.length.toString()}</Badge>
              </View>
            )}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            contentContainerStyle={styles.list}
            stickySectionHeadersEnabled
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
  content: {
    flex: 1,
  },
  list: {
    paddingBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    paddingRight: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  indent: {
    fontSize: 14,
    color: '#9ca3af',
    marginRight: 8,
  },
  categoryName: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  childBadge: {
    marginLeft: 8,
  },
  swipeActions: {
    flexDirection: 'row',
  },
  swipeAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 70,
    marginLeft: 8,
  },
  editAction: {
    backgroundColor: '#0070f3',
  },
  deleteAction: {
    backgroundColor: '#ef4444',
  },
  swipeActionText: {
    fontSize: 24,
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
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
});

