'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@finapp/ui';
import { Sparkles, TrendingUp, TrendingDown } from 'lucide-react';
import type { FinancialInsights } from '@finapp/core';

interface AiResponse {
  summary: string;
  tips: string[];
  model: string | null;
}

const eur = (n: number) =>
  new Intl.NumberFormat('sk-SK', { style: 'currency', currency: 'EUR' }).format(n);

export function InsightsView({ householdId }: { householdId: string }): React.JSX.Element {
  const [insights, setInsights] = useState<FinancialInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [ai, setAi] = useState<AiResponse | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/insights?householdId=${householdId}`, {
          cache: 'no-store',
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as FinancialInsights;
        if (!cancelled) setInsights(json);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Chyba');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [householdId]);

  async function generateAi() {
    if (!insights) return;
    setAiLoading(true);
    try {
      const res = await fetch('/api/insights/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ insights }),
      });
      const json = (await res.json()) as AiResponse;
      setAi(json);
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
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">Načítavam...</CardContent>
      </Card>
    );
  }

  if (error || !insights) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-destructive">
          {error ?? 'Žiadne dáta'}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Príjmy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {eur(insights.totals.incomes)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Výdaje</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{eur(insights.totals.expenses)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Miera úspor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(insights.totals.savingsRate * 100)}%
            </div>
            <div className="text-xs text-muted-foreground">Net {eur(insights.totals.net)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top kategórie</CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          {insights.categories.slice(0, 8).map((c) => (
            <div key={c.category} className="flex items-center justify-between py-2">
              <span>{c.category}</span>
              <span className="text-sm text-muted-foreground">
                {eur(c.total)} · {Math.round(c.share * 100)}%
              </span>
            </div>
          ))}
          {insights.categories.length === 0 && (
            <div className="py-4 text-sm text-muted-foreground">Žiadne výdavky.</div>
          )}
        </CardContent>
      </Card>

      {insights.anomalies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Neobvyklé zmeny</CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            {insights.anomalies.map((a) => (
              <div key={a.category} className="flex items-center justify-between py-2">
                <span className="flex items-center gap-2">
                  {a.reason === 'spike' ? (
                    <TrendingUp className="h-4 w-4 text-red-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-emerald-500" />
                  )}
                  {a.category}
                </span>
                <span
                  className={`text-sm font-medium ${
                    a.reason === 'spike' ? 'text-red-600' : 'text-emerald-600'
                  }`}
                >
                  {a.pctChange > 0 ? '+' : ''}
                  {Math.round(a.pctChange * 100)}%
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            AI komentár
          </CardTitle>
          <Button onClick={generateAi} disabled={aiLoading}>
            {aiLoading ? 'Generujem...' : ai ? 'Vygenerovať znova' : 'Vygenerovať'}
          </Button>
        </CardHeader>
        <CardContent>
          {!ai ? (
            <p className="text-sm text-muted-foreground">
              Kliknutím na tlačidlo získate krátky komentár a 3-5 odporúčaní.
            </p>
          ) : (
            <div className="space-y-3">
              <p className="text-sm leading-relaxed">{ai.summary}</p>
              {ai.tips.length > 0 && (
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  {ai.tips.map((t, idx) => (
                    <li key={idx}>{t}</li>
                  ))}
                </ul>
              )}
              {ai.model && <p className="text-xs text-muted-foreground">Model: {ai.model}</p>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
