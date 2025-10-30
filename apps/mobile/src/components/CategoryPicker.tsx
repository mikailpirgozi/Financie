import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { getCategories, Category } from '@/lib/api';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';
import { Button } from './ui/Button';

interface CategoryPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (categoryId: string) => void;
  householdId: string;
  kind: 'income' | 'expense' | 'loan' | 'asset';
  selectedCategoryId?: string;
}

export function CategoryPicker({
  visible,
  onClose,
  onSelect,
  householdId,
  kind,
  selectedCategoryId,
}: CategoryPickerProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible && householdId) {
      loadCategories();
    }
  }, [visible, householdId, kind]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getCategories(householdId, kind);
      setCategories(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nepodarilo sa načítať kategórie');
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = searchQuery
    ? categories.filter((cat) =>
        cat.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : categories;

  // Group categories by parent
  const rootCategories = filteredCategories.filter((cat) => !cat.parent_id);
  const childCategories = filteredCategories.filter((cat) => cat.parent_id);

  const getCategoryTree = () => {
    const tree: Array<Category & { children?: Category[] }> = [];
    
    rootCategories.forEach((root) => {
      const children = childCategories.filter((child) => child.parent_id === root.id);
      tree.push({ ...root, children: children.length > 0 ? children : undefined });
    });

    return tree;
  };

  const categoryTree = getCategoryTree();

  const handleSelect = (categoryId: string) => {
    onSelect(categoryId);
    onClose();
    setSearchQuery('');
  };

  return (
    <Modal visible={visible} onClose={onClose}>
      <View style={styles.container}>
        <Text style={styles.title}>Vyberte kategóriu</Text>

        <Input
          placeholder="Hľadať kategóriu..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          showClearButton
          onClear={() => setSearchQuery('')}
        />

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0070f3" />
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <Button onPress={loadCategories} variant="outline" size="sm">
              Skúsiť znova
            </Button>
          </View>
        ) : (
          <FlatList
            data={categoryTree}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View>
                <TouchableOpacity
                  style={[
                    styles.categoryItem,
                    item.id === selectedCategoryId && styles.categoryItemSelected,
                  ]}
                  onPress={() => handleSelect(item.id)}
                >
                  <Text
                    style={[
                      styles.categoryText,
                      item.id === selectedCategoryId && styles.categoryTextSelected,
                    ]}
                  >
                    {item.name}
                  </Text>
                  {item.id === selectedCategoryId && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>

                {item.children &&
                  item.children.map((child) => (
                    <TouchableOpacity
                      key={child.id}
                      style={[
                        styles.categoryItem,
                        styles.childCategory,
                        child.id === selectedCategoryId && styles.categoryItemSelected,
                      ]}
                      onPress={() => handleSelect(child.id)}
                    >
                      <Text
                        style={[
                          styles.categoryText,
                          child.id === selectedCategoryId && styles.categoryTextSelected,
                        ]}
                      >
                        ↳ {child.name}
                      </Text>
                      {child.id === selectedCategoryId && (
                        <Text style={styles.checkmark}>✓</Text>
                      )}
                    </TouchableOpacity>
                  ))}
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>Žiadne kategórie</Text>
              </View>
            }
            style={styles.list}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    color: '#111827',
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  errorContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#ef4444',
    marginBottom: 16,
    textAlign: 'center',
  },
  list: {
    maxHeight: 400,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  childCategory: {
    paddingLeft: 24,
    backgroundColor: '#f9fafb',
  },
  categoryItemSelected: {
    backgroundColor: '#eff6ff',
  },
  categoryText: {
    fontSize: 16,
    color: '#111827',
  },
  categoryTextSelected: {
    color: '#0070f3',
    fontWeight: '600',
  },
  checkmark: {
    fontSize: 18,
    color: '#0070f3',
    fontWeight: '700',
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#9ca3af',
  },
});

