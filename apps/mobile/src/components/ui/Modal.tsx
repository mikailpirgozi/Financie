import React from 'react';
import {
  View,
  Text,
  Modal as RNModal,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  dismissable?: boolean;
  showBackdrop?: boolean;
}

/**
 * Simple modal without animations (per user request)
 */
export function Modal({
  visible,
  onClose,
  children,
  title,
  dismissable = true,
  showBackdrop = true,
}: ModalProps) {
  const handleClose = () => {
    if (dismissable) {
      onClose();
    }
  };

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        {showBackdrop && (
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={handleClose}
          >
            <View style={styles.backdrop} />
          </TouchableOpacity>
        )}

        <View style={styles.modal}>
          <View style={styles.handle} />
          {title && (
            <View style={styles.titleContainer}>
              <Text style={styles.title}>{title}</Text>
            </View>
          )}
          <ScrollView
            bounces={false}
            showsVerticalScrollIndicator={false}
            style={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modal: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#d1d5db',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  titleContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
});
