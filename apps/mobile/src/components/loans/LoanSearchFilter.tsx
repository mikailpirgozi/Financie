import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
} from 'react-native';
import {
  Search,
  X,
  SlidersHorizontal,
  Building2,
  CreditCard,
  Percent,
  ChevronDown,
  Check,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../contexts';
import type { Loan } from '../../lib/api';

// Loan type labels
const LOAN_TYPES = [
  { value: 'all', label: 'Všetky typy' },
  { value: 'annuity', label: 'Anuitný' },
  { value: 'fixed_principal', label: 'Fixná istina' },
  { value: 'interest_only', label: 'Interest-only' },
  { value: 'auto_loan', label: 'Auto úver' },
];

// Sort options
const SORT_OPTIONS = [
  { value: 'next_payment', label: 'Najbližšia splátka' },
  { value: 'balance', label: 'Zostatok (najvyšší)' },
  { value: 'balance_asc', label: 'Zostatok (najnižší)' },
  { value: 'rate', label: 'Úrok (najvyšší)' },
  { value: 'rate_asc', label: 'Úrok (najnižší)' },
  { value: 'overdue', label: 'Po splatnosti' },
  { value: 'progress', label: 'Pokrok (najvyšší)' },
  { value: 'name', label: 'Názov A-Z' },
];

export interface LoanFilters {
  search: string;
  lender: string | null;
  loanType: string | null;
  sortBy: string;
}

interface LoanSearchFilterProps {
  loans: Loan[];
  filters: LoanFilters;
  onFiltersChange: (filters: LoanFilters) => void;
}

export function LoanSearchFilter({
  loans,
  filters,
  onFiltersChange,
}: LoanSearchFilterProps) {
  const { theme } = useTheme();
  const colors = theme.colors;

  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showLenderPicker, setShowLenderPicker] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showSortPicker, setShowSortPicker] = useState(false);

  // Get unique lenders from loans
  const uniqueLenders = useMemo(() => {
    const lenders = new Set(loans.map((l) => l.lender));
    return ['all', ...Array.from(lenders)];
  }, [loans]);

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.lender) count++;
    if (filters.loanType) count++;
    if (filters.sortBy !== 'next_payment') count++;
    return count;
  }, [filters]);

  const handleSearchChange = useCallback(
    (text: string) => {
      onFiltersChange({ ...filters, search: text });
    },
    [filters, onFiltersChange]
  );

  const handleClearSearch = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onFiltersChange({ ...filters, search: '' });
  }, [filters, onFiltersChange]);

  const handleLenderSelect = useCallback(
    (lender: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onFiltersChange({
        ...filters,
        lender: lender === 'all' ? null : lender,
      });
      setShowLenderPicker(false);
    },
    [filters, onFiltersChange]
  );

  const handleTypeSelect = useCallback(
    (type: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onFiltersChange({
        ...filters,
        loanType: type === 'all' ? null : type,
      });
      setShowTypePicker(false);
    },
    [filters, onFiltersChange]
  );

  const handleSortSelect = useCallback(
    (sort: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onFiltersChange({ ...filters, sortBy: sort });
      setShowSortPicker(false);
    },
    [filters, onFiltersChange]
  );

  const handleClearAllFilters = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onFiltersChange({
      search: '',
      lender: null,
      loanType: null,
      sortBy: 'next_payment',
    });
  }, [onFiltersChange]);

  const renderPickerModal = (
    visible: boolean,
    onClose: () => void,
    title: string,
    options: { value: string; label: string }[],
    selectedValue: string | null,
    onSelect: (value: string) => void
  ) => (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable
          style={[styles.modalContent, { backgroundColor: colors.surface }]}
        >
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {title}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.optionsList}>
            {options.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionItem,
                  {
                    backgroundColor:
                      (selectedValue === option.value ||
                        (!selectedValue && option.value === 'all'))
                        ? colors.primaryLight
                        : 'transparent',
                  },
                ]}
                onPress={() => onSelect(option.value)}
              >
                <Text
                  style={[
                    styles.optionText,
                    {
                      color:
                        (selectedValue === option.value ||
                          (!selectedValue && option.value === 'all'))
                          ? colors.primary
                          : colors.text,
                    },
                  ]}
                >
                  {option.label}
                </Text>
                {(selectedValue === option.value ||
                  (!selectedValue && option.value === 'all')) && (
                  <Check size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View
        style={[
          styles.searchBar,
          {
            backgroundColor: colors.surfacePressed,
            borderColor: colors.border,
          },
        ]}
      >
        <Search size={20} color={colors.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Hladat uver..."
          placeholderTextColor={colors.textMuted}
          value={filters.search}
          onChangeText={handleSearchChange}
          returnKeyType="search"
        />
        {filters.search.length > 0 && (
          <TouchableOpacity onPress={handleClearSearch}>
            <X size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[
            styles.filterButton,
            {
              backgroundColor: showAdvancedFilters
                ? colors.primary
                : colors.surface,
              borderColor: showAdvancedFilters ? colors.primary : colors.border,
            },
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowAdvancedFilters(!showAdvancedFilters);
          }}
        >
          <SlidersHorizontal
            size={18}
            color={showAdvancedFilters ? colors.textInverse : colors.textSecondary}
          />
          {activeFiltersCount > 0 && (
            <View style={[styles.filterBadge, { backgroundColor: colors.primary }]}>
              <Text style={[styles.filterBadgeText, { color: colors.textInverse }]}>
                {activeFiltersCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Advanced Filters */}
      {showAdvancedFilters && (
        <View style={styles.advancedFilters}>
          {/* Lender Filter */}
          <TouchableOpacity
            style={[
              styles.filterPill,
              {
                backgroundColor: filters.lender
                  ? colors.primaryLight
                  : colors.surfacePressed,
                borderColor: filters.lender ? colors.primary : colors.border,
              },
            ]}
            onPress={() => setShowLenderPicker(true)}
          >
            <Building2
              size={14}
              color={filters.lender ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                styles.filterPillText,
                { color: filters.lender ? colors.primary : colors.textSecondary },
              ]}
              numberOfLines={1}
            >
              {filters.lender || 'Veritel'}
            </Text>
            <ChevronDown
              size={14}
              color={filters.lender ? colors.primary : colors.textMuted}
            />
          </TouchableOpacity>

          {/* Loan Type Filter */}
          <TouchableOpacity
            style={[
              styles.filterPill,
              {
                backgroundColor: filters.loanType
                  ? colors.primaryLight
                  : colors.surfacePressed,
                borderColor: filters.loanType ? colors.primary : colors.border,
              },
            ]}
            onPress={() => setShowTypePicker(true)}
          >
            <CreditCard
              size={14}
              color={filters.loanType ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                styles.filterPillText,
                { color: filters.loanType ? colors.primary : colors.textSecondary },
              ]}
              numberOfLines={1}
            >
              {LOAN_TYPES.find((t) => t.value === filters.loanType)?.label ||
                'Typ uveru'}
            </Text>
            <ChevronDown
              size={14}
              color={filters.loanType ? colors.primary : colors.textMuted}
            />
          </TouchableOpacity>

          {/* Sort */}
          <TouchableOpacity
            style={[
              styles.filterPill,
              {
                backgroundColor:
                  filters.sortBy !== 'next_payment'
                    ? colors.primaryLight
                    : colors.surfacePressed,
                borderColor:
                  filters.sortBy !== 'next_payment'
                    ? colors.primary
                    : colors.border,
              },
            ]}
            onPress={() => setShowSortPicker(true)}
          >
            <Percent
              size={14}
              color={
                filters.sortBy !== 'next_payment'
                  ? colors.primary
                  : colors.textSecondary
              }
            />
            <Text
              style={[
                styles.filterPillText,
                {
                  color:
                    filters.sortBy !== 'next_payment'
                      ? colors.primary
                      : colors.textSecondary,
                },
              ]}
              numberOfLines={1}
            >
              {SORT_OPTIONS.find((s) => s.value === filters.sortBy)?.label ||
                'Zoradit'}
            </Text>
            <ChevronDown
              size={14}
              color={
                filters.sortBy !== 'next_payment'
                  ? colors.primary
                  : colors.textMuted
              }
            />
          </TouchableOpacity>

          {/* Clear All */}
          {activeFiltersCount > 0 && (
            <TouchableOpacity
              style={[styles.clearButton, { borderColor: colors.danger }]}
              onPress={handleClearAllFilters}
            >
              <X size={14} color={colors.danger} />
              <Text style={[styles.clearButtonText, { color: colors.danger }]}>
                Zrusit
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Picker Modals */}
      {renderPickerModal(
        showLenderPicker,
        () => setShowLenderPicker(false),
        'Vyber veritela',
        uniqueLenders.map((l) => ({
          value: l,
          label: l === 'all' ? 'Všetci veritelia' : l,
        })),
        filters.lender,
        handleLenderSelect
      )}

      {renderPickerModal(
        showTypePicker,
        () => setShowTypePicker(false),
        'Vyber typ uveru',
        LOAN_TYPES,
        filters.loanType,
        handleTypeSelect
      )}

      {renderPickerModal(
        showSortPicker,
        () => setShowSortPicker(false),
        'Zoradit podla',
        SORT_OPTIONS,
        filters.sortBy,
        handleSortSelect
      )}
    </View>
  );
}

// Filter and sort loans based on filters
export function filterAndSortLoans(
  loans: Loan[],
  filters: LoanFilters
): Loan[] {
  let filtered = [...loans];

  // Search filter
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    filtered = filtered.filter(
      (loan) =>
        loan.name?.toLowerCase().includes(searchLower) ||
        loan.lender.toLowerCase().includes(searchLower)
    );
  }

  // Lender filter
  if (filters.lender) {
    filtered = filtered.filter((loan) => loan.lender === filters.lender);
  }

  // Loan type filter
  if (filters.loanType) {
    filtered = filtered.filter((loan) => loan.loan_type === filters.loanType);
  }

  // Sort
  const parseAmount = (val: number | string | undefined): number => {
    if (val === undefined || val === null) return 0;
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return isNaN(num) ? 0 : num;
  };

  filtered.sort((a, b) => {
    switch (filters.sortBy) {
      case 'overdue':
        return (b.overdue_count || 0) - (a.overdue_count || 0);

      case 'next_payment':
        const aDays = a.next_installment?.days_until ?? 999;
        const bDays = b.next_installment?.days_until ?? 999;
        return aDays - bDays;

      case 'balance':
        return parseAmount(b.remaining_balance) - parseAmount(a.remaining_balance);

      case 'balance_asc':
        return parseAmount(a.remaining_balance) - parseAmount(b.remaining_balance);

      case 'rate':
        return parseAmount(b.annual_rate) - parseAmount(a.annual_rate);

      case 'rate_asc':
        return parseAmount(a.annual_rate) - parseAmount(b.annual_rate);

      case 'progress': {
        const aProgress =
          parseAmount(a.amount_paid) /
          (parseAmount(a.principal) || 1);
        const bProgress =
          parseAmount(b.amount_paid) /
          (parseAmount(b.principal) || 1);
        return bProgress - aProgress;
      }

      case 'name':
        return (a.name || a.lender).localeCompare(b.name || b.lender);

      default:
        return 0;
    }
  });

  return filtered;
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  filterButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  advancedFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
    maxWidth: 140,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 4,
  },
  clearButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  optionsList: {
    padding: 12,
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 4,
  },
  optionText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
