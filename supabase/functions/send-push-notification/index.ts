import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface PushMessage {
  to: string;
  sound: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

serve(async (req) => {
  try {
    const { userId, title, body, data } = await req.json();

    if (!userId || !title || !body) {
      return new Response(
        JSON.stringify({ error: 'userId, title, and body are required' }),
        { headers: { 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user's push tokens
    const { data: tokens, error: tokensError } = await supabaseClient
      .from('push_tokens')
      .select('token')
      .eq('user_id', userId);

    if (tokensError) throw tokensError;

    if (!tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No push tokens found for user' }),
        { headers: { 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Send push notifications to all user's devices
    const messages: PushMessage[] = tokens.map((token) => ({
      to: token.token,
      sound: 'default',
      title,
      body,
      data,
    }));

    const expoPushUrl = 'https://exp.host/--/api/v2/push/send';
    const responses = await Promise.all(
      messages.map((message) =>
        fetch(expoPushUrl, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Accept-Encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(message),
        })
      )
    );

    const results = await Promise.all(responses.map((r) => r.json()));

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sent ${messages.length} push notifications`,
        results,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

