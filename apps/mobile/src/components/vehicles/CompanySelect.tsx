import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Keyboard,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useTheme } from '@/contexts/ThemeContext';

const STORAGE_KEY = '@finapp/saved_companies';

interface CompanySelectProps {
  value: string;
  onChange: (value: string) => void;
  existingCompanies?: string[];
  disabled?: boolean;
  error?: string;
}

/**
 * Company selector with ability to save custom companies
 * Combines API-fetched companies with locally saved ones
 */
export const CompanySelect = React.memo(function CompanySelect({
  value,
  onChange,
  existingCompanies = [],
  disabled = false,
  error,
}: CompanySelectProps) {
  const { theme } = useTheme();
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [customValue, setCustomValue] = useState('');
  const [savedCompanies, setSavedCompanies] = useState<string[]>([]);

  // Load saved companies on mount
  useEffect(() => {
    loadSavedCompanies();
  }, []);

  const loadSavedCompanies = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        setSavedCompanies(JSON.parse(saved));
      }
    } catch (err) {
      console.error('Error loading saved companies:', err);
    }
  };

  const saveCompany = async (company: string) => {
    try {
      const updated = [...new Set([...savedCompanies, company])].sort((a, b) => 
        a.localeCompare(b, 'sk')
      );
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setSavedCompanies(updated);
    } catch (err) {
      console.error('Error saving company:', err);
    }
  };

  // Combine and dedupe all companies
  const allCompanies = useMemo(() => {
    const combined = [...new Set([...existingCompanies, ...savedCompanies])];
    return combined.sort((a, b) => a.localeCompare(b, 'sk'));
  }, [existingCompanies, savedCompanies]);

  const filteredCompanies = useMemo(() => {
    if (!searchQuery.trim()) return allCompanies;
    const query = searchQuery.toLowerCase();
    return allCompanies.filter(company => 
      company.toLowerCase().includes(query)
    );
  }, [allCompanies, searchQuery]);

  const handleCompanySelect = useCallback((company: string) => {
    if (company === '__custom__') {
      setIsCustom(true);
      setCustomValue('');
      setShowModal(false);
    } else {
      setIsCustom(false);
      onChange(company);
      setShowModal(false);
      setSearchQuery('');
    }
  }, [onChange]);

  const handleCustomSubmit = useCallback(async (shouldSave: boolean) => {
    if (customValue.trim()) {
      const company = customValue.trim();
      onChange(company);
      if (shouldSave) {
        await saveCompany(company);
      }
      setIsCustom(false);
      setCustomValue('');
    }
  }, [customValue, onChange]);

  const handleOpenModal = useCallback(() => {
    if (!disabled) {
      setShowModal(true);
      setSearchQuery('');
    }
  }, [disabled]);

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
    setSearchQuery('');
  }, []);

  const handleDeleteSavedCompany = useCallback(async (company: string) => {
    Alert.alert(
      'Odstrániť firmu',
      `Chcete odstrániť "${company}" z uložených firiem?`,
      [
        { text: 'Zrušiť', style: 'cancel' },
        {
          text: 'Odstrániť',
          style: 'destructive',
          onPress: async () => {
            try {
              const updated = savedCompanies.filter(c => c !== company);
              await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
              setSavedCompanies(updated);
            } catch (err) {
              console.error('Error removing company:', err);
            }
          },
        },
      ]
    );
  }, [savedCompanies]);

  const renderCompanyItem = useCallback(({ item }: { item: string }) => {
    const isSaved = savedCompanies.includes(item);
    const isFromApi = existingCompanies.includes(item);
    
    return (
      <TouchableOpacity
        style={[
          styles.option,
          { borderBottomColor: theme.colors.border },
          value === item && { backgroundColor: theme.colors.primary + '15' },
        ]}
        onPress={() => handleCompanySelect(item)}
        onLongPress={() => {
          if (isSaved && !isFromApi) {
            handleDeleteSavedCompany(item);
          }
        }}
      >
        <View style={styles.optionContent}>
          <Text
            style={[
              styles.optionText,
              { color: theme.colors.text },
              value === item && { color: theme.colors.primary, fontWeight: '600' },
            ]}
          >
            {item}
          </Text>
          {isSaved && !isFromApi && (
            <View style={[styles.savedBadge, { backgroundColor: theme.colors.primary + '20' }]}>
              <Text style={[styles.savedBadgeText, { color: theme.colors.primary }]}>
                Uložená
              </Text>
            </View>
          )}
        </View>
        {value === item && (
          <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
        )}
      </TouchableOpacity>
    );
  }, [theme, value, savedCompanies, existingCompanies, handleCompanySelect, handleDeleteSavedCompany]);

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Firma</Text>

      {!isCustom ? (
        <TouchableOpacity
          style={[
            styles.button,
            { 
              backgroundColor: theme.colors.background, 
              borderColor: error ? theme.colors.error : theme.colors.border 
            },
          ]}
          onPress={handleOpenModal}
          disabled={disabled}
        >
          <Text
            style={[
              styles.buttonText,
              { color: value ? theme.colors.text : theme.colors.textSecondary },
            ]}
          >
            {value || 'Vyberte firmu...'}
          </Text>
          <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      ) : (
        <View style={styles.customContainer}>
          <TextInput
            style={[
              styles.input,
              { 
                backgroundColor: theme.colors.background, 
                borderColor: error ? theme.colors.error : theme.colors.border,
                color: theme.colors.text,
              },
            ]}
            value={customValue}
            onChangeText={setCustomValue}
            placeholder="Zadajte názov firmy"
            placeholderTextColor={theme.colors.textSecondary}
            editable={!disabled}
            returnKeyType="done"
            onSubmitEditing={() => {
              Keyboard.dismiss();
            }}
            blurOnSubmit={true}
            autoFocus
          />
          <View style={styles.customButtons}>
            <TouchableOpacity 
              onPress={() => handleCustomSubmit(true)} 
              style={[styles.customButton, { backgroundColor: theme.colors.primary + '15' }]}
            >
              <Ionicons name="bookmark" size={14} color={theme.colors.primary} />
              <Text style={[styles.customButtonText, { color: theme.colors.primary }]}>
                Uložiť
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => handleCustomSubmit(false)} 
              style={styles.customButton}
            >
              <Text style={[styles.customButtonTextSecondary, { color: theme.colors.text }]}>
                Použiť raz
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setIsCustom(false);
                setCustomValue('');
              }}
              style={styles.customButton}
            >
              <Text style={[styles.customButtonTextSecondary, { color: theme.colors.textSecondary }]}>
                Späť
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {error && <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>}

      <Modal
        visible={showModal}
        transparent
        animationType="none"
        onRequestClose={handleCloseModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            activeOpacity={1} 
            onPress={handleCloseModal}
          />
          <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
            <View style={styles.modalHandle} />
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Vyberte firmu</Text>
            
            {/* Search input */}
            <View style={[styles.searchContainer, { backgroundColor: theme.colors.background }]}>
              <Ionicons name="search" size={18} color={theme.colors.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: theme.colors.text }]}
                placeholder="Hľadať firmu..."
                placeholderTextColor={theme.colors.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            {/* Clear selection option */}
            {value && (
              <TouchableOpacity
                style={[styles.clearOption, { borderBottomColor: theme.colors.border }]}
                onPress={() => {
                  onChange('');
                  setShowModal(false);
                }}
              >
                <Ionicons name="close-circle-outline" size={18} color={theme.colors.textSecondary} />
                <Text style={[styles.clearOptionText, { color: theme.colors.textSecondary }]}>
                  Zrušiť výber
                </Text>
              </TouchableOpacity>
            )}

            {/* Companies list */}
            <FlatList
              data={filteredCompanies}
              renderItem={renderCompanyItem}
              keyExtractor={(item) => item}
              style={styles.optionsList}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Text style={[styles.emptyStateText, { color: theme.colors.textSecondary }]}>
                    {allCompanies.length === 0 
                      ? 'Žiadne uložené firmy'
                      : 'Firma nenájdená'
                    }
                  </Text>
                </View>
              }
              ListFooterComponent={
                <TouchableOpacity
                  style={[styles.option, styles.optionCustom, { borderTopColor: theme.colors.border }]}
                  onPress={() => handleCompanySelect('__custom__')}
                >
                  <Ionicons name="add-circle-outline" size={20} color={theme.colors.primary} />
                  <Text style={[styles.optionText, { color: theme.colors.primary, marginLeft: 8 }]}>
                    Pridať novú firmu...
                  </Text>
                </TouchableOpacity>
              }
            />

            {savedCompanies.length > 0 && (
              <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
                Podržte pre odstránenie uloženej firmy
              </Text>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
  },
  buttonText: {
    fontSize: 15,
    flex: 1,
  },
  customContainer: {
    gap: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 15,
  },
  customButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  customButton: {
    flex: 1,
    flexDirection: 'row',
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    gap: 4,
  },
  customButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  customButtonTextSecondary: {
    fontSize: 13,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: '80%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#d1d5db',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  clearOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    gap: 8,
    marginBottom: 8,
  },
  clearOptionText: {
    fontSize: 14,
  },
  optionsList: {
    maxHeight: 350,
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  optionCustom: {
    borderTopWidth: 1,
    borderBottomWidth: 0,
    marginTop: 8,
    paddingTop: 16,
  },
  optionText: {
    fontSize: 16,
  },
  savedBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  savedBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    textAlign: 'center',
  },
  hint: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 12,
  },
});
