import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const insurerSchema = z.object({
  householdId: z.string().uuid(),
  name: z.string().min(1),
  isDefault: z.boolean().optional().default(false),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const householdId = searchParams.get('householdId');

    if (!householdId) {
      return NextResponse.json({ error: 'householdId is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('insurers')
      .select('*')
      .eq('household_id', householdId)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching insurers:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const insurers = data?.map(item => ({
      id: item.id,
      householdId: item.household_id,
      name: item.name,
      isDefault: item.is_default,
      createdAt: item.created_at,
    })) || [];

    return NextResponse.json({ data: insurers });
  } catch (error) {
    console.error('GET /api/insurers error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedInput = insurerSchema.parse(body);

    const dbData = {
      household_id: validatedInput.householdId,
      name: validatedInput.name,
      is_default: validatedInput.isDefault,
    };

    const { data, error } = await supabase
      .from('insurers')
      .insert(dbData)
      .select()
      .single();

    if (error) {
      // Check for unique constraint violation
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Insurer with this name already exists' }, { status: 409 });
      }
      console.error('Error creating insurer:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      data: {
        id: data.id,
        householdId: data.household_id,
        name: data.name,
        isDefault: data.is_default,
        createdAt: data.created_at,
      }
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/insurers error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
