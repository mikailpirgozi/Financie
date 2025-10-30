import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import {
  Loan,
  simulateLoan,
  SimulationParams,
  SimulationResult,
  getLoan,
} from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';

const simulationSchema = z.object({
  new_rate: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : undefined))
    .refine((n) => n === undefined || (n > 0 && n < 100), 'Sadzba musí byť medzi 0 a 100%'),
  new_term: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : undefined))
    .refine((n) => n === undefined || n > 0, 'Počet mesiacov musí byť väčší ako 0'),
  extra_payment_monthly: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : undefined))
    .refine(
      (n) => n === undefined || n >= 0,
      'Mesačná nadplatba musí byť väčšia alebo rovná 0'
    ),
});

type SimulationFormData = z.infer<typeof simulationSchema>;

export default function SimulateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [loading, setLoading] = useState(false);
  const [loan, setLoan] = useState<Loan | null>(null);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    watch,
    setValue,
    formState: { errors },
  } = useForm<SimulationFormData>({
    resolver: zodResolver(simulationSchema),
    defaultValues: {
      new_rate: '',
      new_term: '',
      extra_payment_monthly: '',
    },
  });

  useEffect(() => {
    loadLoan();
  }, [id]);

  const loadLoan = async () => {
    if (!id) return;
    try {
      const { loan: loanData } = await getLoan(id);
      setLoan(loanData);
      // Set default values
      setValue('new_rate', loanData.annual_rate.toString());
      setValue('new_term', loanData.term_months.toString());
    } catch (err) {
      setError('Nepodarilo sa načítať údaje o úvere');
      console.error('Failed to load loan:', err);
    }
  };

  const handleSimulate = async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);

      const new_rate = watch('new_rate');
      const new_term = watch('new_term');
      const extra_payment_monthly = watch('extra_payment_monthly');

      const params: SimulationParams = {};
      if (new_rate !== undefined) params.new_rate = new_rate;
      if (new_term !== undefined) params.new_term = new_term;
      if (extra_payment_monthly !== undefined)
        params.extra_payment_monthly = extra_payment_monthly;

      const simulationResult = await simulateLoan(id, params);
      setResult(simulationResult);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Nepodarilo sa vypočítať simuláciu';
      setError(message);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Simulácia scenárov</Text>
        <Text style={styles.subtitle}>{loan?.lender}</Text>
      </View>

      {error && (
        <Card style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </Card>
      )}

      <View style={styles.content}>
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>⚙️ Zmeny na simuláciu</Text>

          <Input
            label="Nová úroková sadzba (%)"
            placeholder={loan?.annual_rate?.toString()}
            keyboardType="decimal-pad"
            value={watch('new_rate')?.toString() || ''}
            onChangeText={(value) => setValue('new_rate', value)}
            error={errors.new_rate?.message}
          />

          <Input
            label="Nová doba splácania (mesiace)"
            placeholder={loan?.term_months?.toString()}
            keyboardType="number-pad"
            value={watch('new_term')?.toString() || ''}
            onChangeText={(value) => setValue('new_term', value)}
            error={errors.new_term?.message}
          />

          <Input
            label="Mesačná nadplatba (€)"
            placeholder="0.00"
            keyboardType="decimal-pad"
            value={watch('extra_payment_monthly')?.toString() || ''}
            onChangeText={(value) => setValue('extra_payment_monthly', value)}
            error={errors.extra_payment_monthly?.message}
          />

          <Button
            onPress={handleSimulate}
            loading={loading}
            disabled={loading}
            fullWidth
            style={styles.simulateButton}
          >
            Spustiť simuláciu
          </Button>
        </Card>

        {result && (
          <>
            <View style={styles.comparisonHeader}>
              <Text style={styles.comparisonTitle}>📊 Porovnanie plánov</Text>
            </View>

            <View style={styles.comparisonRow}>
              <Card style={[styles.comparisonCard, styles.leftCard]}>
                <Text style={styles.comparisonCardTitle}>Pôvodný plán</Text>

                <ResultRow
                  label="Mesačná splátka"
                  value={formatCurrency(result.original.monthly_payment.toString())}
                />
                <ResultRow
                  label="Celkový úrok"
                  value={formatCurrency(result.original.total_interest.toString())}
                />
                <ResultRow
                  label="Celková suma"
                  value={formatCurrency(result.original.total_cost.toString())}
                />
              </Card>

              <Card style={[styles.comparisonCard, styles.rightCard]}>
                <Text style={styles.comparisonCardTitle}>Simulovaný plán</Text>

                <ResultRow
                  label="Mesačná splátka"
                  value={formatCurrency(result.simulated.monthly_payment.toString())}
                />
                <ResultRow
                  label="Celkový úrok"
                  value={formatCurrency(result.simulated.total_interest.toString())}
                />
                <ResultRow
                  label="Celková suma"
                  value={formatCurrency(result.simulated.total_cost.toString())}
                />
              </Card>
            </View>

            <Card style={styles.savingsCard}>
              <Text style={styles.savingsTitle}>💰 Vaša úspora</Text>

              <ResultRow
                label="Ušetrený úrok"
                value={formatCurrency(result.savings.interest_saved.toString())}
                highlight={result.savings.interest_saved > 0 ? 'positive' : 'negative'}
              />
              <ResultRow
                label="Skrátenie doby splácania"
                value={`${Math.abs(result.savings.time_saved_months)} mesiacov`}
                highlight={result.savings.time_saved_months > 0 ? 'positive' : 'negative'}
              />
            </Card>

            <Card style={styles.noteCard}>
              <Text style={styles.noteTitle}>💡 Poznámka</Text>
              <Text style={styles.noteText}>
                Toto je len názorná simulácia. Skutočné výsledky sa môžu líšiť na základe
                zmien úrokových sadzieb a ďalších faktorov.
              </Text>
            </Card>
          </>
        )}
      </View>

      <View style={styles.spacing} />
    </ScrollView>
  );
}

