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
import { getCurrentHousehold, getCategories, getRules, updateRule, deleteRule, type Category, type CreateRuleData } from '../../../../src/lib/api';
import { LoadingSpinner } from '../../../../src/components/LoadingSpinner';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Toast } from '@/components/ui/Toast';
import { Card } from '@/components/ui/Card';
import * as Haptics from 'expo-haptics';

type MatchType = 'contains' | 'exact' | 'starts_with' | 'ends_with';
type AppliesTo = 'expense' | 'income';

export default function EditRuleScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const ruleId = Array.isArray(id) ? id[0] : id || '';

  const [initialLoading, setInitialLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
    visible: false,
    message: '',
    type: 'success',
  });

  // Form state
  const [matchType, setMatchType] = useState<MatchType>('contains');
  const [matchValue, setMatchValue] = useState('');
  const [appliesTo, setAppliesTo] = useState<AppliesTo>('expense');
  const [targetCategoryId, setTargetCategoryId] = useState('');

  useEffect(() => {
    loadRule();
  }, []);

  useEffect(() => {
    if (!initialLoading) {
      loadCategories();
    }
  }, [appliesTo, initialLoading]);

  const loadRule = async () => {
    try {
      setInitialLoading(true);
      const household = await getCurrentHousehold();
      const rules = await getRules(household.id);
      const rule = rules.find(r => r.id === ruleId);

      if (!rule) {
        showToast('Pravidlo nebolo nájdené', 'error');
        router.back();
        return;
      }

      setMatchType(rule.match_type);
      setMatchValue(rule.match_value);
      setAppliesTo(rule.applies_to);
      setTargetCategoryId(rule.target_category_id);
    } catch (error) {
      showToast('Nepodarilo sa načítať pravidlo', 'error');
      router.back();
    } finally {
      setInitialLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      setCategoriesLoading(true);
      const household = await getCurrentHousehold();
      const categoriesData = await getCategories(household.id, appliesTo);
      setCategories(categoriesData);
    } catch (error) {
      showToast('Nepodarilo sa načítať kategórie', 'error');
    } finally {
      setCategoriesLoading(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ visible: true, message, type });
  };

  const validateForm = (): boolean => {
    if (!matchValue.trim()) {
      showToast('Zadajte hodnotu na zhodu', 'error');
      return false;
    }

    if (!targetCategoryId) {
      showToast('Vyberte cieľovú kategóriu', 'error');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      const household = await getCurrentHousehold();

      const data: Partial<CreateRuleData> = {
        household_id: household.id,
        match_type: matchType,
        match_value: matchValue.trim(),
        target_category_id: targetCategoryId,
        applies_to: appliesTo,
      };

      await updateRule(ruleId, data);

      showToast('Pravidlo bolo aktualizované', 'success');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Navigate to rules list explicitly
      setTimeout(() => {
        router.replace('/(screens)/rules');
      }, 500);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Nepodarilo sa aktualizovať pravidlo',
        'error'
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Zmazať pravidlo',
      'Naozaj chcete zmazať toto pravidlo?',
      [
        { text: 'Zrušiť', style: 'cancel' },
        {
          text: 'Zmazať',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await deleteRule(ruleId);
              showToast('Pravidlo bolo zmazané', 'success');
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              // Navigate to rules list after delete
              setTimeout(() => {
                router.replace('/(screens)/rules');
              }, 500);
            } catch (error) {
              showToast('Nepodarilo sa zmazať pravidlo', 'error');
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const matchTypeOptions: { value: MatchType; label: string; description: string }[] = [
    { value: 'contains', label: 'Obsahuje', description: 'Text obsahuje túto hodnotu' },
    { value: 'exact', label: 'Presne', description: 'Text presne zodpovedá' },
    { value: 'starts_with', label: 'Začína na', description: 'Text začína touto hodnotou' },
    { value: 'ends_with', label: 'Končí na', description: 'Text končí touto hodnotou' },
  ];

  const appliesToOptions: { value: AppliesTo; label: string; icon: string }[] = [
    { value: 'expense', label: 'Výdavky', icon: '💸' },
    { value: 'income', label: 'Príjmy', icon: '💰' },
  ];

  if (initialLoading) {
    return (
      <View style={styles.container}>
        <LoadingSpinner message="Načítavam pravidlo..." />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Upraviť pravidlo</Text>
          <Text style={styles.subtitle}>Automatická kategorizácia transakcií</Text>
        </View>

        <View style={styles.form}>
          {/* Applies To */}
          <View style={styles.section}>
            <Text style={styles.label}>Typ transakcie</Text>
            <View style={styles.radioGroup}>
              {appliesToOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.radioOption,
                    appliesTo === option.value && styles.radioOptionSelected,
                  ]}
                  onPress={() => {
                    setAppliesTo(option.value);
                    setTargetCategoryId('');
                    Haptics.selectionAsync();
                  }}
                >
                  <Text style={styles.radioIcon}>{option.icon}</Text>
                  <Text
                    style={[
                      styles.radioLabel,
                      appliesTo === option.value && styles.radioLabelSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Match Type */}
          <View style={styles.section}>
            <Text style={styles.label}>Typ zhody</Text>
            <View style={styles.buttonGroup}>
              {matchTypeOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.buttonOption,
                    matchType === option.value && styles.buttonOptionSelected,
                  ]}
                  onPress={() => {
                    setMatchType(option.value);
                    Haptics.selectionAsync();
                  }}
                >
                  <Text
                    style={[
                      styles.buttonLabel,
                      matchType === option.value && styles.buttonLabelSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                  <Text style={styles.buttonDescription}>{option.description}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Match Value */}
          <View style={styles.section}>
            <Text style={styles.label}>Hodnota na zhodu</Text>
            <Input
              placeholder="napr. Tesco, Billa, Kaufland"
              value={matchValue}
              onChangeText={setMatchValue}
              style={styles.input}
            />
            <Text style={styles.hint}>
              Zadajte text, ktorý sa má hľadať v popisoch transakcií
            </Text>
          </View>

          {/* Target Category */}
          <View style={styles.section}>
            <Text style={styles.label}>Cieľová kategória</Text>
            {categoriesLoading ? (
              <LoadingSpinner />
            ) : categories.length === 0 ? (
              <Card style={styles.noCategories}>
                <Text style={styles.noCategoriesText}>
                  Nemáte žiadne kategórie typu {appliesTo === 'expense' ? 'výdavok' : 'príjem'}
                </Text>
              </Card>
            ) : (
              <View style={styles.categoryList}>
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.categoryOption,
                      targetCategoryId === category.id && styles.categoryOptionSelected,
                    ]}
                    onPress={() => {
                      setTargetCategoryId(category.id);
                      Haptics.selectionAsync();
                    }}
                  >
                    <View style={styles.categoryContent}>
                      <Text
                        style={[
                          styles.categoryName,
                          targetCategoryId === category.id && styles.categoryNameSelected,
                        ]}
                      >
                        {category.name}
                      </Text>
                      {targetCategoryId === category.id && (
                        <Text style={styles.checkmark}>✓</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Example */}
          {matchValue && (
            <Card style={styles.exampleCard}>
              <Text style={styles.exampleTitle}>Príklad:</Text>
              <Text style={styles.exampleText}>
                Keď popis transakcie {matchType === 'contains' ? 'obsahuje' :
                  matchType === 'exact' ? 'presne zodpovedá' :
                  matchType === 'starts_with' ? 'začína na' : 'končí na'} "
                <Text style={styles.exampleValue}>{matchValue}</Text>",
                bude automaticky priradená kategória "
                <Text style={styles.exampleValue}>
                  {categories.find(c => c.id === targetCategoryId)?.name || '?'}
                </Text>"
              </Text>
            </Card>
          )}
        </View>
      </ScrollView>

      <View style={styles.actions}>
        <Button
          onPress={handleSubmit}
          loading={loading}
          disabled={loading || categoriesLoading || categories.length === 0}
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
          Zmazať pravidlo
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
  radioGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  radioOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    gap: 8,
  },
  radioOptionSelected: {
    borderColor: '#6366f1',
    backgroundColor: '#f0f1ff',
  },
  radioIcon: {
    fontSize: 20,
  },
  radioLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6b7280',
  },
  radioLabelSelected: {
    color: '#6366f1',
    fontWeight: '600',
  },
  buttonGroup: {
    gap: 8,
  },
  buttonOption: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
  },
  buttonOptionSelected: {
    borderColor: '#6366f1',
    backgroundColor: '#f0f1ff',
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  buttonLabelSelected: {
    color: '#6366f1',
  },
  buttonDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  input: {
    fontSize: 16,
  },
  hint: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
  },
  categoryList: {
    gap: 8,
  },
  categoryOption: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
  },
  categoryOptionSelected: {
    borderColor: '#6366f1',
    backgroundColor: '#f0f1ff',
  },
  categoryContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  categoryNameSelected: {
    color: '#6366f1',
    fontWeight: '600',
  },
  checkmark: {
    fontSize: 20,
    color: '#6366f1',
  },
  noCategories: {
    padding: 16,
    alignItems: 'center',
  },
  noCategoriesText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  exampleCard: {
    padding: 16,
    backgroundColor: '#fffbeb',
    borderColor: '#fbbf24',
  },
  exampleTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 8,
  },
  exampleText: {
    fontSize: 14,
    color: '#78350f',
    lineHeight: 20,
  },
  exampleValue: {
    fontWeight: '600',
    color: '#78350f',
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

