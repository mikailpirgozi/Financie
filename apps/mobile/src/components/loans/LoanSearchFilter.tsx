import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
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
  ChevronDown,
  Check,
  ArrowUpDown,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../contexts';
import type { Loan } from '../../lib/api';

// Debounce hook for search input
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Loan type labels
const LOAN_TYPES = [
  { value: 'all', label: 'Všetky typy' },
  { value: 'annuity', label: 'Anuitný' },
  { value: 'fixed_principal', label: 'Fixná istina' },
  { value: 'interest_only', label: 'Interest-only' },
  { value: 'auto_loan', label: 'Auto úver' },
];

// Sort options - organized by category
const SORT_OPTIONS = [
  { value: 'next_payment', label: 'Najbližšia splátka', icon: '📅' },
  { value: 'overdue', label: 'Meškajúce najskôr', icon: '⚠️' },
  { value: 'name', label: 'Názov A-Z', icon: '🔤' },
  { value: 'name_desc', label: 'Názov Z-A', icon: '🔤' },
  { value: 'principal', label: 'Výška úveru ↓', icon: '💰' },
  { value: 'principal_asc', label: 'Výška úveru ↑', icon: '💰' },
  { value: 'balance', label: 'Zostatok ↓', icon: '📊' },
  { value: 'balance_asc', label: 'Zostatok ↑', icon: '📊' },
  { value: 'rate', label: 'Úrok ↓', icon: '📈' },
  { value: 'rate_asc', label: 'Úrok ↑', icon: '📈' },
  { value: 'progress', label: 'Pokrok splácania', icon: '✅' },
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

  // Local state for search input - prevents losing focus on each keystroke
  const [localSearchText, setLocalSearchText] = useState(filters.search);
  const isFirstRender = useRef(true);
  
  // Debounce the search text - only update parent after user stops typing
  const debouncedSearchText = useDebounce(localSearchText, 300);

  // Sync debounced search value to parent filters
  useEffect(() => {
    // Skip the first render to avoid unnecessary update
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    
    // Only update if the debounced value differs from filters
    if (debouncedSearchText !== filters.search) {
      onFiltersChange({ ...filters, search: debouncedSearchText });
    }
  }, [debouncedSearchText]);

  // Sync external filter changes to local state (e.g., when clearing filters)
  useEffect(() => {
    if (filters.search !== localSearchText && filters.search === '') {
      setLocalSearchText('');
    }
  }, [filters.search]);

  // Get unique lenders from loans
  const uniqueLenders = useMemo(() => {
    const lenders = new Set(loans.map((l) => l.lender));
    return ['all', ...Array.from(lenders)];
  }, [loans]);

  const handleSearchChange = useCallback((text: string) => {
    // Update local state immediately - no re-render of parent
    setLocalSearchText(text);
  }, []);

  const handleClearSearch = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLocalSearchText('');
    // Immediately update parent when clearing
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
    options: { value: string; label: string; icon?: string }[],
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
            {options.map((option) => {
              const isSelected = selectedValue === option.value ||
                (!selectedValue && option.value === 'all');
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionItem,
                    {
                      backgroundColor: isSelected
                        ? colors.primaryLight
                        : 'transparent',
                    },
                  ]}
                  onPress={() => onSelect(option.value)}
                >
                  <View style={styles.optionContent}>
                    {option.icon && (
                      <Text style={styles.optionIcon}>{option.icon}</Text>
                    )}
                    <Text
                      style={[
                        styles.optionText,
                        {
                          color: isSelected ? colors.primary : colors.text,
                        },
                      ]}
                    >
                      {option.label}
                    </Text>
                  </View>
                  {isSelected && (
                    <Check size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );

  // Get current sort option label
  const currentSortLabel = SORT_OPTIONS.find((s) => s.value === filters.sortBy)?.label || 'Zoradiť';

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
          placeholder="Hľadať úver..."
          placeholderTextColor={colors.textMuted}
          value={localSearchText}
          onChangeText={handleSearchChange}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
        />
        {localSearchText.length > 0 && (
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
          {(filters.lender || filters.loanType) && (
            <View style={[styles.filterBadge, { backgroundColor: colors.primary }]}>
              <Text style={[styles.filterBadgeText, { color: colors.textInverse }]}>
                {(filters.lender ? 1 : 0) + (filters.loanType ? 1 : 0)}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Sort Selector - Always visible */}
      <View style={styles.sortRow}>
        <Text style={[styles.sortLabel, { color: colors.textSecondary }]}>
          Zoradiť:
        </Text>
        <TouchableOpacity
          style={[
            styles.sortSelector,
            {
              backgroundColor: colors.surfacePressed,
              borderColor: colors.border,
            },
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowSortPicker(true);
          }}
        >
          <ArrowUpDown size={14} color={colors.primary} />
          <Text style={[styles.sortSelectorText, { color: colors.text }]} numberOfLines={1}>
            {currentSortLabel}
          </Text>
          <ChevronDown size={14} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Advanced Filters (Lender & Loan Type) */}
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
              {filters.lender || 'Veriteľ'}
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
                'Typ úveru'}
            </Text>
            <ChevronDown
              size={14}
              color={filters.loanType ? colors.primary : colors.textMuted}
            />
          </TouchableOpacity>

          {/* Clear All Filters */}
          {(filters.lender || filters.loanType) && (
            <TouchableOpacity
              style={[styles.clearButton, { borderColor: colors.danger }]}
              onPress={handleClearAllFilters}
            >
              <X size={14} color={colors.danger} />
              <Text style={[styles.clearButtonText, { color: colors.danger }]}>
                Zrušiť
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Picker Modals */}
      {renderPickerModal(
        showLenderPicker,
        () => setShowLenderPicker(false),
        'Vybrať veriteľa',
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
        'Vybrať typ úveru',
        LOAN_TYPES,
        filters.loanType,
        handleTypeSelect
      )}

      {renderPickerModal(
        showSortPicker,
        () => setShowSortPicker(false),
        'Zoradiť podľa',
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
        // Sort by overdue count (most overdue first), then by days until next payment
        const aOverdue = a.overdue_count || 0;
        const bOverdue = b.overdue_count || 0;
        if (aOverdue !== bOverdue) return bOverdue - aOverdue;
        // Secondary sort: next payment date
        return (a.next_installment?.days_until ?? 999) - (b.next_installment?.days_until ?? 999);

      case 'next_payment':
        const aDays = a.next_installment?.days_until ?? 999;
        const bDays = b.next_installment?.days_until ?? 999;
        return aDays - bDays;

      case 'balance':
        return parseAmount(b.remaining_balance) - parseAmount(a.remaining_balance);

      case 'balance_asc':
        return parseAmount(a.remaining_balance) - parseAmount(b.remaining_balance);

      case 'principal':
        return parseAmount(b.principal) - parseAmount(a.principal);

      case 'principal_asc':
        return parseAmount(a.principal) - parseAmount(b.principal);

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
        return (a.name || a.lender).localeCompare(b.name || b.lender, 'sk');

      case 'name_desc':
        return (b.name || b.lender).localeCompare(a.name || a.lender, 'sk');

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
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  optionIcon: {
    fontSize: 16,
  },
  optionText: {
    fontSize: 15,
    fontWeight: '500',
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  sortLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  sortSelector: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  sortSelectorText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
});
