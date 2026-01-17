import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { FileText, Image, Trash2, ExternalLink } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../contexts/ThemeContext';

interface DocumentListItemProps {
  id: string;
  name: string;
  documentType: string;
  documentTypeLabel: string;
  filePath: string;
  fileSize?: number;
  mimeType?: string;
  createdAt?: string;
  onDelete?: (id: string) => void;
  onView?: (filePath: string) => void;
  showType?: boolean;
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('sk-SK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getFileIcon(mimeType?: string): 'pdf' | 'image' {
  if (mimeType?.startsWith('image/')) return 'image';
  return 'pdf';
}

export function DocumentListItem({
  id,
  name,
  documentType: _documentType,
  documentTypeLabel,
  filePath,
  fileSize,
  mimeType,
  createdAt,
  onDelete,
  onView,
  showType = true,
}: DocumentListItemProps) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const iconType = getFileIcon(mimeType);

  const handleView = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (onView) {
      onView(filePath);
      return;
    }

    // Check if filePath is valid
    if (!filePath || filePath.trim() === '') {
      Alert.alert('Info', 'Dokument nemá priradený súbor');
      return;
    }

    // Default: try to open URL
    try {
      const canOpen = await Linking.canOpenURL(filePath);
      if (canOpen) {
        await Linking.openURL(filePath);
      } else {
        Alert.alert('Chyba', 'Nie je možné otvoriť dokument');
      }
    } catch (error) {
      console.error('Error opening document:', error);
      Alert.alert('Chyba', 'Nepodarilo sa otvoriť dokument');
    }
  };

  const handleDelete = () => {
    if (!onDelete) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Zmazať dokument',
      `Naozaj chcete zmazať "${name}"?`,
      [
        { text: 'Zrušiť', style: 'cancel' },
        {
          text: 'Zmazať',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onDelete(id);
          },
        },
      ]
    );
  };

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={handleView}
      activeOpacity={0.7}
    >
      {/* Icon */}
      <View style={[styles.iconContainer, { backgroundColor: colors.primaryLight }]}>
        {iconType === 'image' ? (
          <Image size={20} color={colors.primary} />
        ) : (
          <FileText size={20} color={colors.primary} />
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
          {name}
        </Text>
        <View style={styles.metaRow}>
          {showType && (
            <Text style={[styles.type, { color: colors.textSecondary }]}>
              {documentTypeLabel}
            </Text>
          )}
          {fileSize && (
            <Text style={[styles.size, { color: colors.textMuted }]}>
              {formatFileSize(fileSize)}
            </Text>
          )}
          {createdAt && (
            <Text style={[styles.date, { color: colors.textMuted }]}>
              {formatDate(createdAt)}
            </Text>
          )}
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.surfacePressed }]}
          onPress={handleView}
        >
          <ExternalLink size={16} color={colors.primary} />
        </TouchableOpacity>
        
        {onDelete && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.error + '15' }]}
            onPress={handleDelete}
          >
            <Trash2 size={16} color={colors.error} />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  type: {
    fontSize: 12,
    fontWeight: '500',
  },
  size: {
    fontSize: 11,
  },
  date: {
    fontSize: 11,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
