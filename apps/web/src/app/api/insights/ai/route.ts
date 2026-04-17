/**
 * Generate a Slovak natural-language summary of the household's financial
 * insights. The deterministic figures come from /api/insights — this endpoint
 * just turns them into a few short paragraphs and 3-5 actionable tips using
 * an LLM.
 *
 * The endpoint is rate-limit-friendly:
 *   - Returns a "not configured" message if OPENAI_API_KEY is missing instead
 *     of failing with 500.
 *   - Sends only the compact insights summary to the model, never raw rows.
 */

import { type NextRequest, NextResponse } from 'next/server';
import { buildInsightsPrompt, type FinancialInsights } from '@finapp/core';
import { createClient } from '@/lib/supabase/server';
import { serverEnv } from '@/lib/env';

export const dynamic = 'force-dynamic';

interface AiInsightsRequest {
  insights: FinancialInsights;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: AiInsightsRequest;
    try {
      body = (await request.json()) as AiInsightsRequest;
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    if (!body?.insights || typeof body.insights !== 'object') {
      return NextResponse.json({ error: '`insights` payload is required' }, { status: 400 });
    }

    const apiKey = serverEnv.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          summary: 'AI insights nie sú nakonfigurované. Nastavte OPENAI_API_KEY na serveri.',
          tips: [],
          model: null,
        },
        { status: 200 }
      );
    }

    const model = serverEnv.AI_INSIGHTS_MODEL ?? 'gpt-4o-mini';
    const promptContext = buildInsightsPrompt(body.insights);

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: 600,
        temperature: 0.4,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'Si osobný finančný poradca v slovenčine. Z agregovaných ' +
              'finančných dát vygeneruj stručný komentár (2-3 vety) a 3-5 ' +
              'konkrétnych odporúčaní. Buď vecný, nikdy si nevymýšľaj čísla. ' +
              'Vráť výhradne JSON v tvare {"summary": string, "tips": string[]}.',
          },
          {
            role: 'user',
            content: promptContext,
          },
        ],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('AI insights upstream error:', res.status, text);
      return NextResponse.json({ error: 'AI provider failed', details: text }, { status: 502 });
    }

    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = json.choices?.[0]?.message?.content ?? '{}';

    let parsed: { summary?: string; tips?: string[] } = {};
    try {
      parsed = JSON.parse(content) as typeof parsed;
    } catch {
      parsed = { summary: content, tips: [] };
    }

    return NextResponse.json({
      summary: parsed.summary ?? '',
      tips: Array.isArray(parsed.tips) ? parsed.tips.slice(0, 5) : [],
      model,
    });
  } catch (error) {
    console.error('POST /api/insights/ai error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
