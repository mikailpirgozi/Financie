import React from 'react';
import {
  Pencil,
  Trash2,
  Copy,
  Tag,
  Eye,
} from 'lucide-react-native';
import { ActionSheet, ActionItem } from '../common/ActionSheet';
import { useTheme } from '../../contexts';

interface ExpenseActionSheetProps {
  visible: boolean;
  expenseName: string;
  expenseAmount?: string;
  onView: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onChangeCategory: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export function ExpenseActionSheet({
  visible,
  expenseName,
  expenseAmount,
  onView,
  onEdit,
  onDuplicate,
  onChangeCategory,
  onDelete,
  onClose,
}: ExpenseActionSheetProps) {
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
      label: 'Upravit vydavok',
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
      id: 'category',
      label: 'Zmenit kategoriu',
      icon: <Tag size={22} color={colors.primary} />,
      onPress: onChangeCategory,
    },
    {
      id: 'delete',
      label: 'Zmazat vydavok',
      icon: <Trash2 size={22} color={colors.danger} />,
      onPress: onDelete,
      destructive: true,
    },
  ];

  return (
    <ActionSheet
      visible={visible}
      title={expenseName}
      subtitle={expenseAmount}
      actions={actions}
      onClose={onClose}
    />
  );
}
