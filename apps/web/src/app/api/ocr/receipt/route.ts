import { type NextRequest, NextResponse } from 'next/server';
import { parseReceipt } from '@finapp/core';
import { createClient } from '@/lib/supabase/server';
import { getOcrProvider } from '@/lib/ocr/provider';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface OcrBody {
  /** Base64 image without `data:image/...;base64,` prefix. */
  base64?: string;
  /** Mime type of the image (e.g. `image/jpeg`). */
  mimeType?: string;
  /** Alternative: pre-OCRd text (skip vision call). */
  text?: string;
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

    const body = (await request.json()) as OcrBody;

    let rawText: string;
    if (body.text) {
      rawText = body.text;
    } else if (body.base64 && body.mimeType) {
      try {
        const provider = getOcrProvider();
        rawText = await provider.recognize(body.base64, body.mimeType);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'OCR failed';
        if (msg.includes('OPENAI_API_KEY')) {
          return NextResponse.json(
            { error: 'OCR provider not configured. Set OPENAI_API_KEY.' },
            { status: 503 }
          );
        }
        throw err;
      }
    } else {
      return NextResponse.json(
        { error: 'Provide either `text` or (`base64` + `mimeType`)' },
        { status: 400 }
      );
    }

    const parsed = parseReceipt(rawText);
    return NextResponse.json({
      provider: body.text ? 'text-input' : getOcrProvider().name,
      parsed,
      rawText,
    });
  } catch (error) {
    console.error('POST /api/ocr/receipt error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
