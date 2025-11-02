import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentHousehold } from '@/lib/api/households';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Try to get existing household
    let memberData;
    try {
      memberData = await getCurrentHousehold(user.id);
    } catch (error) {
      // If household not found, create default one
      console.log('No household found for user, creating default household...');
      
      // Create household
      const { data: newHousehold, error: createError } = await supabase
        .from('households')
        .insert({
          name: 'Moja domácnosť',
        })
        .select()
        .single();

      if (createError) {
        console.error('Failed to create household:', createError);
        throw createError;
      }

      // Add user as admin member
      const { error: memberError } = await supabase
        .from('household_members')
        .insert({
          household_id: newHousehold.id,
          user_id: user.id,
          role: 'admin',
        });

      if (memberError) {
        console.error('Failed to add user to household:', memberError);
        throw memberError;
      }

      // Return newly created household
      return NextResponse.json({
        household: {
          id: newHousehold.id,
          name: newHousehold.name,
          created_at: newHousehold.created_at,
        },
      });
    }

    // Extract household details from the nested structure
    const householdData = Array.isArray(memberData.households) 
      ? memberData.households[0] 
      : memberData.households;
    
    if (!householdData || !householdData.id) {
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



