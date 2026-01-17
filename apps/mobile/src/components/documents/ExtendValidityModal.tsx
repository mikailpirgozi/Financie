import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  Animated,
} from 'react-native';
import { X, Calendar, RefreshCw } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../contexts/ThemeContext';
import { Button } from '../ui/Button';
import type { PaymentFrequency } from '@finapp/core';
import { calculateValidToDate } from '@finapp/core';

interface ExtendValidityModalProps {
  visible: boolean;
  documentType: 'insurance' | 'stk' | 'ek' | 'vignette';
  currentValidTo: string;
  paymentFrequency?: PaymentFrequency;
  onExtend: (newValidTo: string) => Promise<void>;
  onClose: () => void;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function ExtendValidityModal({
  visible,
  documentType,
  currentValidTo,
  paymentFrequency = 'yearly',
  onExtend,
  onClose,
}: ExtendValidityModalProps) {
  const { theme } = useTheme();
  const colors = theme.colors;

  const [newValidTo, setNewValidTo] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    if (visible) {
      // Calculate default new validity date
      const current = new Date(currentValidTo);
      let newDate: Date;

      if (documentType === 'insurance') {
        const calculated = calculateValidToDate(currentValidTo, paymentFrequency);
        newDate = calculated ? new Date(calculated) : new Date(current.setFullYear(current.getFullYear() + 1));
      } else if (documentType === 'stk' || documentType === 'ek') {
        newDate = new Date(current);
        newDate.setFullYear(newDate.getFullYear() + 2);
      } else {
        // Vignette - default to 1 year
        newDate = new Date(current);
        newDate.setFullYear(newDate.getFullYear() + 1);
      }

      setNewValidTo(newDate);
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 300,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, currentValidTo, documentType, paymentFrequency]);

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  const handleExtend = async () => {
    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await onExtend(formatDate(newValidTo));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    } catch (error) {
      console.error('Failed to extend validity:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDateChange = (_event: unknown, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setNewValidTo(selectedDate);
    }
  };

  const getQuickOptions = () => {
    const current = new Date(currentValidTo);
    const options: { label: string; date: Date }[] = [];

    if (documentType === 'insurance') {
      // Based on payment frequency
      const d1 = new Date(current);
      const d2 = new Date(current);
      const d3 = new Date(current);

      switch (paymentFrequency) {
        case 'monthly':
          d1.setMonth(d1.getMonth() + 1);
          d2.setMonth(d2.getMonth() + 3);
          d3.setMonth(d3.getMonth() + 6);
          options.push({ label: '+1 mesiac', date: d1 });
          options.push({ label: '+3 mesiace', date: d2 });
          options.push({ label: '+6 mesiacov', date: d3 });
          break;
        case 'quarterly':
          d1.setMonth(d1.getMonth() + 3);
          d2.setMonth(d2.getMonth() + 6);
          d3.setFullYear(d3.getFullYear() + 1);
          options.push({ label: '+3 mesiace', date: d1 });
          options.push({ label: '+6 mesiacov', date: d2 });
          options.push({ label: '+1 rok', date: d3 });
          break;
        case 'biannual':
          d1.setMonth(d1.getMonth() + 6);
          d2.setFullYear(d2.getFullYear() + 1);
          d3.setFullYear(d3.getFullYear() + 2);
          options.push({ label: '+6 mesiacov', date: d1 });
          options.push({ label: '+1 rok', date: d2 });
          options.push({ label: '+2 roky', date: d3 });
          break;
        default:
          d1.setFullYear(d1.getFullYear() + 1);
          d2.setFullYear(d2.getFullYear() + 2);
          d3.setFullYear(d3.getFullYear() + 3);
          options.push({ label: '+1 rok', date: d1 });
          options.push({ label: '+2 roky', date: d2 });
          options.push({ label: '+3 roky', date: d3 });
      }
    } else if (documentType === 'stk' || documentType === 'ek') {
      const d1 = new Date(current);
      const d2 = new Date(current);
      d1.setFullYear(d1.getFullYear() + 2);
      d2.setFullYear(d2.getFullYear() + 4);
      options.push({ label: '+2 roky', date: d1 });
      options.push({ label: '+4 roky', date: d2 });
    } else {
      // Vignette
      const d1 = new Date(current);
      const d2 = new Date(current);
      const d3 = new Date(current);
      d1.setDate(d1.getDate() + 10);
      d2.setMonth(d2.getMonth() + 1);
      d3.setFullYear(d3.getFullYear() + 1);
      options.push({ label: '+10 dní', date: d1 });
      options.push({ label: '+1 mesiac', date: d2 });
      options.push({ label: '+1 rok', date: d3 });
    }

    return options;
  };