interface ResultRowProps {
  label: string;
  value: string;
  highlight?: 'positive' | 'negative' | 'neutral';
}

function ResultRow({ label, value, highlight = 'neutral' }: ResultRowProps) {
  const getValueColor = () => {
    switch (highlight) {
      case 'positive':
        return styles.positiveValue;
      case 'negative':
        return styles.negativeValue;
      default:
        return styles.neutralValue;
    }
  };

  return (
    <View style={styles.resultRow}>
      <Text style={styles.resultLabel}>{label}</Text>
      <Text style={[styles.resultValue, getValueColor()]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  errorCard: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#fee',
    borderColor: '#f55',
    borderWidth: 1,
  },
  errorText: {
    color: '#c00',
    fontSize: 14,
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#000',
  },
  simulateButton: {
    marginTop: 4,
  },
  comparisonHeader: {
    marginBottom: 12,
  },
  comparisonTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
  },
  comparisonRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  comparisonCard: {
    flex: 1,
    backgroundColor: '#f9fafb',
    padding: 12,
  },
  leftCard: {
    borderLeftColor: '#e5e7eb',
    borderLeftWidth: 3,
  },
  rightCard: {
    borderLeftColor: '#0ea5e9',
    borderLeftWidth: 3,
  },
  comparisonCardTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    color: '#666',
    textTransform: 'uppercase',
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  resultLabel: {
    fontSize: 12,
    color: '#666',
  },
  resultValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  neutralValue: {
    color: '#000',
  },
  positiveValue: {
    color: '#10b981',
  },
  negativeValue: {
    color: '#ef4444',
  },
  savingsCard: {
    backgroundColor: '#f0fdf4',
    borderColor: '#86efac',
    borderWidth: 1,
    marginBottom: 12,
    padding: 12,
  },
  savingsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#15803d',
  },
  noteCard: {
    backgroundColor: '#fffbeb',
    borderColor: '#fcd34d',
    borderWidth: 1,
    padding: 12,
  },
  noteTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    color: '#92400e',
  },
  noteText: {
    fontSize: 12,
    color: '#78350f',
    lineHeight: 16,
  },
  spacing: {
    height: 24,
  },
});
