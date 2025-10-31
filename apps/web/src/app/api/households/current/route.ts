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

    const memberData = await getCurrentHousehold(user.id);

    // Extract household details from the nested structure
    const householdData = memberData.households;
    
    if (!householdData) {
      return NextResponse.json({ error: 'Household not found' }, { status: 404 });
    }

    return NextResponse.json({
      household: {
        id: householdData.id,
        name: householdData.name,
        created_at: householdData.created_at,
      },
    });
  } catch (error) {
    console.error('GET /api/households/current error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}



