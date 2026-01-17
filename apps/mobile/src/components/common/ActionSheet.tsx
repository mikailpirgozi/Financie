import React, { useEffect, useRef, ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../contexts';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface ActionItem {
  id: string;
  label: string;
  icon: ReactNode;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

interface ActionSheetProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  actions: ActionItem[];
  onClose: () => void;
}

export function ActionSheet({
  visible,
  title,
  subtitle,
  actions,
  onClose,
}: ActionSheetProps) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const insets = useSafeAreaInsets();

  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          damping: 20,
          stiffness: 150,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: SCREEN_HEIGHT,
          useNativeDriver: true,
          damping: 20,
          stiffness: 150,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, backdropAnim]);

  const handleAction = (action: ActionItem) => {
    if (action.disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    action.onPress();
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        {/* Backdrop */}
        <TouchableWithoutFeedback onPress={handleClose}>
          <Animated.View
            style={[
              styles.backdrop,
              {
                opacity: backdropAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.5],
                }),
              },
            ]}
          />
        </TouchableWithoutFeedback>

        {/* Sheet */}
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              paddingBottom: insets.bottom + 16,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Handle */}
          <View style={styles.handleContainer}>
            <View style={[styles.handle, { backgroundColor: colors.textMuted }]} />
          </View>

          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={styles.headerContent}>
              <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
              {subtitle && (
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                  {subtitle}
                </Text>
              )}
            </View>
            <Pressable
              onPress={handleClose}
              style={[styles.closeButton, { backgroundColor: colors.surfacePressed }]}
            >
              <X size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* Actions List */}
          <View style={styles.actionsList}>
            {actions.map((action, index) => (
              <Pressable
                key={action.id}
                onPress={() => handleAction(action)}
                disabled={action.disabled}
                style={({ pressed }) => [
                  styles.actionItem,
                  {
                    backgroundColor: pressed
                      ? colors.surfacePressed
                      : colors.surface,
                    opacity: action.disabled ? 0.5 : 1,
                  },
                  index === actions.length - 1 &&
                    action.destructive &&
                    styles.actionItemLast,
                ]}
              >
                <View style={styles.actionIcon}>{action.icon}</View>
                <Text
                  style={[
                    styles.actionLabel,
                    { color: action.destructive ? colors.danger : colors.text },
                  ]}
                >
                  {action.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
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
    backgroundColor: '#000',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: SCREEN_HEIGHT * 0.85,
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    marginBottom: 8,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  actionsList: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4,
  },
  actionItemLast: {
    marginTop: 8,
    marginBottom: 0,
  },
  actionIcon: {
    width: 40,
    alignItems: 'center',
  },
  actionLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
});
