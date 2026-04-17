/**
 * OCR provider abstraction. Default implementation calls OpenAI Vision
 * (GPT-4o family) which transcribes the receipt image to text. The
 * downstream `parseReceipt` (in `@finapp/core`) then extracts structured
 * fields heuristically.
 *
 * Why two-step instead of one prompt that returns JSON directly?
 *   - We can swap providers (Google Vision, AWS Textract, Tesseract)
 *     without rewriting the field extraction.
 *   - Heuristic parser is unit-tested and offline-debuggable.
 */

import { serverEnv } from '@/lib/env';

export interface OcrProvider {
  name: string;
  /**
   * Extract raw text from a receipt image (already in base64, without
   * the `data:image/...;base64,` prefix).
   */
  recognize(base64Image: string, mimeType: string): Promise<string>;
}

class OpenAiVisionProvider implements OcrProvider {
  name = 'openai-vision';

  async recognize(base64Image: string, mimeType: string): Promise<string> {
    const apiKey = serverEnv.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }
    const model = serverEnv.OCR_MODEL ?? 'gpt-4o-mini';

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: 800,
        messages: [
          {
            role: 'system',
            content:
              'You are an OCR engine. Read the Slovak receipt in the image and ' +
              'output its text content line-by-line, preserving order. ' +
              'Do not summarize, do not translate. Output text only.',
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Transcribe this receipt:' },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`,
                  detail: 'high',
                },
              },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`OpenAI Vision failed: ${res.status} ${body}`);
    }

    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return json.choices?.[0]?.message?.content?.trim() ?? '';
  }
}

let _provider: OcrProvider | null = null;

export function getOcrProvider(): OcrProvider {
  if (_provider) return _provider;
  _provider = new OpenAiVisionProvider();
  return _provider;
}

/** For tests: inject a fake provider. */
export function setOcrProvider(p: OcrProvider | null): void {
  _provider = p;
}
