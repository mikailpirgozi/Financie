/**
 * PDF Export utilities
 * Generate PDF reports using browser's print functionality
 */

export interface PDFReportOptions {
  title: string;
  subtitle?: string;
  content: string; // HTML content
  styles?: string; // Additional CSS styles
}

export function generatePDFReport(options: PDFReportOptions): void {
  const { title, subtitle, content, styles = '' } = options;

  // Create a new window for printing
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to generate PDF');
    return;
  }

  // Build HTML document
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: Arial, sans-serif;
            padding: 20mm;
            font-size: 12pt;
            line-height: 1.6;
          }
          
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
          }
          
          .header h1 {
            font-size: 24pt;
            margin-bottom: 10px;
          }
          
          .header p {
            font-size: 14pt;
            color: #666;
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          
          th, td {
            border: 1px solid #ddd;
            padding: 12px;
            text-align: left;
          }
          
          th {
            background-color: #f5f5f5;
            font-weight: bold;
          }
          
          tr:nth-child(even) {
            background-color: #fafafa;
          }
          
          .summary {
            background-color: #f0f9ff;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
          }
          
          .summary-item {
            display: flex;
            justify-content: space-between;
            margin: 10px 0;
            font-size: 14pt;
          }
          
          .summary-item.total {
            font-weight: bold;
            font-size: 16pt;
            border-top: 2px solid #333;
            padding-top: 10px;
            margin-top: 15px;
          }
          
          .footer {
            margin-top: 50px;
            text-align: center;
            font-size: 10pt;
            color: #666;
            border-top: 1px solid #ddd;
            padding-top: 20px;
          }
          
          @media print {
            body {
              padding: 0;
            }
            
            .no-print {
              display: none;
            }
          }
          
          ${styles}
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${title}</h1>
          ${subtitle ? `<p>${subtitle}</p>` : ''}
          <p>Generated: ${new Date().toLocaleString('sk-SK')}</p>
        </div>
        
        ${content}
        
        <div class="footer">
          <p>FinApp - Personal Finance Management</p>
          <p>This is a computer-generated document.</p>
        </div>
        
        <div class="no-print" style="text-align: center; margin-top: 30px;">
          <button onclick="window.print()" style="padding: 10px 20px; font-size: 14pt; cursor: pointer;">
            Print / Save as PDF
          </button>
          <button onclick="window.close()" style="padding: 10px 20px; font-size: 14pt; cursor: pointer; margin-left: 10px;">
            Close
          </button>
        </div>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}

export function generateLoanSchedulePDF(loan: Record<string, string | number>, schedule: Array<Record<string, string | number>>): void {
  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('sk-SK', {
      style: 'currency',
      currency: 'EUR',
    }).format(num);
  };

  const totalPrincipal = schedule.reduce((sum, s) => sum + Number(s.principal_due), 0);
  const totalInterest = schedule.reduce((sum, s) => sum + Number(s.interest_due), 0);
  const totalFees = schedule.reduce((sum, s) => sum + Number(s.fees_due), 0);
  const totalPayment = schedule.reduce((sum, s) => sum + Number(s.total_due), 0);

  const content = `
    <div class="summary">
      <h2>Loan Details</h2>
      <div class="summary-item">
        <span>Lender:</span>
        <span>${loan.lender}</span>
      </div>
      <div class="summary-item">
        <span>Loan Type:</span>
        <span>${loan.loan_type}</span>
      </div>
      <div class="summary-item">
        <span>Principal:</span>
        <span>${formatCurrency(loan.principal)}</span>
      </div>
      <div class="summary-item">
        <span>Annual Rate:</span>
        <span>${loan.annual_rate}%</span>
      </div>
      <div class="summary-item">
        <span>Term:</span>
        <span>${loan.term_months} months</span>
      </div>
      <div class="summary-item">
        <span>Start Date:</span>
        <span>${loan.start_date}</span>
      </div>
    </div>
    
    <h2>Payment Schedule</h2>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Due Date</th>
          <th>Principal</th>
          <th>Interest</th>
          <th>Fees</th>
          <th>Total</th>
          <th>Balance</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${schedule
          .map(
            (s) => `
          <tr>
            <td>${s.installment_no}</td>
            <td>${s.due_date}</td>
            <td>${formatCurrency(s.principal_due)}</td>
            <td>${formatCurrency(s.interest_due)}</td>
            <td>${formatCurrency(s.fees_due)}</td>
            <td>${formatCurrency(s.total_due)}</td>
            <td>${formatCurrency(s.principal_balance_after)}</td>
            <td>${s.status}</td>
          </tr>
        `
          )
          .join('')}
      </tbody>
    </table>
    
    <div class="summary">
      <h2>Summary</h2>
      <div class="summary-item">
        <span>Total Principal:</span>
        <span>${formatCurrency(totalPrincipal)}</span>
      </div>
      <div class="summary-item">
        <span>Total Interest:</span>
        <span>${formatCurrency(totalInterest)}</span>
      </div>
      <div class="summary-item">
        <span>Total Fees:</span>
        <span>${formatCurrency(totalFees)}</span>
      </div>
      <div class="summary-item total">
        <span>Total Payment:</span>
        <span>${formatCurrency(totalPayment)}</span>
      </div>
    </div>
  `;

  generatePDFReport({
    title: 'Loan Payment Schedule',
    subtitle: `${loan.lender} - ${loan.loan_type}`,
    content,
  });
}

export function generateMonthlySummaryPDF(month: string, summary: Record<string, string | number>): void {
  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('sk-SK', {
      style: 'currency',
      currency: 'EUR',
    }).format(num);
  };

  const netIncome = Number(summary.incomes_total) - Number(summary.expenses_total);
  const savingsRate =
    Number(summary.incomes_total) > 0
      ? ((netIncome / Number(summary.incomes_total)) * 100).toFixed(1)
      : '0.0';

  const content = `
    <div class="summary">
      <h2>Income & Expenses</h2>
      <div class="summary-item">
        <span>Total Income:</span>
        <span>${formatCurrency(summary.incomes_total)}</span>
      </div>
      <div class="summary-item">
        <span>Total Expenses:</span>
        <span>${formatCurrency(summary.expenses_total)}</span>
      </div>
      <div class="summary-item total">
        <span>Net Income:</span>
        <span style="color: ${netIncome >= 0 ? 'green' : 'red'}">${formatCurrency(netIncome)}</span>
      </div>
      <div class="summary-item">
        <span>Savings Rate:</span>
        <span>${savingsRate}%</span>
      </div>
    </div>
    
    <div class="summary">
      <h2>Loan Payments</h2>
      <div class="summary-item">
        <span>Principal Paid:</span>
        <span>${formatCurrency(summary.loan_principal_paid)}</span>
      </div>
      <div class="summary-item">
        <span>Interest Paid:</span>
        <span>${formatCurrency(summary.loan_interest_paid)}</span>
      </div>
      <div class="summary-item">
        <span>Fees Paid:</span>
        <span>${formatCurrency(summary.loan_fees_paid)}</span>
      </div>
      <div class="summary-item">
        <span>Remaining Balance:</span>
        <span>${formatCurrency(summary.loans_balance)}</span>
      </div>
    </div>
    
    <div class="summary">
      <h2>Net Worth</h2>
      <div class="summary-item total">
        <span>Net Worth:</span>
        <span style="color: ${Number(summary.net_worth) >= 0 ? 'green' : 'red'}">
          ${formatCurrency(summary.net_worth)}
        </span>
      </div>
    </div>
  `;

  generatePDFReport({
    title: 'Monthly Financial Summary',
    subtitle: month,
    content,
  });
}

