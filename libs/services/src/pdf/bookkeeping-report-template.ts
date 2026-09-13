// HTML template for the AI-bookkeeping report PDF — mirrors the existing
// cert-templates.ts / cert-generator.ts split (pure HTML render function here, Puppeteer
// launch logic in the sibling *-generator.ts file), reusing that established pattern rather
// than inventing a new one.
export interface BookkeepingReportData {
  document: { file_name: string; document_kind: string; created_at: string };
  transactions: Array<{
    date: string; description: string; total_amount: number; currency: string;
    is_duplicate_flag: boolean; is_anomaly_flag: boolean; anomaly_note: string | null;
    tax_deduction_candidate: boolean; account: { code: string; name: string } | null;
  }>;
  receipts: Array<{ vendor: string | null; receipt_date: string | null; amount: number | null; matched_transaction_id: string | null }>;
  summary: {
    currency: string | null; totalIncome: number | null; totalExpenses: number | null; net: number | null;
    mixedCurrencies: boolean;
    byCurrency: Array<{ currency: string; totalIncome: number; totalExpenses: number; net: number; transactionCount: number }>;
    transactionCount: number; duplicateCount: number; anomalyCount: number; taxCandidateCount: number;
  };
  disclaimer: string;
}

function esc(s: string | null | undefined): string {
  return (s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

/** Formats an amount using the REAL currency it's actually in — never a hardcoded symbol. */
function fmtMoney(n: number, currency: string | null): string {
  try {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: currency || 'ZAR' }).format(n);
  } catch {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(n);
  }
}

export function renderBookkeepingReportHtml(data: BookkeepingReportData): string {
  const { document, transactions, receipts, summary, disclaimer } = data;

  const metricsHtml = !summary.mixedCurrencies
    ? `<div class="metrics">
      <div class="metric"><div class="label">Total Income</div><div class="val">${fmtMoney(summary.totalIncome ?? 0, summary.currency)}</div></div>
      <div class="metric"><div class="label">Total Expenses</div><div class="val">${fmtMoney(summary.totalExpenses ?? 0, summary.currency)}</div></div>
      <div class="metric"><div class="label">Net</div><div class="val">${fmtMoney(summary.net ?? 0, summary.currency)}</div></div>
      <div class="metric"><div class="label">Flagged Items</div><div class="val">${summary.duplicateCount + summary.anomalyCount}</div></div>
    </div>`
    : `<div class="disclaimer">⚠ This document contains transactions in more than one currency
        (${summary.byCurrency.map(c => c.currency).join(', ')}) — a combined total would be
        meaningless, so totals are shown separately per currency below.</div>
      <div class="metrics">
      ${summary.byCurrency.map(c => `
        <div class="metric"><div class="label">${esc(c.currency)} — Income / Expenses / Net</div><div class="val">${fmtMoney(c.totalIncome, c.currency)} / ${fmtMoney(c.totalExpenses, c.currency)} / ${fmtMoney(c.net, c.currency)}</div></div>
      `).join('')}
        <div class="metric"><div class="label">Flagged Items</div><div class="val">${summary.duplicateCount + summary.anomalyCount}</div></div>
      </div>`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:Arial,sans-serif;font-size:11px;color:#111827;padding:28px;}
    h1{font-size:18px;color:#0A2540;margin-bottom:4px;}
    .sub{color:#6B7280;font-size:11px;margin-bottom:18px;}
    .disclaimer{background:#FFFBEB;border:1px solid #FDE68A;border-radius:6px;padding:10px 14px;font-size:10px;color:#92400E;margin-bottom:18px;line-height:1.5;}
    .metrics{display:flex;flex-wrap:wrap;gap:12px;margin-bottom:18px;}
    .metric{flex:1;min-width:140px;background:#F9FAFB;border-radius:8px;padding:10px 12px;}
    .metric .label{font-size:9px;color:#6B7280;}
    .metric .val{font-size:15px;font-weight:700;color:#111827;}
    table{width:100%;border-collapse:collapse;margin-bottom:16px;}
    th{text-align:left;background:#0A2540;color:#fff;padding:6px 8px;font-size:9.5px;}
    td{padding:5px 8px;border-bottom:1px solid #E5E7EB;font-size:9.5px;}
    .flag{font-size:8.5px;font-weight:700;padding:1px 6px;border-radius:8px;margin-right:3px;}
    .flag-dup{background:#FEF3C7;color:#92400E;}
    .flag-anom{background:#FEE2E2;color:#991B1B;}
    .flag-tax{background:#DCFCE7;color:#166534;}
  </style></head>
  <body>
    <h1>AI Bookkeeping Report</h1>
    <div class="sub">${esc(document.file_name)} &middot; Generated ${new Date().toLocaleDateString('en-ZA')}</div>
    <div class="disclaimer">⚠ ${esc(disclaimer)}</div>
    ${metricsHtml}
    <table>
      <tr><th>Date</th><th>Description</th><th>Category</th><th>Amount</th><th>Flags</th></tr>
      ${transactions.map(t => `
        <tr>
          <td>${esc(t.date)}</td>
          <td>${esc(t.description)}</td>
          <td>${t.account ? esc(`${t.account.code} ${t.account.name}`) : '—'}</td>
          <td>${t.total_amount < 0 ? '-' : ''}${fmtMoney(Math.abs(t.total_amount), t.currency)}</td>
          <td>
            ${t.is_duplicate_flag ? '<span class="flag flag-dup">Possible duplicate</span>' : ''}
            ${t.is_anomaly_flag ? '<span class="flag flag-anom">Unusual</span>' : ''}
            ${t.tax_deduction_candidate ? '<span class="flag flag-tax">Tax candidate</span>' : ''}
          </td>
        </tr>`).join('')}
    </table>
    ${receipts.length ? `
      <table>
        <tr><th>Receipt Vendor</th><th>Date</th><th>Amount</th><th>Matched to bank transaction?</th></tr>
        ${receipts.map(r => `
          <tr>
            <td>${esc(r.vendor)}</td>
            <td>${esc(r.receipt_date)}</td>
            <td>${fmtMoney(r.amount ?? 0, null)}</td>
            <td>${r.matched_transaction_id ? 'Yes' : 'No — unmatched'}</td>
          </tr>`).join('')}
      </table>` : ''}
  </body></html>`;
}
