import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const today = new Date().toISOString().split('T')[0];

    // Get overdue loan schedules
    const { data: overdueSchedules, error: schedulesError } = await supabaseClient
      .from('loan_schedules')
      .select(`
        id,
        due_date,
        total_due,
        loan_id,
        loans!inner (
          id,
          lender,
          household_id,
          household_members!inner (
            user_id,
            profiles!inner (
              id,
              email
            )
          )
        )
      `)
      .eq('status', 'overdue')
      .lte('due_date', today);

    if (schedulesError) throw schedulesError;

    const notifications: Array<{
      userId: string;
      email: string;
      lender: string;
      dueDate: string;
      amount: number;
      daysOverdue: number;
    }> = [];

    for (const schedule of overdueSchedules ?? []) {
      const dueDate = new Date(schedule.due_date);
      const daysOverdue = Math.floor(
        (new Date().getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Get household members
      const loan = schedule.loans as unknown as {
        lender: string;
        household_id: string;
        household_members: Array<{
          user_id: string;
          profiles: { id: string; email: string };
        }>;
      };

      for (const member of loan.household_members ?? []) {
        notifications.push({
          userId: member.profiles.id,
          email: member.profiles.email,
          lender: loan.lender,
          dueDate: schedule.due_date,
          amount: Number(schedule.total_due),
          daysOverdue,
        });
      }
    }

    // Send notifications (implement your notification logic here)
    // For now, just log them
    console.log(`Found ${notifications.length} overdue loan notifications to send`);

    // TODO: Implement Expo Push Notifications or Email notifications
    // Example:
    // for (const notification of notifications) {
    //   await sendPushNotification(notification);
    //   await sendEmailNotification(notification);
    // }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${notifications.length} overdue loan notifications`,
        notifications: notifications.length,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

