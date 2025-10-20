/**
 * CSV Export utilities
 * Export data to CSV format without external dependencies
 */

export interface ExportColumn {
  key: string;
  label: string;
  format?: (value: string | number) => string;
}

export function exportToCSV<T extends Record<string, string | number>>(
  data: T[],
  columns: ExportColumn[],
  filename: string
): void {
  // Create CSV header
  const header = columns.map((col) => col.label).join(',');

  // Create CSV rows
  const rows = data.map((row) =>
    columns
      .map((col) => {
        const value = row[col.key];
        const formatted = col.format ? col.format(value) : String(value ?? '');
        // Escape quotes and wrap in quotes if contains comma or quote
        if (formatted.includes(',') || formatted.includes('"') || formatted.includes('\n')) {
          return `"${formatted.replace(/"/g, '""')}"`;
        }
        return formatted;
      })
      .join(',')
  );

  // Combine header and rows
  const csv = [header, ...rows].join('\n');

  // Create blob and download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, filename);
}

export function exportLoanScheduleToCSV(
  schedule: Array<Record<string, string | number>>,
  loanName: string
): void {
  const columns: ExportColumn[] = [
    { key: 'installment_no', label: 'Installment' },
    { key: 'due_date', label: 'Due Date' },
    {
      key: 'principal_due',
      label: 'Principal',
      format: (v) => formatCurrency(v),
    },
    {
      key: 'interest_due',
      label: 'Interest',
      format: (v) => formatCurrency(v),
    },
    {
      key: 'fees_due',
      label: 'Fees',
      format: (v) => formatCurrency(v),
    },
    {
      key: 'total_due',
      label: 'Total',
      format: (v) => formatCurrency(v),
    },
    {
      key: 'principal_balance_after',
      label: 'Balance',
      format: (v) => formatCurrency(v),
    },
    { key: 'status', label: 'Status' },
  ];

  const filename = `loan-schedule-${sanitizeFilename(loanName)}-${getDateString()}.csv`;
  exportToCSV(schedule, columns, filename);
}

export function exportExpensesToCSV(expenses: Array<Record<string, string | number>>): void {
  const columns: ExportColumn[] = [
    { key: 'date', label: 'Date' },
    { key: 'description', label: 'Description' },
    { key: 'category', label: 'Category' },
    {
      key: 'amount',
      label: 'Amount',
      format: (v) => formatCurrency(v),
    },
    { key: 'notes', label: 'Notes' },
  ];

  const filename = `expenses-${getDateString()}.csv`;
  exportToCSV(expenses, columns, filename);
}

export function exportIncomesToCSV(incomes: Array<Record<string, string | number>>): void {
  const columns: ExportColumn[] = [
    { key: 'date', label: 'Date' },
    { key: 'description', label: 'Description' },
    { key: 'category', label: 'Category' },
    {
      key: 'amount',
      label: 'Amount',
      format: (v) => formatCurrency(v),
    },
    { key: 'notes', label: 'Notes' },
  ];

  const filename = `incomes-${getDateString()}.csv`;
  exportToCSV(incomes, columns, filename);
}

export function exportMonthlySummaryToCSV(summaries: Array<Record<string, string | number>>): void {
  const columns: ExportColumn[] = [
    { key: 'month', label: 'Month' },
    {
      key: 'incomes_total',
      label: 'Total Incomes',
      format: (v) => formatCurrency(v),
    },
    {
      key: 'expenses_total',
      label: 'Total Expenses',
      format: (v) => formatCurrency(v),
    },
    {
      key: 'loan_principal_paid',
      label: 'Loan Principal',
      format: (v) => formatCurrency(v),
    },
    {
      key: 'loan_interest_paid',
      label: 'Loan Interest',
      format: (v) => formatCurrency(v),
    },
    {
      key: 'loans_balance',
      label: 'Loans Balance',
      format: (v) => formatCurrency(v),
    },
    {
      key: 'net_worth',
      label: 'Net Worth',
      format: (v) => formatCurrency(v),
    },
  ];

  const filename = `monthly-summary-${getDateString()}.csv`;
  exportToCSV(summaries, columns, filename);
}

// Helper functions

function formatCurrency(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0.00';
  return num.toFixed(2);
}

function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-z0-9]/gi, '-').toLowerCase();
}

function getDateString(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

