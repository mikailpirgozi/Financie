import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Keyboard,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getVehicleModels } from '@finapp/core';

import { useTheme } from '@/contexts/ThemeContext';

interface VehicleModelSelectProps {
  make: string;
  value: string;
  onChange: (value: string) => void;
  onSelectComplete?: () => void;
  disabled?: boolean;
  error?: string;
  autoOpen?: boolean;
}

/**
 * Vehicle model selector dependent on make
 * Includes option to add custom model if not in list
 */
export const VehicleModelSelect = React.memo(function VehicleModelSelect({
  make,
  value,
  onChange,
  onSelectComplete,
  disabled = false,
  error,
  autoOpen = false,
}: VehicleModelSelectProps) {
  const { theme } = useTheme();
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [customValue, setCustomValue] = useState('');
  const hasAutoOpened = useRef(false);

  // Get models for the selected make
  const allModels = useMemo(() => {
    if (!make) return [];
    return getVehicleModels(make);
  }, [make]);

  const filteredModels = useMemo(() => {
    if (!searchQuery.trim()) return allModels;
    const query = searchQuery.toLowerCase();
    return allModels.filter(model => 
      model.toLowerCase().includes(query)
    );
  }, [allModels, searchQuery]);

  // Auto-open when make is selected and autoOpen is true
  useEffect(() => {
    if (autoOpen && make && !hasAutoOpened.current && !disabled) {
      hasAutoOpened.current = true;
      // Small delay to allow previous modal to close
      const timer = setTimeout(() => {
        setShowModal(true);
      }, 300);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [autoOpen, make, disabled]);

  // Reset when make changes
  useEffect(() => {
    if (make) {
      hasAutoOpened.current = false;
    }
  }, [make]);

  const handleModelSelect = useCallback((model: string) => {
    if (model === '__custom__') {
      setIsCustom(true);
      setCustomValue('');
      setShowModal(false);
    } else {
      setIsCustom(false);
      onChange(model);
      setShowModal(false);
      setSearchQuery('');
      onSelectComplete?.();
    }
  }, [onChange, onSelectComplete]);

  const handleCustomSubmit = useCallback(() => {
    if (customValue.trim()) {
      onChange(customValue.trim());
      setIsCustom(false);
      setCustomValue('');
      onSelectComplete?.();
    }
  }, [customValue, onChange, onSelectComplete]);

  const handleOpenModal = useCallback(() => {
    if (!disabled && make) {
      setShowModal(true);
      setSearchQuery('');
    }
  }, [disabled, make]);

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
    setSearchQuery('');
  }, []);

  const isDisabled = disabled || !make;

  const renderModelItem = useCallback(({ item }: { item: string }) => (
    <TouchableOpacity
      style={[
        styles.option,
        { borderBottomColor: theme.colors.border },
        value === item && { backgroundColor: theme.colors.primary + '15' },
      ]}
      onPress={() => handleModelSelect(item)}
    >
      <Text
        style={[
          styles.optionText,
          { color: theme.colors.text },
          value === item && { color: theme.colors.primary, fontWeight: '600' },
        ]}
      >
        {item}
      </Text>
      {value === item && (
        <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
      )}
    </TouchableOpacity>
  ), [theme, value, handleModelSelect]);

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Model</Text>

      {!isCustom ? (
        <TouchableOpacity
          style={[
            styles.button,
            { 
              backgroundColor: theme.colors.background, 
              borderColor: error ? theme.colors.error : theme.colors.border,
              opacity: isDisabled ? 0.5 : 1,
            },
          ]}
          onPress={handleOpenModal}
          disabled={isDisabled}
        >
          <Text
            style={[
              styles.buttonText,
              { color: value ? theme.colors.text : theme.colors.textSecondary },
            ]}
          >
            {!make ? 'Najprv vyberte značku' : value || 'Vyberte model...'}
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
            placeholder="Zadajte názov modelu"
            placeholderTextColor={theme.colors.textSecondary}
            editable={!disabled}
            returnKeyType="done"
            onSubmitEditing={() => {
              Keyboard.dismiss();
              handleCustomSubmit();
            }}
            blurOnSubmit={true}
            autoFocus
          />
          <View style={styles.customButtons}>
            <TouchableOpacity onPress={handleCustomSubmit} style={styles.customButton}>
              <Text style={[styles.customButtonText, { color: theme.colors.primary }]}>
                Potvrdiť
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
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Modely {make}</Text>
            
            {/* Search input */}
            <View style={[styles.searchContainer, { backgroundColor: theme.colors.background }]}>
              <Ionicons name="search" size={18} color={theme.colors.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: theme.colors.text }]}
                placeholder="Hľadať model..."
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

            {/* Models list */}
            <FlatList
              data={filteredModels}
              renderItem={renderModelItem}
              keyExtractor={(item) => item}
              style={styles.optionsList}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Text style={[styles.emptyStateText, { color: theme.colors.textSecondary }]}>
                    {allModels.length === 0 
                      ? 'Pre túto značku nie sú dostupné modely'
                      : 'Model nenájdený'
                    }
                  </Text>
                </View>
              }
              ListFooterComponent={
                <TouchableOpacity
                  style={[styles.option, styles.optionCustom, { borderTopColor: theme.colors.border }]}
                  onPress={() => handleModelSelect('__custom__')}
                >
                  <Ionicons name="add-circle-outline" size={20} color={theme.colors.primary} />
                  <Text style={[styles.optionText, { color: theme.colors.primary, marginLeft: 8 }]}>
                    Vlastný model...
                  </Text>
                </TouchableOpacity>
              }
            />
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
    padding: 8,
    alignItems: 'center',
  },
  customButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  customButtonTextSecondary: {
    fontSize: 14,
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
  optionsList: {
    maxHeight: 400,
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
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
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
