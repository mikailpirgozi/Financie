import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getIncomeTemplate,
  updateIncomeTemplate,
  deleteIncomeTemplate,
} from '@/lib/api/income-templates';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const template = await getIncomeTemplate(id);

    return NextResponse.json({ template });
  } catch (error) {
    console.error('Error fetching income template:', error);
    return NextResponse.json(
      { error: 'Failed to fetch income template' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const template = await updateIncomeTemplate(id, body);

    return NextResponse.json({ template });
  } catch (error) {
    console.error('Error updating income template:', error);
    return NextResponse.json(
      { error: 'Failed to update income template' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await deleteIncomeTemplate(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting income template:', error);
    return NextResponse.json(
      { error: 'Failed to delete income template' },
      { status: 500 }
    );
  }
}

