import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { Badge } from './ui/Badge';
import Swipeable from 'react-native-gesture-handler/Swipeable';

interface InstallmentEntry {
  id: string;
  installment_no: number;
  due_date: string;
  principal_due: string;
  interest_due: string;
  fees_due: string;
  total_due: string;
  principal_balance_after: string;
  status: 'pending' | 'paid' | 'overdue';
  paid_at: string | null;
}

interface Props {
  entry: InstallmentEntry;
  onMarkPaid: (id: string) => void;
  formatCurrency: (amount: string | number) => string;
  formatDate: (date: string) => string;
}

export function ExpandableInstallmentCard({ entry, onMarkPaid, formatCurrency, formatDate }: Props) {
  const [expanded, setExpanded] = useState(false);

  const getStatusBadge = (status: string) => {
    if (status === 'paid') {
      return <Badge variant="success">Zaplatené</Badge>;
    }
    if (status === 'overdue') {
      return <Badge variant="warning">Po splatnosti</Badge>;
    }
    return <Badge variant="default">Nezaplatené</Badge>;
  };

  const renderRightActions = () => {
    if (entry.status === 'paid') return null;

    return (
      <TouchableOpacity
        style={styles.swipeAction}
        onPress={() => onMarkPaid(entry.id)}
        activeOpacity={0.7}
      >
        <Text style={styles.swipeActionIcon}>✓</Text>
        <Text style={styles.swipeActionText}>Uhradiť</Text>
      </TouchableOpacity>
    );
  };

  const cardContent = (
    <TouchableOpacity
      style={[
        styles.card,
        entry.status === 'overdue' && styles.cardOverdue,
        entry.status === 'paid' && styles.cardPaid,
      ]}
      onPress={() => setExpanded(!expanded)}
      activeOpacity={0.7}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.installmentNumber}>#{entry.installment_no}</Text>
          <Text style={styles.dueDate}>{formatDate(entry.due_date)}</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.totalAmount}>{formatCurrency(entry.total_due)}</Text>
          {getStatusBadge(entry.status)}
        </View>
      </View>

      {/* Expanded Details */}
      {expanded && (
        <View style={styles.details}>
          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Istina</Text>
            <Text style={styles.detailValue}>{formatCurrency(entry.principal_due)}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Úrok</Text>
            <Text style={styles.detailValue}>{formatCurrency(entry.interest_due)}</Text>
          </View>

          {parseFloat(entry.fees_due) > 0 && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Poplatky</Text>
              <Text style={styles.detailValue}>{formatCurrency(entry.fees_due)}</Text>
            </View>
          )}

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabelBold}>Zostatok po splátke</Text>
            <Text style={styles.detailValueBold}>
              {formatCurrency(entry.principal_balance_after)}
            </Text>
          </View>

          {entry.paid_at && (
            <View style={styles.paidInfo}>
              <Text style={styles.paidInfoText}>
                Uhradené: {formatDate(entry.paid_at)}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Expand Icon */}
      <View style={styles.expandIcon}>
        {expanded ? (
          <ChevronUp size={20} color="#9ca3af" />
        ) : (
          <ChevronDown size={20} color="#9ca3af" />
        )}
      </View>
    </TouchableOpacity>
  );

  if (entry.status === 'paid') {
    return cardContent;
  }

  return (
    <Swipeable renderRightActions={renderRightActions} overshootRight={false}>
      {cardContent}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardOverdue: {
    borderColor: '#fbbf24',
    backgroundColor: '#fffbeb',
  },
  cardPaid: {
    opacity: 0.7,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  installmentNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#8b5cf6',
    marginBottom: 4,
  },
  dueDate: {
    fontSize: 14,
    color: '#6b7280',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  details: {
    marginTop: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  detailLabelBold: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  detailValueBold: {
    fontSize: 15,
    fontWeight: '700',
    color: '#8b5cf6',
  },
  paidInfo: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#f0fdf4',
    borderRadius: 6,
  },
  paidInfoText: {
    fontSize: 12,
    color: '#16a34a',
    textAlign: 'center',
  },
  expandIcon: {
    position: 'absolute',
    right: 16,
    top: '50%',
    marginTop: -10,
  },
  swipeAction: {
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    marginBottom: 12,
    borderRadius: 12,
  },
  swipeActionIcon: {
    fontSize: 24,
    color: '#fff',
    marginBottom: 4,
  },
  swipeActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
});

