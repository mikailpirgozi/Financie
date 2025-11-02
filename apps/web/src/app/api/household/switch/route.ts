import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { householdId } = await request.json();

    if (!householdId) {
      return NextResponse.json({ error: 'Missing householdId' }, { status: 400 });
    }

    // Verify user is member of this household
    const { data: membership } = await supabase
      .from('household_members')
      .select('id')
      .eq('household_id', householdId)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: 'You are not a member of this household' },
        { status: 403 }
      );
    }

    // Store selected household in cookie
    const cookieStore = await cookies();
    cookieStore.set('selected_household', householdId, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error switching household:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

