import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { sendWelcomeEmail } from '@/lib/email';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const isNewUser = requestUrl.searchParams.get('new_user') === 'true';

  if (code) {
    const supabase = await createClient();
    const { data } = await supabase.auth.exchangeCodeForSession(code);

    // Send welcome email for new users
    if (isNewUser && data.user) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, email')
          .eq('id', data.user.id)
          .single();

        const userName = profile?.display_name || profile?.email || 'User';
        const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/login`;

        await sendWelcomeEmail(data.user.email || '', userName, loginUrl);
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
        // Don't fail the request if email fails
      }
    }
  }

  // Redirect to dashboard after successful authentication
  return NextResponse.redirect(new URL('/dashboard', request.url));
}


