import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentHousehold } from '@/lib/api/households';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const household = await getCurrentHousehold(user.id);

    return NextResponse.json({
      householdId: household.household_id,
      role: household.role,
      household: household.households,
    });
  } catch (error) {
    console.error('GET /api/households/current error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