  const quickOptions = getQuickOptions();

  const getTypeLabel = () => {
    switch (documentType) {
      case 'insurance': return 'poistky';
      case 'stk': return 'STK';
      case 'ek': return 'EK';
      case 'vignette': return 'známky';
      default: return 'dokumentu';
    }
  };

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <Animated.View style={[styles.backdrop, { opacity }]}>
        <Pressable style={styles.backdropPress} onPress={handleClose} />
      </Animated.View>

      <Animated.View
        style={[
          styles.modal,
          { backgroundColor: colors.surface },
          { transform: [{ translateY }] },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.iconCircle, { backgroundColor: colors.primaryLight }]}>
            <RefreshCw size={24} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>
            Predĺžiť platnosť {getTypeLabel()}
          </Text>
          <Pressable onPress={handleClose} style={styles.closeButton}>
            <X size={24} color={colors.textSecondary} />
          </Pressable>
        </View>

        {/* Current validity info */}
        <View style={[styles.infoCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
            Aktuálna platnosť do
          </Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>
            {new Date(currentValidTo).toLocaleDateString('sk-SK', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </Text>
        </View>

        {/* Quick options */}
        <View style={styles.quickOptions}>
          <Text style={[styles.quickLabel, { color: colors.textSecondary }]}>
            Rýchly výber
          </Text>
          <View style={styles.quickButtons}>
            {quickOptions.map((option, index) => (
              <Pressable
                key={index}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setNewValidTo(option.date);
                }}
                style={[
                  styles.quickButton,
                  { 
                    backgroundColor: formatDate(newValidTo) === formatDate(option.date)
                      ? colors.primary
                      : colors.surfacePressed,
                    borderColor: formatDate(newValidTo) === formatDate(option.date)
                      ? colors.primary
                      : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.quickButtonText,
                    { 
                      color: formatDate(newValidTo) === formatDate(option.date)
                        ? '#fff'
                        : colors.text,
                    },
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Custom date picker */}
        <View style={styles.dateSection}>
          <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>
            Nová platnosť do
          </Text>
          <Pressable
            onPress={() => setShowDatePicker(true)}
            style={[styles.dateButton, { backgroundColor: colors.surfacePressed, borderColor: colors.border }]}
          >
            <Calendar size={18} color={colors.textSecondary} />
            <Text style={[styles.dateText, { color: colors.text }]}>
              {newValidTo.toLocaleDateString('sk-SK', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </Text>
          </Pressable>
        </View>

        {/* Footer */}
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <Button
            variant="outline"
            onPress={handleClose}
            style={styles.cancelButton}
          >
            Zrušiť
          </Button>
          <Button
            onPress={handleExtend}
            loading={isSaving}
            disabled={isSaving}
            style={styles.saveButton}
          >
            Predĺžiť
          </Button>
        </View>
      </Animated.View>

      {/* Date Picker */}
      {showDatePicker && (
        <View style={styles.datePickerOverlay}>
          <Pressable style={styles.datePickerBackdrop} onPress={() => setShowDatePicker(false)} />
          <View style={[styles.datePickerContainer, { backgroundColor: colors.surface }]}>
            <View style={styles.datePickerHeader}>
              <Text style={[styles.datePickerTitle, { color: colors.text }]}>
                Vyberte dátum
              </Text>
              <Pressable onPress={() => setShowDatePicker(false)}>
                <Text style={[styles.datePickerDone, { color: colors.primary }]}>Hotovo</Text>
              </Pressable>
            </View>
            <DateTimePicker
              value={newValidTo}
              mode="date"
              display="spinner"
              onChange={handleDateChange}
              minimumDate={new Date(currentValidTo)}
              style={styles.datePicker}
            />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  backdropPress: {
    flex: 1,
  },
  modal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  infoCard: {
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 17,
    fontWeight: '600',
  },
  quickOptions: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  quickLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  quickButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  quickButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  quickButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dateSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  dateText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    marginTop: 20,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 2,
  },
  datePickerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 1001,
  },
  datePickerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  datePickerContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  datePickerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  datePickerDone: {
    fontSize: 17,
    fontWeight: '600',
  },
  datePicker: {
    height: 200,
  },
});
