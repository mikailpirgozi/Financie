import { render } from '@react-email/render';
import { resend, FROM_EMAIL } from './client';
import { WelcomeEmail } from './templates/WelcomeEmail';
import { HouseholdInviteEmail } from './templates/HouseholdInviteEmail';
import { LoanDueReminderEmail } from './templates/LoanDueReminderEmail';
import { MonthlyReportEmail } from './templates/MonthlyReportEmail';

export async function sendWelcomeEmail(to: string, userName: string, loginUrl: string) {
  if (!resend) {
    console.warn('Resend is not configured. Skipping welcome email.');
    return null;
  }

  const html = await render(WelcomeEmail({ userName, loginUrl }));

  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: 'Vitajte vo FinApp! 🎉',
    html,
  });
}

export async function sendHouseholdInviteEmail(
  to: string,
  invitedByName: string,
  householdName: string,
  inviteUrl: string,
  role: string
) {
  if (!resend) {
    console.warn('Resend is not configured. Skipping invite email.');
    return null;
  }

  const html = await render(
    HouseholdInviteEmail({ invitedByName, householdName, inviteUrl, role })
  );

  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Pozvánka do domácnosti ${householdName}`,
    html,
  });
}

export async function sendLoanDueReminderEmail(
  to: string,
  userName: string,
  lender: string,
  dueDate: string,
  amount: number,
  daysOverdue: number,
  loanUrl: string
) {
  if (!resend) {
    console.warn('Resend is not configured. Skipping reminder email.');
    return null;
  }

  const html = await render(
    LoanDueReminderEmail({ userName, lender, dueDate, amount, daysOverdue, loanUrl })
  );

  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `⚠️ Pripomienka splatnosti úveru od ${lender}`,
    html,
  });
}

export async function sendMonthlyReportEmail(
  to: string,
  userName: string,
  month: string,
  year: number,
  totalIncome: number,
  totalExpenses: number,
  netSavings: number,
  loansPaid: number,
  netWorth: number,
  dashboardUrl: string
) {
  if (!resend) {
    console.warn('Resend is not configured. Skipping monthly report email.');
    return null;
  }

  const html = await render(
    MonthlyReportEmail({
      userName,
      month,
      year,
      totalIncome,
      totalExpenses,
      netSavings,
      loansPaid,
      netWorth,
      dashboardUrl,
    })
  );

  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `📊 Váš mesačný finančný prehľad za ${month} ${year}`,
    html,
  });
}

