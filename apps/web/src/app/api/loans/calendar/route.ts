import { NextRequest, NextResponse } from 'next/server';
import { getLoanCalendarSchema } from '@finapp/core';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

interface CalendarEntry {
  loanId: string;
  loanName: string;
  lender: string;
  linkedAssetId: string | null;
  linkedAssetName: string | null;
  dueDate: string;
  installmentNo: number;
  principalDue: number;
  interestDue: number;
  feesDue: number;
  totalDue: number;
  status: string;
  loanType: string;
}

interface MonthlyCalendarEntry {
  month: string;
  totalPayments: number;
  totalPrincipal: number;
  totalInterest: number;
  totalFees: number;
  entries: CalendarEntry[];
}

/**
 * GET /api/loans/calendar
 * Získa splátkový kalendár pre všetky úvery (6 mesiacov dopredu)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const householdId = searchParams.get('householdId');
    const startMonth = searchParams.get('startMonth') || 
      new Date().toISOString().slice(0, 7); // YYYY-MM
    const monthsCount = parseInt(searchParams.get('monthsCount') || '6', 10);

    if (!householdId) {
      return NextResponse.json({ error: 'householdId is required' }, { status: 400 });
    }

    // Validácia
    const validatedInput = getLoanCalendarSchema.parse({
      householdId,
      startMonth,
      monthsCount,
    });

    // Verify user has access to household
    const { data: membership } = await supabase
      .from('household_members')
      .select('role')
      .eq('household_id', validatedInput.householdId)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Vypočítaj dátumový rozsah
    const startDate = new Date(`${validatedInput.startMonth}-01`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + validatedInput.monthsCount);

    // Získaj všetky úvery domácnosti
    const { data: loans, error: loansError } = await supabase
      .from('loans')
      .select(`
        id,
        lender,
        loan_type,
        linked_asset_id,
        assets:linked_asset_id (
          id,
          name
        )
      `)
      .eq('household_id', validatedInput.householdId)
      .eq('status', 'active');

    if (loansError) {
      console.error('Loans error:', loansError);
      return NextResponse.json(
        { error: 'Failed to fetch loans' },
        { status: 500 }
      );
    }

    if (!loans || loans.length === 0) {
      return NextResponse.json({
        calendar: [],
        summary: {
          totalMonths: 0,
          totalPayments: 0,
          totalPrincipal: 0,
          totalInterest: 0,
          totalFees: 0,
        },
      });
    }

    // Získaj všetky splátky v danom období
    const { data: schedules, error: schedulesError } = await supabase
      .from('loan_schedules')
      .select('*')
      .in('loan_id', loans.map(l => l.id))
      .gte('due_date', startDate.toISOString().split('T')[0])
      .lt('due_date', endDate.toISOString().split('T')[0])
      .order('due_date', { ascending: true });

    if (schedulesError) {
      console.error('Schedules error:', schedulesError);
      return NextResponse.json(
        { error: 'Failed to fetch loan schedules' },
        { status: 500 }
      );
    }

    // Zoskup splátky podľa mesiacov
    const monthlyCalendar = new Map<string, MonthlyCalendarEntry>();

    schedules?.forEach(schedule => {
      const dueDate = new Date(schedule.due_date);
      const monthKey = dueDate.toISOString().slice(0, 7); // YYYY-MM

      const loan = loans.find(l => l.id === schedule.loan_id);
      if (!loan) return;

      const entry: CalendarEntry = {
        loanId: schedule.loan_id,
        loanName: loan.lender,
        lender: loan.lender,
        linkedAssetId: loan.linked_asset_id,
        linkedAssetName: (loan.assets && typeof loan.assets === 'object' && 'name' in loan.assets) ? (loan.assets as { name: string }).name : null,
        dueDate: schedule.due_date,
        installmentNo: schedule.installment_no,
        principalDue: Number(schedule.principal_due),
        interestDue: Number(schedule.interest_due),
        feesDue: Number(schedule.fees_due),
        totalDue: Number(schedule.total_due),
        status: schedule.status,
        loanType: loan.loan_type,
      };

      if (!monthlyCalendar.has(monthKey)) {
        monthlyCalendar.set(monthKey, {
          month: monthKey,
          totalPayments: 0,
          totalPrincipal: 0,
          totalInterest: 0,
          totalFees: 0,
          entries: [],
        });
      }

      const monthData = monthlyCalendar.get(monthKey)!;
      monthData.totalPayments += entry.totalDue;
      monthData.totalPrincipal += entry.principalDue;
      monthData.totalInterest += entry.interestDue;
      monthData.totalFees += entry.feesDue;
      monthData.entries.push(entry);
    });

    // Konvertuj na pole a zoraď
    const calendar = Array.from(monthlyCalendar.values()).sort((a, b) => 
      a.month.localeCompare(b.month)
    );

    // Vypočítaj celkové sumáre
    const summary = {
      totalMonths: calendar.length,
      totalPayments: calendar.reduce((sum, m) => sum + m.totalPayments, 0),
      totalPrincipal: calendar.reduce((sum, m) => sum + m.totalPrincipal, 0),
      totalInterest: calendar.reduce((sum, m) => sum + m.totalInterest, 0),
      totalFees: calendar.reduce((sum, m) => sum + m.totalFees, 0),
    };

    return NextResponse.json({
      calendar,
      summary,
      period: {
        startMonth: validatedInput.startMonth,
        endMonth: endDate.toISOString().slice(0, 7),
        monthsCount: validatedInput.monthsCount,
      },
    });
  } catch (error) {
    console.error('GET /api/loans/calendar error:', error);
    
    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

