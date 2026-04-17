import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@/lib/form';
import { z } from 'zod';

import { Loan, simulateLoan, SimulationParams, SimulationResult, getLoan } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { NumericInput } from '@/components/forms/NumericInput';

const simulationSchema = z.object({
  new_rate: z
    .number()
    .min(0, 'Sadzba musí byť väčšia alebo rovná 0')
    .max(100, 'Sadzba musí byť menšia ako 100%')
    .nullable()
    .optional(),
  new_term: z.number().int().positive('Počet mesiacov musí byť väčší ako 0').nullable().optional(),
  extra_payment_monthly: z
    .number()
    .min(0, 'Mesačná nadplatba musí byť väčšia alebo rovná 0')
    .nullable()
    .optional(),
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
      new_rate: null,
      new_term: null,
      extra_payment_monthly: null,
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
      setValue('new_rate', Number(loanData.annual_rate));
      setValue('new_term', Number(loanData.term_months));
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
      if (new_rate !== null && new_rate !== undefined) params.new_rate = new_rate;
      if (new_term !== null && new_term !== undefined) params.new_term = new_term;
      if (extra_payment_monthly !== null && extra_payment_monthly !== undefined)
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
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

            <NumericInput
              label="Nová úroková sadzba (%)"
              placeholder={loan?.annual_rate?.toString() ?? '0,00'}
              value={watch('new_rate') ?? null}
              onChangeValue={(v) => setValue('new_rate', v, { shouldValidate: true })}
              suffix="%"
              min={0}
              max={100}
              error={errors.new_rate?.message}
            />

            <NumericInput
              label="Nová doba splácania (mesiace)"
              placeholder={loan?.term_months?.toString() ?? '60'}
              value={watch('new_term') ?? null}
              onChangeValue={(v) =>
                setValue('new_term', v === null ? null : Math.round(v), { shouldValidate: true })
              }
              suffix="mes."
              decimals={0}
              allowDecimal={false}
              min={1}
              max={480}
              error={errors.new_term?.message}
            />

            <NumericInput
              label="Mesačná nadplatba (€)"
              placeholder="0,00"
              value={watch('extra_payment_monthly') ?? null}
              onChangeValue={(v) => setValue('extra_payment_monthly', v, { shouldValidate: true })}
              currency="€"
              min={0}
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
                    value={formatCurrency(result.original.monthly_payment)}
                  />
                  <ResultRow
                    label="Celkový úrok"
                    value={formatCurrency(result.original.total_interest)}
                  />
                  <ResultRow
                    label="Celková suma"
                    value={formatCurrency(result.original.total_cost)}
                  />
                </Card>

                <Card style={[styles.comparisonCard, styles.rightCard]}>
                  <Text style={styles.comparisonCardTitle}>Simulovaný plán</Text>

                  <ResultRow
                    label="Mesačná splátka"
                    value={formatCurrency(result.simulated.monthly_payment)}
                  />
                  <ResultRow
                    label="Celkový úrok"
                    value={formatCurrency(result.simulated.total_interest)}
                  />
                  <ResultRow
                    label="Celková suma"
                    value={formatCurrency(result.simulated.total_cost)}
                  />
                </Card>
              </View>

              <Card style={styles.savingsCard}>
                <Text style={styles.savingsTitle}>💰 Vaša úspora</Text>

                <ResultRow
                  label="Ušetrený úrok"
                  value={formatCurrency(result.savings.interest_saved)}
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
                  Toto je len názorná simulácia. Skutočné výsledky sa môžu líšiť na základe zmien
                  úrokových sadzieb a ďalších faktorov.
                </Text>
              </Card>
            </>
          )}
        </View>

        <View style={styles.spacing} />
      </ScrollView>
    </KeyboardAvoidingView>
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
  scrollView: {
    flex: 1,
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
