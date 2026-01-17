import React from 'react';
import {
  Pencil,
  Trash2,
  Copy,
  FileText,
  Eye,
} from 'lucide-react-native';
import { ActionSheet, ActionItem } from '../common/ActionSheet';
import { useTheme } from '../../contexts';

interface IncomeActionSheetProps {
  visible: boolean;
  incomeName: string;
  incomeAmount?: string;
  onView: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onCreateTemplate: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export function IncomeActionSheet({
  visible,
  incomeName,
  incomeAmount,
  onView,
  onEdit,
  onDuplicate,
  onCreateTemplate,
  onDelete,
  onClose,
}: IncomeActionSheetProps) {
  const { theme } = useTheme();
  const colors = theme.colors;

  const actions: ActionItem[] = [
    {
      id: 'view',
      label: 'Zobrazit detail',
      icon: <Eye size={22} color={colors.primary} />,
      onPress: onView,
    },
    {
      id: 'edit',
      label: 'Upravit prijem',
      icon: <Pencil size={22} color={colors.primary} />,
      onPress: onEdit,
    },
    {
      id: 'duplicate',
      label: 'Duplikovat',
      icon: <Copy size={22} color={colors.primary} />,
      onPress: onDuplicate,
    },
    {
      id: 'template',
      label: 'Vytvorit sablonu',
      icon: <FileText size={22} color={colors.primary} />,
      onPress: onCreateTemplate,
    },
    {
      id: 'delete',
      label: 'Zmazat prijem',
      icon: <Trash2 size={22} color={colors.danger} />,
      onPress: onDelete,
      destructive: true,
    },
  ];

  return (
    <ActionSheet
      visible={visible}
      title={incomeName}
      subtitle={incomeAmount}
      actions={actions}
      onClose={onClose}
    />
  );
}
