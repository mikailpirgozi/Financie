import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getCurrentHousehold, getCategories, updateCategory, deleteCategory, type Category, type CreateCategoryData } from '../../../../src/lib/api';
import { LoadingSpinner } from '../../../../src/components/LoadingSpinner';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Toast } from '@/components/ui/Toast';
import * as Haptics from 'expo-haptics';

type CategoryKind = 'expense' | 'income' | 'asset' | 'loan';

export default function EditCategoryScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const categoryId = Array.isArray(id) ? id[0] : id || '';

  const [initialLoading, setInitialLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [parentCategoriesLoading, setParentCategoriesLoading] = useState(false);
  const [parentCategories, setParentCategories] = useState<Category[]>([]);
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
    visible: false,
    message: '',
    type: 'success',
  });

  // Form state
  const [name, setName] = useState('');
  const [kind, setKind] = useState<CategoryKind>('expense');
  const [parentId, setParentId] = useState<string>('');

  useEffect(() => {
    loadCategory();
  }, []);

  useEffect(() => {
    if (!initialLoading) {
      loadParentCategories();
    }
  }, [kind, initialLoading]);

  const loadCategory = async () => {
    try {
      setInitialLoading(true);
      const household = await getCurrentHousehold();
      const categories = await getCategories(household.id);
      const category = categories.find(c => c.id === categoryId);

      if (!category) {
        showToast('Kategória nebola nájdená', 'error');
        router.back();
        return;
      }

      setName(category.name);
      setKind(category.kind);
      setParentId(category.parent_id || '');
    } catch (error) {
      showToast('Nepodarilo sa načítať kategóriu', 'error');
      router.back();
    } finally {
      setInitialLoading(false);
    }
  };

  const loadParentCategories = async () => {
    try {
      setParentCategoriesLoading(true);
      const household = await getCurrentHousehold();
      const categoriesData = await getCategories(household.id, kind);
      // Filter out the current category to prevent self-parenting
      const filtered = categoriesData.filter(c => c.id !== categoryId);
      setParentCategories(filtered);
    } catch (error) {
      showToast('Nepodarilo sa načítať kategórie', 'error');
    } finally {
      setParentCategoriesLoading(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ visible: true, message, type });
  };

  const validateForm = (): boolean => {
    if (!name.trim()) {
      showToast('Zadajte názov kategórie', 'error');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      const data: Partial<CreateCategoryData> = {
        name: name.trim(),
        kind,
      };

      if (parentId) {
        data.parent_id = parentId;
      }

      await updateCategory(categoryId, data);

      showToast('Kategória bola aktualizovaná', 'success');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Navigate to categories list explicitly
      setTimeout(() => {
        router.replace('/(screens)/categories');
      }, 500);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Nepodarilo sa aktualizovať kategóriu',
        'error'
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Zmazať kategóriu',
      `Naozaj chcete zmazať kategóriu "${name}"? Táto akcia je nevratná.`,
      [
        { text: 'Zrušiť', style: 'cancel' },
        {
          text: 'Zmazať',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await deleteCategory(categoryId);
              showToast('Kategória bola zmazaná', 'success');
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              // Navigate to categories list after delete
              setTimeout(() => {
                router.replace('/(screens)/categories');
              }, 500);
            } catch (error) {
              showToast(
                error instanceof Error ? error.message : 'Nepodarilo sa zmazať kategóriu',
                'error'
              );
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const kindOptions: { value: CategoryKind; label: string; icon: string; color: string }[] = [
    { value: 'expense', label: 'Výdavok', icon: '💸', color: '#ef4444' },
    { value: 'income', label: 'Príjem', icon: '💰', color: '#10b981' },
    { value: 'asset', label: 'Majetok', icon: '🏠', color: '#8b5cf6' },
    { value: 'loan', label: 'Úver', icon: '🏦', color: '#f59e0b' },
  ];

  if (initialLoading) {
    return (
      <View style={styles.container}>
        <LoadingSpinner message="Načítavam kategóriu..." />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Upraviť kategóriu</Text>
          <Text style={styles.subtitle}>Zmeniť vlastnosti kategórie</Text>
        </View>

        <View style={styles.form}>
          {/* Name */}
          <View style={styles.section}>
            <Text style={styles.label}>Názov kategórie</Text>
            <Input
              placeholder="napr. Potraviny, Mzda, Byt"
              value={name}
              onChangeText={setName}
              style={styles.input}
            />
          </View>

          {/* Kind */}
          <View style={styles.section}>
            <Text style={styles.label}>Typ kategórie</Text>
            <View style={styles.kindGrid}>
              {kindOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.kindOption,
                    kind === option.value && styles.kindOptionSelected,
                    { borderColor: kind === option.value ? option.color : '#e5e7eb' },
                  ]}
                  onPress={() => {
                    setKind(option.value);
                    setParentId(''); // Reset parent when changing kind
                    Haptics.selectionAsync();
                  }}
                >
                  <Text style={styles.kindIcon}>{option.icon}</Text>
                  <Text
                    style={[
                      styles.kindLabel,
                      kind === option.value && { color: option.color },
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Parent Category */}
          <View style={styles.section}>
            <Text style={styles.label}>Nadradená kategória (voliteľné)</Text>
            {parentCategoriesLoading ? (
              <LoadingSpinner />
            ) : (
              <View style={styles.parentList}>
                <TouchableOpacity
                  style={[
                    styles.parentOption,
                    !parentId && styles.parentOptionSelected,
                  ]}
                  onPress={() => {
                    setParentId('');
                    Haptics.selectionAsync();
                  }}
                >
                  <Text
                    style={[
                      styles.parentLabel,
                      !parentId && styles.parentLabelSelected,
                    ]}
                  >
                    Žiadna (hlavná kategória)
                  </Text>
                  {!parentId && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>

                {parentCategories.length > 0 && (
                  <Text style={styles.divider}>alebo vyberte existujúcu:</Text>
                )}

                {parentCategories.map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.parentOption,
                      parentId === category.id && styles.parentOptionSelected,
                    ]}
                    onPress={() => {
                      setParentId(category.id);
                      Haptics.selectionAsync();
                    }}
                  >
                    <Text
                      style={[
                        styles.parentLabel,
                        parentId === category.id && styles.parentLabelSelected,
                      ]}
                    >
                      {category.name}
                    </Text>
                    {parentId === category.id && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <View style={styles.actions}>
        <Button
          onPress={handleSubmit}
          loading={loading}
          disabled={loading || parentCategoriesLoading}
          fullWidth
        >
          Uložiť zmeny
        </Button>
        <Button
          onPress={handleDelete}
          variant="destructive"
          disabled={loading}
          fullWidth
        >
          Zmazať kategóriu
        </Button>
        <Button
          onPress={() => router.back()}
          variant="outline"
          fullWidth
        >
          Zrušiť
        </Button>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 200,
  },
  header: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
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
  form: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  input: {
    fontSize: 16,
  },
  kindGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  kindOption: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderRadius: 12,
  },
  kindOptionSelected: {
    backgroundColor: '#f0f1ff',
  },
  kindIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  kindLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  parentList: {
    gap: 8,
  },
  parentOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
  },
  parentOptionSelected: {
    borderColor: '#6366f1',
    backgroundColor: '#f0f1ff',
  },
  parentLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  parentLabelSelected: {
    color: '#6366f1',
    fontWeight: '600',
  },
  checkmark: {
    fontSize: 20,
    color: '#6366f1',
  },
  divider: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    marginVertical: 8,
  },
  actions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 8,
  },
});

