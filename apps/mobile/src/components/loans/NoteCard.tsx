import React, { useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import {
  Pin,
  CheckCircle,
  Circle,
  Info,
  AlertTriangle,
  Trash2,
  Pencil,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../contexts';
import { priorityColors, noteStatusColors } from '../../lib/theme';

export interface LoanNote {
  id: string;
  loan_id: string;
  payment_id?: string | null;
  schedule_id?: string | null;
  content: string;
  priority: 'high' | 'normal' | 'low';
  status: 'pending' | 'completed' | 'info';
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

interface NoteCardProps {
  note: LoanNote;
  onToggleStatus?: (noteId: string, newStatus: 'pending' | 'completed') => void;
  onTogglePin?: (noteId: string, isPinned: boolean) => void;
  onEdit?: (note: LoanNote) => void;
  onDelete?: (noteId: string) => void;
  showMeta?: boolean;
  installmentNumber?: number;
}

export function NoteCard({
  note,
  onToggleStatus,
  onTogglePin,
  onEdit,
  onDelete,
  showMeta = true,
  installmentNumber,
}: NoteCardProps) {
  const { theme, isDark } = useTheme();
  const colors = theme.colors;
  const scale = useRef(new Animated.Value(1)).current;
  const checkScale = useRef(new Animated.Value(1)).current;

  const themeKey = isDark ? 'dark' : 'light';
  const priorityStyle = priorityColors[note.priority][themeKey];
  const statusStyle = noteStatusColors[note.status][themeKey];

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const handleToggleStatus = () => {
    if (note.status === 'info' || !onToggleStatus) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.sequence([
      Animated.spring(checkScale, {
        toValue: 1.2,
        useNativeDriver: true,
      }),
      Animated.spring(checkScale, {
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start();

    const newStatus = note.status === 'pending' ? 'completed' : 'pending';
    onToggleStatus(note.id, newStatus);
  };

  const handleTogglePin = () => {
    if (!onTogglePin) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onTogglePin(note.id, !note.is_pinned);
  };

  const handleEdit = () => {
    if (!onEdit) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onEdit(note);
  };

  const handleDelete = () => {
    if (!onDelete) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onDelete(note.id);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('sk-SK', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getPriorityLabel = () => {
    switch (note.priority) {
      case 'high':
        return 'Vysoka';
      case 'low':
        return 'Nizka';
      default:
        return null;
    }
  };

  const getStatusIcon = () => {
    if (note.status === 'info') {
      return <Info size={18} color={colors.info} />;
    }
    if (note.status === 'completed') {
      return (
        <Animated.View style={{ transform: [{ scale: checkScale }] }}>
          <CheckCircle size={18} color={colors.success} />
        </Animated.View>
      );
    }
    return (
      <Animated.View style={{ transform: [{ scale: checkScale }] }}>
        <Circle size={18} color={colors.textMuted} />
      </Animated.View>
    );
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handleEdit}
        style={[
          styles.container,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            shadowColor: colors.shadowColor,
          },
        ]}
      >
      {/* Header with badges */}
      <View style={styles.header}>
        <View style={styles.badges}>
          {/* Pinned badge */}
          {note.is_pinned && (
            <Pressable
              onPress={handleTogglePin}
              style={[
                styles.badge,
                { backgroundColor: colors.primaryLight, borderColor: colors.primary },
              ]}
            >
              <Pin size={12} color={colors.primary} />
              <Text style={[styles.badgeText, { color: colors.primary }]}>
                Pripnute
              </Text>
            </Pressable>
          )}

          {/* Priority badge (only for high/low) */}
          {getPriorityLabel() && (
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: priorityStyle.bg,
                  borderColor: priorityStyle.border,
                },
              ]}
            >
              {note.priority === 'high' && (
                <AlertTriangle size={12} color={priorityStyle.text} />
              )}
              <Text style={[styles.badgeText, { color: priorityStyle.text }]}>
                {getPriorityLabel()}
              </Text>
            </View>
          )}

          {/* Status badge for info notes */}
          {note.status === 'info' && (
            <View
              style={[
                styles.badge,
                { backgroundColor: statusStyle.bg, borderColor: statusStyle.border },
              ]}
            >
              <Info size={12} color={statusStyle.text} />
              <Text style={[styles.badgeText, { color: statusStyle.text }]}>
                Info
              </Text>
            </View>
          )}
        </View>

        {/* Checkbox / Status toggle */}
        {note.status !== 'info' && (
          <Pressable
            onPress={handleToggleStatus}
            style={styles.checkButton}
            hitSlop={8}
          >
            {getStatusIcon()}
          </Pressable>
        )}
      </View>

      {/* Content */}
      <Text
        style={[
          styles.content,
          { color: colors.text },
          note.status === 'completed' && styles.contentCompleted,
        ]}
      >
        {note.content}
      </Text>

      {/* Footer with meta and actions */}
      {showMeta && (
        <View style={styles.footer}>
          <View style={styles.meta}>
            <Text style={[styles.metaText, { color: colors.textMuted }]}>
              {formatDate(note.created_at)}
              {installmentNumber && ` · Splatka #${installmentNumber}`}
            </Text>
          </View>

          <View style={styles.actions}>
            {!note.is_pinned && onTogglePin && (
              <Pressable
                onPress={handleTogglePin}
                style={styles.actionButton}
                hitSlop={8}
              >
                <Pin size={16} color={colors.textMuted} />
              </Pressable>
            )}
            {onEdit && (
              <Pressable
                onPress={handleEdit}
                style={styles.actionButton}
                hitSlop={8}
              >
                <Pencil size={16} color={colors.textMuted} />
              </Pressable>
            )}
            {onDelete && (
              <Pressable
                onPress={handleDelete}
                style={styles.actionButton}
                hitSlop={8}
              >
                <Trash2 size={16} color={colors.danger} />
              </Pressable>
            )}
          </View>
        </View>
      )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    flex: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    gap: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  checkButton: {
    padding: 4,
    marginLeft: 8,
  },
  content: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  contentCompleted: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'transparent',
  },
  meta: {
    flex: 1,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    padding: 4,
  },
});
