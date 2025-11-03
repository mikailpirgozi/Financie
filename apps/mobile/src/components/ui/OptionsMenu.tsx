import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TouchableWithoutFeedback,
  Platform,
  ActionSheetIOS,
} from 'react-native';
import * as Haptics from 'expo-haptics';

export interface MenuItem {
  label: string;
  icon?: string;
  onPress: () => void;
  destructive?: boolean;
}

interface OptionsMenuProps {
  options: MenuItem[];
  title?: string;
}

export function OptionsMenu({ options, title }: OptionsMenuProps) {
  const [visible, setVisible] = useState(false);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (Platform.OS === 'ios') {
      // iOS Action Sheet
      const optionLabels = options.map((opt) => opt.label);
      optionLabels.push('Zrušiť');

      const destructiveButtonIndex = options.findIndex((opt) => opt.destructive);
      const cancelButtonIndex = optionLabels.length - 1;

      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: optionLabels,
          destructiveButtonIndex: destructiveButtonIndex >= 0 ? destructiveButtonIndex : undefined,
          cancelButtonIndex,
          title,
        },
        (buttonIndex) => {
          if (buttonIndex < options.length) {
            options[buttonIndex]?.onPress();
          }
        }
      );
    } else {
      // Android - custom modal
      setVisible(true);
    }
  };

  const handleOptionPress = (option: MenuItem) => {
    setVisible(false);
    setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      option.onPress();
    }, 100);
  };

  return (
    <>
      <TouchableOpacity onPress={handlePress} style={styles.menuButton}>
        <Text style={styles.menuIcon}>⋮</Text>
      </TouchableOpacity>

      {Platform.OS === 'android' && (
        <Modal
          visible={visible}
          transparent
          animationType="fade"
          onRequestClose={() => setVisible(false)}
        >
          <TouchableWithoutFeedback onPress={() => setVisible(false)}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <View style={styles.modalContent}>
                  {title && <Text style={styles.modalTitle}>{title}</Text>}
                  {options.map((option, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.menuItem,
                        option.destructive && styles.menuItemDestructive,
                      ]}
                      onPress={() => handleOptionPress(option)}
                    >
                      {option.icon && (
                        <Text style={styles.menuItemIcon}>{option.icon}</Text>
                      )}
                      <Text
                        style={[
                          styles.menuItemText,
                          option.destructive && styles.menuItemTextDestructive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    style={[styles.menuItem, styles.cancelButton]}
                    onPress={() => setVisible(false)}
                  >
                    <Text style={styles.cancelText}>Zrušiť</Text>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  menuButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuIcon: {
    fontSize: 24,
    color: '#374151',
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  menuItemDestructive: {
    backgroundColor: '#fef2f2',
  },
  menuItemIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  menuItemText: {
    fontSize: 16,
    color: '#111827',
    flex: 1,
  },
  menuItemTextDestructive: {
    color: '#dc2626',
  },
  cancelButton: {
    marginTop: 8,
    backgroundColor: '#f3f4f6',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
    textAlign: 'center',
    flex: 1,
  },
});

