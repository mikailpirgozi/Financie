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

function generateMonthlyReportHTML(
  userName: string,
  month: string,
  year: number,
  totalIncome: number,
  totalExpenses: number,
  netSavings: number,
  loansPaid: number,
  netWorth: number,
  dashboardUrl: string
): string {
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('sk-SK', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);

  const savingsRate = totalIncome > 0 ? ((netSavings / totalIncome) * 100).toFixed(1) : '0';
  const savingsColor = netSavings >= 0 ? '#2e7d32' : '#d32f2f';

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #f6f9fc; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px; }
          h1 { color: #333; font-size: 24px; margin-bottom: 20px; }
          p { color: #333; font-size: 16px; line-height: 26px; }
          .stats-box { background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 24px 0; }
          .stat-row { display: flex; justify-content: space-between; margin-bottom: 12px; }
          .stat-label { color: #555; font-size: 15px; font-weight: 500; }
          .stat-value { color: #333; font-size: 16px; font-weight: 600; }
          .info-box { background-color: #e3f2fd; border-radius: 8px; padding: 16px 20px; margin: 16px 0; }
          .net-worth-box { text-align: center; padding: 24px 0; margin: 24px 0; border-top: 1px solid #e0e0e0; border-bottom: 1px solid #e0e0e0; }
          .net-worth-label { color: #555; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; }
          .net-worth-value { color: #2e7d32; font-size: 28px; font-weight: bold; margin-top: 8px; }
          .warning-box { background-color: #fff3e0; border-left: 4px solid #ff9800; padding: 16px 20px; margin: 16px 0; }
          .button { display: inline-block; background-color: #0070f3; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 20px 0; }
          .footer { color: #8898aa; font-size: 14px; margin-top: 32px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>📊 Mesačný finančný prehľad</h1>
          <p>Ahoj ${userName},</p>
          <p>Tu je váš finančný prehľad za <strong>${month} ${year}</strong>:</p>
          
          <div class="stats-box">
            <div class="stat-row">
              <span class="stat-label">💵 Celkové príjmy:</span>
              <span class="stat-value">${formatCurrency(totalIncome)}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">💸 Celkové výdavky:</span>
              <span class="stat-value">${formatCurrency(totalExpenses)}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">💰 Čisté úspory:</span>
              <span class="stat-value" style="color: ${savingsColor};">${formatCurrency(netSavings)}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">📈 Miera úspor:</span>
              <span class="stat-value">${savingsRate}%</span>
            </div>
          </div>

          <div class="info-box">
            <p style="margin: 0; color: #1565c0; font-weight: 600; font-size: 14px; margin-bottom: 8px;">Splátky úverov</p>
            <p style="margin: 0; color: #555; font-size: 14px;">
              V tomto mesiaci ste splatili <strong>${formatCurrency(loansPaid)}</strong> na úveroch.
            </p>
          </div>

          <div class="net-worth-box">
            <div class="net-worth-label">Vaša čistá hodnota:</div>
            <div class="net-worth-value">${formatCurrency(netWorth)}</div>
          </div>

          ${netSavings < 0 ? `
          <div class="warning-box">
            <p style="margin: 0; color: #e65100; font-size: 14px;">
              ⚠️ Tento mesiac ste minuli viac, ako ste zarobili. Skúste analyzovať vaše výdavky
              a nájsť oblasti, kde môžete ušetriť.
            </p>
          </div>
          ` : ''}

          <div style="text-align: center;">
            <a href="${dashboardUrl}" class="button">Zobraziť detailný prehľad</a>
          </div>

          <p class="footer">
            Tento prehľad je automaticky generovaný na konci každého mesiaca.<br>
            Tím FinApp
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

    // Get previous month
    const now = new Date();
    const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const month = now.getMonth() === 0 ? 12 : now.getMonth();
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;

    const monthNames = [
      'január', 'február', 'marec', 'apríl', 'máj', 'jún',
      'júl', 'august', 'september', 'október', 'november', 'december'
    ];

    // Get all households
    const { data: households, error: householdsError } = await supabaseClient
      .from('households')
      .select('id, name');

    if (householdsError) throw householdsError;

    let emailsSent = 0;
    let emailsFailed = 0;

    for (const household of households ?? []) {
      // Get monthly summary for this household
      const { data: summary } = await supabaseClient
        .from('monthly_summaries')
        .select('*')
        .eq('household_id', household.id)
        .eq('month', monthStr)
        .single();

      if (!summary) {
        console.log(`No summary found for household ${household.id} for month ${monthStr}`);
        continue;
      }

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
        .eq('household_id', household.id);

      // Send email to each member
      for (const member of members ?? []) {
        const profile = member.profiles as unknown as {
          id: string;
          email: string;
          display_name: string | null;
        };

        try {
          const userName = profile.display_name || profile.email;
          const dashboardUrl = `${APP_URL}/dashboard/summaries`;
          
          const html = generateMonthlyReportHTML(
            userName,
            monthNames[month - 1] || 'mesiac',
            year,
            Number(summary.total_income || 0),
            Number(summary.total_expenses || 0),
            Number(summary.net_savings || 0),
            Number(summary.loans_paid || 0),
            Number(summary.net_worth || 0),
            dashboardUrl
          );

          await sendEmail(
            profile.email,
            `📊 Váš mesačný finančný prehľad za ${monthNames[month - 1]} ${year}`,
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
        message: `Sent ${emailsSent} monthly reports, ${emailsFailed} failed`,
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

