import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const APP_URL = Deno.env.get('APP_URL') || 'http://localhost:3000';

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set, skipping email');
    return null;
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: 'FinApp <noreply@finapp.sk>',
      to,
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send email: ${error}`);
  }

  return response.json();
}

function generateLoanReminderHTML(
  userName: string,
  lender: string,
  dueDate: string,
  amount: number,
  daysOverdue: number,
  loanUrl: string
): string {
  const formattedAmount = new Intl.NumberFormat('sk-SK', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);

  const formattedDate = new Date(dueDate).toLocaleDateString('sk-SK', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #f6f9fc; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px; }
          h1 { color: #d32f2f; font-size: 24px; margin-bottom: 20px; }
          p { color: #333; font-size: 16px; line-height: 26px; }
          .alert-box { background-color: #fff3e0; border-left: 4px solid #ff9800; padding: 20px; margin: 24px 0; }
          .alert-item { margin: 8px 0; }
          .button { display: inline-block; background-color: #0070f3; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 20px 0; }
          .footer { color: #8898aa; font-size: 14px; margin-top: 32px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>⚠️ Pripomienka splatnosti úveru</h1>
          <p>Ahoj ${userName},</p>
          <p>Pripomíname vám, že splátka úveru od <strong>${lender}</strong> je po splatnosti.</p>
          <div class="alert-box">
            <p class="alert-item"><strong>Suma:</strong> ${formattedAmount}</p>
            <p class="alert-item"><strong>Dátum splatnosti:</strong> ${formattedDate}</p>
            <p class="alert-item"><strong>Omeškanie:</strong> ${daysOverdue} ${daysOverdue === 1 ? 'deň' : daysOverdue < 5 ? 'dni' : 'dní'}</p>
          </div>
          <p style="color: #d32f2f; font-weight: 500;">
            Prosím, uhraďte túto splátku čo najskôr, aby ste sa vyhli prípadným penalizáciám.
          </p>
          <a href="${loanUrl}" class="button">Zobraziť detail úveru</a>
          <p class="footer">
            Toto je automatická pripomienka z FinApp.<br>
            Ak ste už splátku uhradili, môžete tento email ignorovať.
          </p>
        </div>
      </body>
    </html>
  `;
}

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
          household_id
        )
      `)
      .eq('status', 'overdue')
      .lte('due_date', today);

    if (schedulesError) throw schedulesError;

    let emailsSent = 0;
    let emailsFailed = 0;

    for (const schedule of overdueSchedules ?? []) {
      const dueDate = new Date(schedule.due_date);
      const daysOverdue = Math.floor(
        (new Date().getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      const loan = schedule.loans as unknown as {
        id: string;
        lender: string;
        household_id: string;
      };

      // Get household members
      const { data: members } = await supabaseClient
        .from('household_members')
        .select(`
          user_id,
          profiles!inner (
            id,
            email,
            display_name
          )
        `)
        .eq('household_id', loan.household_id);

      // Send email to each member
      for (const member of members ?? []) {
        const profile = member.profiles as unknown as {
          id: string;
          email: string;
          display_name: string | null;
        };

        try {
          const userName = profile.display_name || profile.email;
          const loanUrl = `${APP_URL}/dashboard/loans/${loan.id}`;
          const html = generateLoanReminderHTML(
            userName,
            loan.lender,
            schedule.due_date,
            Number(schedule.total_due),
            daysOverdue,
            loanUrl
          );

          await sendEmail(
            profile.email,
            `⚠️ Pripomienka splatnosti úveru od ${loan.lender}`,
            html
          );

          emailsSent++;
        } catch (emailError) {
          console.error(`Failed to send email to ${profile.email}:`, emailError);
          emailsFailed++;
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sent ${emailsSent} emails, ${emailsFailed} failed`,
        emailsSent,
        emailsFailed,
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

