import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { DEFAULT_LENDERS } from '@finapp/core';
import { Modal } from '@/components/ui/Modal';

interface LenderSelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
}

/**
 * Lender select for mobile with dropdown and custom input
 */
export function LenderSelect({
  value,
  onChange,
  disabled = false,
  error,
}: LenderSelectProps) {
  const [showModal, setShowModal] = useState(false);
  const [isCustom, setIsCustom] = useState(false);
  const [customValue, setCustomValue] = useState('');

  const handleLenderSelect = (lender: string) => {
    if (lender === '__custom__') {
      setIsCustom(true);
      setCustomValue('');
      setShowModal(false);
    } else {
      setIsCustom(false);
      onChange(lender);
      setShowModal(false);
    }
  };

  const handleCustomSubmit = () => {
    if (customValue.trim()) {
      onChange(customValue.trim());
      setIsCustom(false);
      setCustomValue('');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Veriteľ *</Text>

      {!isCustom ? (
        <TouchableOpacity
          style={[styles.button, error && styles.buttonError]}
          onPress={() => setShowModal(true)}
          disabled={disabled}
        >
          <Text style={[styles.buttonText, !value && styles.placeholder]}>
            {value || 'Vyberte veriteľa...'}
          </Text>
          <Text style={styles.chevron}>▼</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.customContainer}>
          <TextInput
            style={[styles.input, error && styles.inputError]}
            value={customValue}
            onChangeText={setCustomValue}
            placeholder="Zadajte názov veriteľa"
            editable={!disabled}
          />
          <View style={styles.customButtons}>
            <TouchableOpacity onPress={handleCustomSubmit} style={styles.customButton}>
              <Text style={styles.customButtonText}>✓ Potvrdiť</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setIsCustom(false);
                setCustomValue('');
              }}
              style={styles.customButton}
            >
              <Text style={styles.customButtonTextSecondary}>← Späť</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {error && <Text style={styles.errorText}>{error}</Text>}

      <Modal visible={showModal} onClose={() => setShowModal(false)} title="Vyberte veriteľa">
        <View style={styles.modalContent}>
          {/* Banks */}
          <Text style={styles.sectionTitle}>Banky</Text>
          {DEFAULT_LENDERS.banks.map((lender) => (
            <TouchableOpacity
              key={lender}
              style={[styles.option, value === lender && styles.optionSelected]}
              onPress={() => handleLenderSelect(lender)}
            >
              <Text
                style={[styles.optionText, value === lender && styles.optionTextSelected]}
              >
                {lender}
              </Text>
              {value === lender && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>
          ))}

          {/* Leasing */}
          <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Leasingové spoločnosti</Text>
          {DEFAULT_LENDERS.leasing.map((lender) => (
            <TouchableOpacity
              key={lender}
              style={[styles.option, value === lender && styles.optionSelected]}
              onPress={() => handleLenderSelect(lender)}
            >
              <Text
                style={[styles.optionText, value === lender && styles.optionTextSelected]}
              >
                {lender}
              </Text>
              {value === lender && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>
          ))}

          {/* Custom */}
          <TouchableOpacity
            style={[styles.option, styles.optionCustom]}
            onPress={() => handleLenderSelect('__custom__')}
          >
            <Text style={styles.optionText}>➕ Vlastný veriteľ...</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 48,
  },
  buttonError: {
    borderColor: '#ef4444',
  },
  buttonText: {
    fontSize: 16,
    color: '#111827',
    flex: 1,
  },
  placeholder: {
    color: '#9ca3af',
  },
  chevron: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 8,
  },
  customContainer: {
    gap: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  inputError: {
    borderColor: '#ef4444',
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
    color: '#8b5cf6',
    fontWeight: '600',
  },
  customButtonTextSecondary: {
    fontSize: 14,
    color: '#6b7280',
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
  },
  modalContent: {
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  optionSelected: {
    backgroundColor: '#f5f3ff',
  },
  optionCustom: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    marginTop: 8,
  },
  optionText: {
    fontSize: 16,
    color: '#374151',
  },
  optionTextSelected: {
    color: '#8b5cf6',
    fontWeight: '600',
  },
  checkmark: {
    fontSize: 18,
    color: '#8b5cf6',
  },
});

