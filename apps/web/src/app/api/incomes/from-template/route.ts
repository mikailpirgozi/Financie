import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createIncomeFromTemplateSchema } from '@finapp/core';
import { getIncomeTemplate } from '@/lib/api/income-templates';

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
    const validated = createIncomeFromTemplateSchema.parse(body);

    // Get template
    const template = await getIncomeTemplate(validated.templateId);

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Create income from template
    const { data: income, error } = await supabase
      .from('incomes')
      .insert({
        household_id: template.household_id,
        date: validated.date.toISOString().split('T')[0],
        amount: validated.amount,
        source: template.name,
        category_id: template.category_id,
        note: validated.note ?? template.note,
        income_template_id: template.id,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ income }, { status: 201 });
  } catch (error) {
    console.error('Error creating income from template:', error);
    return NextResponse.json(
      { error: 'Failed to create income from template' },
      { status: 500 }
    );
  }
}

