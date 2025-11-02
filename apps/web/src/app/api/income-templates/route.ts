import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  createIncomeTemplate,
  getIncomeTemplates,
} from '@/lib/api/income-templates';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const householdId = searchParams.get('householdId');
    const activeOnly = searchParams.get('activeOnly') !== 'false';

    if (!householdId) {
      return NextResponse.json(
        { error: 'householdId is required' },
        { status: 400 }
      );
    }

    const templates = await getIncomeTemplates(householdId, activeOnly);

    return NextResponse.json({ templates });
  } catch (error) {
    console.error('Error fetching income templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch income templates' },
      { status: 500 }
    );
  }
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

    const body = await request.json();
    const template = await createIncomeTemplate(body);

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    console.error('Error creating income template:', error);
    return NextResponse.json(
      { error: 'Failed to create income template' },
      { status: 500 }
    );
  }
}

