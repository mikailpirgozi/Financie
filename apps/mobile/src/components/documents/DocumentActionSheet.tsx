import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  Platform,
  Animated,
} from 'react-native';
import { Edit3, Trash2, X, RefreshCw, FileText } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../contexts/ThemeContext';

export interface ActionSheetAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

interface DocumentActionSheetProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  onEdit: () => void;
  onExtend: () => void;
  onViewFiles?: () => void;
  onDelete: () => void;
  hasFiles?: boolean;
  canExtend?: boolean;
}

export function DocumentActionSheet({
  visible,
  title,
  subtitle,
  onClose,
  onEdit,
  onExtend,
  onViewFiles,
  onDelete,
  hasFiles = false,
  canExtend = true,
}: DocumentActionSheetProps) {
  const { theme } = useTheme();
  const colors = theme.colors;
  
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(300)).current;

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
          toValue: 300,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleAction = (action: () => void) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
    // Small delay to let the sheet close animation start
    setTimeout(action, 100);
  };

  const actions: ActionSheetAction[] = [
    {
      id: 'edit',
      label: 'Upraviť',
      icon: <Edit3 size={20} color={colors.text} />,
      onPress: () => handleAction(onEdit),
    },
    ...(canExtend ? [{
      id: 'extend',
      label: 'Predĺžiť platnosť',
      icon: <RefreshCw size={20} color={colors.primary} />,
      onPress: () => handleAction(onExtend),
    }] : []),
    ...(hasFiles && onViewFiles ? [{
      id: 'viewFiles',
      label: 'Zobraziť dokumenty',
      icon: <FileText size={20} color={colors.text} />,
      onPress: () => handleAction(onViewFiles),
    }] : []),
    {
      id: 'delete',
      label: 'Odstrániť',
      icon: <Trash2 size={20} color="#ef4444" />,
      onPress: () => handleAction(onDelete),
      destructive: true,
    },
  ];

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <Animated.View style={[styles.backdrop, { opacity }]}>
          <Pressable style={styles.backdropPress} onPress={onClose} />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            { backgroundColor: colors.surface },
            { transform: [{ translateY }] },
          ]}
        >
          {/* Handle */}
          <View style={styles.handleContainer}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
                {title}
              </Text>
              {subtitle && (
                <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                  {subtitle}
                </Text>
              )}
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <X size={24} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            {actions.map((action) => (
              <Pressable
                key={action.id}
                onPress={action.onPress}
                disabled={action.disabled}
                style={({ pressed }) => [
                  styles.actionItem,
                  { backgroundColor: pressed ? colors.surfacePressed : 'transparent' },
                  action.disabled && styles.actionDisabled,
                ]}
              >
                <View style={styles.actionIcon}>
                  {action.icon}
                </View>
                <Text
                  style={[
                    styles.actionLabel,
                    { color: action.destructive ? '#ef4444' : colors.text },
                    action.disabled && { color: colors.textMuted },
                  ]}
                >
                  {action.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Cancel Button */}
          <View style={[styles.cancelContainer, { borderTopColor: colors.border }]}>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.cancelButton,
                { backgroundColor: pressed ? colors.surfacePressed : colors.background },
              ]}
            >
              <Text style={[styles.cancelText, { color: colors.text }]}>
                Zrušiť
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  backdropPress: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
  actions: {
    paddingHorizontal: 8,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    marginHorizontal: 4,
    marginBottom: 4,
    gap: 14,
  },
  actionIcon: {
    width: 24,
    alignItems: 'center',
  },
  actionLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  actionDisabled: {
    opacity: 0.5,
  },
  cancelContainer: {
    paddingHorizontal: 12,
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: 1,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
