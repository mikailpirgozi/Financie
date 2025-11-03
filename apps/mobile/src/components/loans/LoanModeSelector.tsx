import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LOAN_CALCULATION_MODES, type LoanCalculationMode } from '@finapp/core';

interface LoanModeSelectorProps {
  value: LoanCalculationMode;
  onChange: (value: LoanCalculationMode) => void;
  disabled?: boolean;
}

/**
 * Radio selector for loan calculation mode (mobile)
 * Memoized to prevent unnecessary re-renders
 */
export const LoanModeSelector = React.memo(function LoanModeSelector({
  value,
  onChange,
  disabled = false,
}: LoanModeSelectorProps) {
  const modes: LoanCalculationMode[] = ['rate_term', 'payment_term', 'rate_payment'];

  return (
    <View style={styles.container}>
      <Text style={styles.label}>🎯 Aké údaje poznáte?</Text>

      <View style={styles.modesContainer}>
        {modes.map((mode) => {
          const info = LOAN_CALCULATION_MODES[mode];
          const isSelected = value === mode;

          return (
            <TouchableOpacity
              key={mode}
              style={[styles.modeCard, isSelected && styles.modeCardSelected]}
              onPress={() => onChange(mode)}
              disabled={disabled}
            >
              <View style={styles.radioContainer}>
                <View style={[styles.radio, isSelected && styles.radioSelected]}>
                  {isSelected && <View style={styles.radioDot} />}
                </View>
              </View>
              <View style={styles.modeContent}>
                <Text style={[styles.modeLabel, isSelected && styles.modeLabelSelected]}>
                  {info.label}
                </Text>
                <Text style={styles.modeDescription}>→ {info.description}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 12,
  },
  modesContainer: {
    gap: 8,
  },
  modeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    backgroundColor: '#ffffff',
  },
  modeCardSelected: {
    borderColor: '#8b5cf6',
    backgroundColor: '#f5f3ff',
  },
  radioContainer: {
    marginRight: 12,
    paddingTop: 2,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: '#8b5cf6',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#8b5cf6',
  },
  modeContent: {
    flex: 1,
  },
  modeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  modeLabelSelected: {
    color: '#8b5cf6',
  },
  modeDescription: {
    fontSize: 12,
    color: '#6b7280',
  },
});

