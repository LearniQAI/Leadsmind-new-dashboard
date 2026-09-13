import ExcelJS from 'exceljs';
import type { BookkeepingReportData } from '../../../libs/services/src/pdf/bookkeeping-report-template';

/** Generates the downloadable AI Bookkeeping Report as an .xlsx workbook — the disclaimer is baked into row 1 of the Summary sheet so it's present in every export, not just the PDF. */
export async function generateBookkeepingReportExcel(data: BookkeepingReportData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'LeadsMind AI Bookkeeping';
  workbook.created = new Date();

  const summarySheet = workbook.addWorksheet('Summary');
  summarySheet.getColumn(1).width = 28;
  summarySheet.getColumn(2).width = 60;

  const disclaimerCell = summarySheet.getCell('A1');
  disclaimerCell.value = `⚠ ${data.disclaimer}`;
  disclaimerCell.font = { italic: true, color: { argb: 'FF92400E' } };
  disclaimerCell.alignment = { wrapText: true };
  summarySheet.mergeCells('A1:B1');
  summarySheet.getRow(1).height = 45;

  summarySheet.addRow([]);
  summarySheet.addRow(['Document', data.document.file_name]);
  summarySheet.addRow(['Generated', new Date().toLocaleDateString('en-ZA')]);
  summarySheet.addRow([]);
  if (!data.summary.mixedCurrencies) {
    summarySheet.addRow([`Total Income (${data.summary.currency || 'ZAR'})`, data.summary.totalIncome]);
    summarySheet.addRow([`Total Expenses (${data.summary.currency || 'ZAR'})`, data.summary.totalExpenses]);
    summarySheet.addRow([`Net (${data.summary.currency || 'ZAR'})`, data.summary.net]);
  } else {
    summarySheet.addRow(['Multiple currencies', 'Totals shown separately per currency below — a combined total would be meaningless.']);
    for (const c of data.summary.byCurrency) {
      summarySheet.addRow([`Total Income (${c.currency})`, c.totalIncome]);
      summarySheet.addRow([`Total Expenses (${c.currency})`, c.totalExpenses]);
      summarySheet.addRow([`Net (${c.currency})`, c.net]);
    }
  }
  summarySheet.addRow(['Transactions', data.summary.transactionCount]);
  summarySheet.addRow(['Possible Duplicates', data.summary.duplicateCount]);
  summarySheet.addRow(['Unusual/Anomaly Flags', data.summary.anomalyCount]);
  summarySheet.addRow(['Tax-Deduction Candidates', data.summary.taxCandidateCount]);

  const txSheet = workbook.addWorksheet('Transactions');
  txSheet.columns = [
    { header: 'Date', key: 'date', width: 14 },
    { header: 'Description', key: 'description', width: 40 },
    { header: 'Category', key: 'category', width: 26 },
    { header: 'Amount', key: 'amount', width: 14 },
    { header: 'Currency', key: 'currency', width: 10 },
    { header: 'Possible Duplicate', key: 'dup', width: 16 },
    { header: 'Unusual', key: 'anom', width: 12 },
    { header: 'Tax Candidate', key: 'tax', width: 14 },
  ];
  txSheet.getRow(1).font = { bold: true };
  for (const t of data.transactions) {
    txSheet.addRow({
      date: t.date,
      description: t.description,
      category: t.account ? `${t.account.code} ${t.account.name}` : '',
      amount: t.total_amount,
      currency: t.currency || 'ZAR',
      dup: t.is_duplicate_flag ? 'Yes' : '',
      anom: t.is_anomaly_flag ? 'Yes' : '',
      tax: t.tax_deduction_candidate ? 'Yes' : '',
    });
  }

  if (data.receipts.length) {
    const receiptSheet = workbook.addWorksheet('Receipts');
    receiptSheet.columns = [
      { header: 'Vendor', key: 'vendor', width: 30 },
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Amount', key: 'amount', width: 14 },
      { header: 'Matched to bank transaction?', key: 'matched', width: 26 },
    ];
    receiptSheet.getRow(1).font = { bold: true };
    for (const r of data.receipts) {
      receiptSheet.addRow({ vendor: r.vendor, date: r.receipt_date, amount: r.amount, matched: r.matched_transaction_id ? 'Yes' : 'No — unmatched' });
    }
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
