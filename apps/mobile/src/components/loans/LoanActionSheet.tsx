import React from 'react';
import {
  CreditCard,
  StickyNote,
  BarChart3,
  Pencil,
  Link2,
  Zap,
  Trash2,
} from 'lucide-react-native';
import { ActionSheet, ActionItem } from '../common/ActionSheet';
import { useTheme } from '../../contexts';

interface LoanActionSheetProps {
  visible: boolean;
  loanName: string;
  loanLender?: string;
  onPayment: () => void;
  onAddNote: () => void;
  onViewStats: () => void;
  onEdit: () => void;
  onLinkAsset: () => void;
  onEarlyRepay: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export function LoanActionSheet({
  visible,
  loanName,
  loanLender,
  onPayment,
  onAddNote,
  onViewStats,
  onEdit,
  onLinkAsset,
  onEarlyRepay,
  onDelete,
  onClose,
}: LoanActionSheetProps) {
  const { theme } = useTheme();
  const colors = theme.colors;

  const actions: ActionItem[] = [
    {
      id: 'payment',
      label: 'Zaplatit splatku',
      icon: <CreditCard size={22} color={colors.primary} />,
      onPress: onPayment,
    },
    {
      id: 'note',
      label: 'Pridat poznamku',
      icon: <StickyNote size={22} color={colors.primary} />,
      onPress: onAddNote,
    },
    {
      id: 'stats',
      label: 'Simulovat scenare',
      icon: <BarChart3 size={22} color={colors.primary} />,
      onPress: onViewStats,
    },
    {
      id: 'link',
      label: 'Prepojit s majetkom',
      icon: <Link2 size={22} color={colors.primary} />,
      onPress: onLinkAsset,
    },
    {
      id: 'early',
      label: 'Predcasne splatit',
      icon: <Zap size={22} color={colors.warning} />,
      onPress: onEarlyRepay,
    },
    {
      id: 'edit',
      label: 'Upravit uver',
      icon: <Pencil size={22} color={colors.textSecondary} />,
      onPress: onEdit,
    },
    {
      id: 'delete',
      label: 'Zmazat uver',
      icon: <Trash2 size={22} color={colors.danger} />,
      onPress: onDelete,
      destructive: true,
    },
  ];

  return (
    <ActionSheet
      visible={visible}
      title={loanName}
      subtitle={loanLender}
      actions={actions}
      onClose={onClose}
    />
  );
}
