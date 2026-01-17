import React, { useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../contexts';
import { getCategoryColor } from '../../lib/theme';
import type { Expense } from '../../lib/api';

interface ExpenseListItemProps {
  expense: Expense;
  onPress: () => void;
  onLongPress?: () => void;
}

export function ExpenseListItem({
  expense,
  onPress,
  onLongPress,
}: ExpenseListItemProps) {
  const { theme, isDark } = useTheme();
  const colors = theme.colors;
  const scale = useRef(new Animated.Value(1)).current;

  // Get category color
  const categoryColor = getCategoryColor(
    expense.category?.name || expense.category_id,
    'expense',
    isDark
  );

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) return '0 €';
    return new Intl.NumberFormat('sk-SK', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('sk-SK', {
      day: 'numeric',
      month: 'short',
    });
  };

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

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const handleLongPress = () => {
    if (onLongPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onLongPress();
    }
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={handlePress}
        onLongPress={handleLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.container,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            shadowColor: colors.shadowColor,
          },
        ]}
      >
      {/* Category Color Indicator */}
      <View style={[styles.categoryIndicator, { backgroundColor: categoryColor }]} />

      {/* Content */}
      <View style={styles.content}>
        {/* Header Row */}
        <View style={styles.headerRow}>
          <View style={styles.titleSection}>
            <Text
              style={[styles.merchant, { color: colors.text }]}
              numberOfLines={1}
            >
              {expense.merchant || 'Vydavok'}
            </Text>
          </View>
          <ChevronRight size={20} color={colors.textMuted} />
        </View>

        {/* Details Row */}
        <View style={styles.detailsRow}>
          <Text style={[styles.date, { color: colors.textSecondary }]}>
            {formatDate(expense.date)}
          </Text>
          {expense.category?.name && (
            <>
              <Text style={[styles.separator, { color: colors.textMuted }]}>·</Text>
              <View
                style={[
                  styles.categoryBadge,
                  { backgroundColor: `${categoryColor}20`, borderColor: categoryColor },
                ]}
              >
                <Text style={[styles.categoryText, { color: categoryColor }]}>
                  {expense.category.name}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Amount */}
        <Text style={[styles.amount, { color: colors.expense }]}>
          -{formatCurrency(expense.amount)}
        </Text>

        {/* Note if exists */}
        {expense.note && (
          <Text
            style={[styles.note, { color: colors.textMuted }]}
            numberOfLines={1}
          >
            {expense.note}
          </Text>
        )}
      </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  categoryIndicator: {
    width: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  titleSection: {
    flex: 1,
    marginRight: 8,
  },
  merchant: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
    gap: 6,
  },
  date: {
    fontSize: 13,
    fontWeight: '500',
  },
  separator: {
    fontSize: 13,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
  },
  amount: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  note: {
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 4,
  },
});
