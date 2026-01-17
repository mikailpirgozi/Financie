import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
} from 'react-native';
import { X, Pin, AlertTriangle, Info, CheckCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../contexts';
import { SegmentControl, SegmentOption } from '../ui/SegmentControl';
import { Button } from '../ui/Button';
import type { LoanNote } from './NoteCard';

interface NoteEditorModalProps {
  visible: boolean;
  note?: LoanNote | null;
  onSave: (noteData: {
    content: string;
    priority: 'high' | 'normal' | 'low';
    status: 'pending' | 'completed' | 'info';
    is_pinned: boolean;
  }) => void;
  onClose: () => void;
  title?: string;
}

type NotePriority = 'high' | 'normal' | 'low';
type NoteStatus = 'pending' | 'info';

const priorityOptions: SegmentOption<NotePriority>[] = [
  { value: 'high', label: 'Vysoka' },
  { value: 'normal', label: 'Normalna' },
  { value: 'low', label: 'Nizka' },
];

const statusOptions: SegmentOption<NoteStatus>[] = [
  { value: 'pending', label: 'Treba vybavit' },
  { value: 'info', label: 'Informativna' },
];

export function NoteEditorModal({
  visible,
  note,
  onSave,
  onClose,
  title = 'Poznamka',
}: NoteEditorModalProps) {
  const { theme } = useTheme();
  const colors = theme.colors;

  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<NotePriority>('normal');
  const [status, setStatus] = useState<NoteStatus>('info');
  const [isPinned, setIsPinned] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(50)).current;

  // Initialize form with existing note data
  useEffect(() => {
    if (note) {
      setContent(note.content);
      setPriority(note.priority);
      setStatus(note.status === 'completed' ? 'pending' : note.status);
      setIsPinned(note.is_pinned);
    } else {
      setContent('');
      setPriority('normal');
      setStatus('info');
      setIsPinned(false);
    }
  }, [note, visible]);

  // Animate modal
  useEffect(() => {
    if (visible) {
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
          toValue: 50,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleSave = async () => {
    if (!content.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await onSave({
        content: content.trim(),
        priority,
        status,
        is_pinned: isPinned,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  const togglePin = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsPinned(!isPinned);
  };

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <Animated.View
        style={[
          styles.backdrop,
          { backgroundColor: 'rgba(0,0,0,0.5)', opacity },
        ]}
      >
        <Pressable style={styles.backdropPress} onPress={handleClose} />
      </Animated.View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <Animated.View
          style={[
            styles.modal,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              shadowColor: colors.shadowColor,
              transform: [{ translateY }],
              opacity,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>
              {note ? 'Upravit poznamku' : title}
            </Text>
            <Pressable onPress={handleClose} style={styles.closeButton}>
              <X size={24} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Content Input */}
            <View style={styles.section}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Text poznamky *
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: colors.surfacePressed,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                placeholder="Napiste poznamku..."
                placeholderTextColor={colors.textMuted}
                value={content}
                onChangeText={setContent}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                autoFocus={!note}
              />
            </View>

            {/* Priority Selector */}
            <View style={styles.section}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Priorita
              </Text>
              <SegmentControl
                options={priorityOptions}
                value={priority}
                onChange={setPriority}
                size="sm"
              />
              <View style={styles.priorityHint}>
                {priority === 'high' && (
                  <View style={styles.hintRow}>
                    <AlertTriangle size={14} color={colors.danger} />
                    <Text style={[styles.hintText, { color: colors.danger }]}>
                      Vysoka priorita - zobrazí sa na karte uveru
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Status Selector */}
            <View style={styles.section}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Typ poznamky
              </Text>
              <SegmentControl
                options={statusOptions}
                value={status}
                onChange={setStatus}
                size="sm"
              />
              <View style={styles.statusHint}>
                {status === 'pending' && (
                  <View style={styles.hintRow}>
                    <CheckCircle size={14} color={colors.warning} />
                    <Text style={[styles.hintText, { color: colors.textSecondary }]}>
                      Mozete oznacit ako vybavene
                    </Text>
                  </View>
                )}
                {status === 'info' && (
                  <View style={styles.hintRow}>
                    <Info size={14} color={colors.info} />
                    <Text style={[styles.hintText, { color: colors.textSecondary }]}>
                      Len informativna poznamka
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Pin Toggle */}
            <Pressable
              onPress={togglePin}
              style={[
                styles.pinToggle,
                {
                  backgroundColor: isPinned
                    ? colors.primaryLight
                    : colors.surfacePressed,
                  borderColor: isPinned ? colors.primary : colors.border,
                },
              ]}
            >
              <Pin
                size={18}
                color={isPinned ? colors.primary : colors.textMuted}
              />
              <View style={styles.pinContent}>
                <Text
                  style={[
                    styles.pinLabel,
                    { color: isPinned ? colors.primary : colors.text },
                  ]}
                >
                  Pripnut na vrch
                </Text>
                <Text style={[styles.pinHint, { color: colors.textMuted }]}>
                  Pripnute poznamky sa zobrazuju ako prve
                </Text>
              </View>
              <View
                style={[
                  styles.pinIndicator,
                  {
                    backgroundColor: isPinned
                      ? colors.primary
                      : colors.border,
                  },
                ]}
              >
                {isPinned && (
                  <View
                    style={[styles.pinDot, { backgroundColor: colors.surface }]}
                  />
                )}
              </View>
            </Pressable>
          </ScrollView>

          {/* Footer */}
          <View
            style={[
              styles.footer,
              { borderTopColor: colors.border },
            ]}
          >
            <Button
              variant="outline"
              onPress={handleClose}
              style={styles.cancelButton}
            >
              Zrusit
            </Button>
            <Button
              onPress={handleSave}
              loading={isSaving}
              disabled={!content.trim() || isSaving}
              style={styles.saveButton}
            >
              {note ? 'Ulozit zmeny' : 'Pridat poznamku'}
            </Button>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
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
  },
  backdropPress: {
    flex: 1,
  },
  keyboardAvoid: {
    justifyContent: 'flex-end',
  },
  modal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: '90%',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textInput: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    fontSize: 15,
    minHeight: 100,
  },
  priorityHint: {
    marginTop: 8,
    minHeight: 20,
  },
  statusHint: {
    marginTop: 8,
    minHeight: 20,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hintText: {
    fontSize: 12,
    fontWeight: '500',
  },
  pinToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
    gap: 12,
  },
  pinContent: {
    flex: 1,
  },
  pinLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  pinHint: {
    fontSize: 12,
  },
  pinIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pinDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    borderTopWidth: 1,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 2,
  },
});
