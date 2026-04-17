import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { Stack } from 'expo-router';
import { Sparkles, TrendingUp, TrendingDown } from 'lucide-react-native';
import { apiFetch } from '../../src/lib/api';
import { useHousehold } from '../../src/hooks';
import type { FinancialInsights } from '@finapp/core';

interface AiResponse {
  summary: string;
  tips: string[];
  model: string | null;
}

export default function InsightsScreen() {
  const { data: household } = useHousehold();
  const [insights, setInsights] = useState<FinancialInsights | null>(null);
  const [ai, setAi] = useState<AiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!household?.id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch<FinancialInsights>(`/api/insights?householdId=${household.id}`);
        if (!cancelled) setInsights(res);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Chyba pri načítaní');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [household?.id]);

  async function generateAi() {
    if (!insights) return;
    setAiLoading(true);
    try {
      const res = await apiFetch<AiResponse>('/api/insights/ai', {
        method: 'POST',
        body: JSON.stringify({ insights }),
      });
      setAi(res);
    } catch (e) {
      setAi({
        summary: e instanceof Error ? e.message : 'Nepodarilo sa získať AI komentár',
        tips: [],
        model: null,
      });
    } finally {
      setAiLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error || !insights) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error ?? 'Žiadne dáta'}</Text>
      </View>
    );
  }

  const eur = (n: number) =>
    new Intl.NumberFormat('sk-SK', { style: 'currency', currency: 'EUR' }).format(n);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: 'Insights' }} />

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Obdobie</Text>
        <Text style={styles.cardValue}>
          {insights.periodStart} → {insights.periodEnd}
        </Text>
      </View>

      <View style={styles.row}>
        <View style={[styles.statCard, { borderColor: '#10b981' }]}>
          <Text style={styles.statLabel}>Príjmy</Text>
          <Text style={[styles.statValue, { color: '#10b981' }]}>
            {eur(insights.totals.incomes)}
          </Text>
        </View>
        <View style={[styles.statCard, { borderColor: '#ef4444' }]}>
          <Text style={styles.statLabel}>Výdaje</Text>
          <Text style={[styles.statValue, { color: '#ef4444' }]}>
            {eur(insights.totals.expenses)}
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Čistý tok / Miera úspor</Text>
        <Text style={styles.cardValue}>
          {eur(insights.totals.net)} ({Math.round(insights.totals.savingsRate * 100)}%)
        </Text>
      </View>

      <Text style={styles.section}>Top kategórie</Text>
      {insights.categories.slice(0, 5).map((c) => (
        <View key={c.category} style={styles.catRow}>
          <Text style={styles.catName}>{c.category}</Text>
          <Text style={styles.catValue}>
            {eur(c.total)} · {Math.round(c.share * 100)}%
          </Text>
        </View>
      ))}

      {insights.anomalies.length > 0 && (
        <>
          <Text style={styles.section}>Neobvyklé zmeny</Text>
          {insights.anomalies.map((a) => (
            <View key={a.category} style={styles.catRow}>
              <View style={styles.anomLeft}>
                {a.reason === 'spike' ? (
                  <TrendingUp size={16} color="#ef4444" />
                ) : (
                  <TrendingDown size={16} color="#10b981" />
                )}
                <Text style={styles.catName}> {a.category}</Text>
              </View>
              <Text
                style={[styles.catValue, { color: a.reason === 'spike' ? '#ef4444' : '#10b981' }]}
              >
                {a.pctChange > 0 ? '+' : ''}
                {Math.round(a.pctChange * 100)}%
              </Text>
            </View>
          ))}
        </>
      )}

      <Pressable
        style={({ pressed }) => [styles.aiBtn, pressed && { opacity: 0.85 }]}
        onPress={generateAi}
        disabled={aiLoading}
      >
        <Sparkles size={18} color="#fff" />
        <Text style={styles.aiBtnText}>
          {aiLoading ? 'Generujem...' : ai ? 'Vygenerovať znova' : 'Vygenerovať AI komentár'}
        </Text>
      </Pressable>

      {ai && (
        <View style={styles.aiCard}>
          <Text style={styles.aiSummary}>{ai.summary}</Text>
          {ai.tips.length > 0 && (
            <View style={styles.tipList}>
              {ai.tips.map((t, idx) => (
                <Text key={idx} style={styles.tip}>
                  • {t}
                </Text>
              ))}
            </View>
          )}
          {ai.model && <Text style={styles.aiMeta}>Model: {ai.model}</Text>}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16, gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { color: '#ef4444', textAlign: 'center' },
  card: {
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardLabel: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
  cardValue: { fontSize: 18, fontWeight: '600' },
  row: { flexDirection: 'row', gap: 12 },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: '#fff',
  },
  statLabel: { fontSize: 12, color: '#6b7280' },
  statValue: { fontSize: 20, fontWeight: '700', marginTop: 4 },
  section: { marginTop: 8, fontSize: 14, fontWeight: '700', color: '#111827' },
  catRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  catName: { fontSize: 14, color: '#1f2937' },
  catValue: { fontSize: 14, color: '#6b7280', fontWeight: '600' },
  anomLeft: { flexDirection: 'row', alignItems: 'center' },
  aiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#8b5cf6',
    padding: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  aiBtnText: { color: '#fff', fontWeight: '600' },
  aiCard: {
    padding: 16,
    backgroundColor: '#faf5ff',
    borderColor: '#ddd6fe',
    borderWidth: 1,
    borderRadius: 12,
    gap: 12,
  },
  aiSummary: { fontSize: 14, color: '#1f2937', lineHeight: 20 },
  tipList: { gap: 6 },
  tip: { fontSize: 13, color: '#374151', lineHeight: 18 },
  aiMeta: { fontSize: 11, color: '#9ca3af' },
});
