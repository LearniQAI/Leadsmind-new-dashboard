// AI Bookkeeping engine (Session B) — turns a processed financial_documents row (raw
// extracted text, or a vision-extraction result) into real accounting_transactions /
// document_receipts rows, with AI-suggested categorization, anomaly flags, tax-deduction
// candidate flags, and receipt<->transaction reconciliation.
//
// Explicitly NOT a filed tax calculation (PRD Section 5/Non-goals) — tax_deduction_candidate
// only surfaces common deductible-expense KEYWORDS for the user/their accountant to review.
import OpenAI from 'openai';
import { runCreditGuard, consumeAICredit } from '@/lib/ai/creditGuard';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface ExtractedTransaction {
  date: string; // YYYY-MM-DD
  description: string;
  amount: number; // negative = debit/expense, positive = credit/income
}

/**
 * A prompt instruction alone ("use the header's date range to resolve the year") is not
 * reliable — live-tested and confirmed the model still defaults to a hallucinated year when
 * a row's date lacks its own explicit year (e.g. "05/07"). This deterministically corrects
 * the year in code instead of trusting the model to have applied its own instruction: tries
 * the statement period's start-year and end-year for each transaction's (month, day) and
 * keeps whichever actually falls inside the real period. Returns the original date
 * unchanged (never silently "fixed" to something worse) if neither year fits — callers can
 * detect that case by comparing the returned date to the input.
 */
export function clampDateToStatementPeriod(txDate: string, periodStart: string | null, periodEnd: string | null): string {
  if (!periodStart || !periodEnd) return txDate;
  const tx = new Date(txDate + 'T00:00:00Z');
  const start = new Date(periodStart + 'T00:00:00Z');
  const end = new Date(periodEnd + 'T23:59:59Z');
  if (isNaN(tx.getTime()) || isNaN(start.getTime()) || isNaN(end.getTime())) return txDate;

  const month = tx.getUTCMonth();
  const day = tx.getUTCDate();
  const candidateYears = [...new Set([start.getUTCFullYear(), end.getUTCFullYear()])];
  for (const year of candidateYears) {
    const candidate = new Date(Date.UTC(year, month, day));
    if (candidate >= start && candidate <= end) {
      return candidate.toISOString().slice(0, 10);
    }
  }
  return txDate;
}

/**
 * Live-tested and confirmed: GPT-4o vision does not reliably read a 4-digit year even when
 * asked to report it directly from the statement header — re-running the exact same image
 * twice produced two different wrong years (2023, then 2028), so a "periodStart/periodEnd"
 * self-reported BY THE MODEL is not a trustworthy correction source for a vision-only
 * (no-text-layer) document; garbage in, garbage out. The one piece of real, un-hallucinatable
 * ground truth available is the server's own current clock — a financial document is
 * virtually always uploaded close to its real period, so this recency heuristic is more
 * reliable than trusting the model's own guess about a year, whether per-row or in a
 * self-reported period. Given a (month, day), pick the year that makes the date most recent
 * without being in the future relative to `now`.
 */
export function inferPlausibleYear(month: number, day: number, now: Date = new Date()): number {
  const thisYear = now.getUTCFullYear();
  const thisYearCandidate = new Date(Date.UTC(thisYear, month, day, 23, 59, 59));
  return thisYearCandidate <= now ? thisYear : thisYear - 1;
}

/**
 * A statement-reported period is only trustworthy as a correction source if its own year is
 * itself plausible relative to "now" — otherwise the model's self-report is exactly the same
 * kind of hallucination the correction is meant to fix. Anything more than 2 years away from
 * the current year (in either direction) is treated as unusable.
 */
export function isPeriodPlausible(periodStart: string | null, now: Date = new Date()): boolean {
  if (!periodStart) return false;
  const year = new Date(periodStart + 'T00:00:00Z').getUTCFullYear();
  if (isNaN(year)) return false;
  return Math.abs(year - now.getUTCFullYear()) <= 2;
}

/**
 * Resolves the real, deterministic date-correction for one extracted transaction: prefers
 * the statement's own reported period IF that period itself looks plausible against the
 * server clock, otherwise falls back to the recency heuristic anchored to `now` — never
 * trusts a per-row year guess on its own. Returns the corrected date and whether it still
 * needs human review (nothing plausible could be derived).
 */
export function resolveTransactionDate(
  txDate: string,
  periodStart: string | null,
  periodEnd: string | null,
  now: Date = new Date()
): { date: string; needsReview: boolean } {
  const tx = new Date(txDate + 'T00:00:00Z');
  if (isNaN(tx.getTime())) return { date: txDate, needsReview: true };

  if (isPeriodPlausible(periodStart, now)) {
    const viaPeriod = clampDateToStatementPeriod(txDate, periodStart, periodEnd);
    if (viaPeriod !== txDate) return { date: viaPeriod, needsReview: false };
  }

  const inferredYear = inferPlausibleYear(tx.getUTCMonth(), tx.getUTCDate(), now);
  const corrected = new Date(Date.UTC(inferredYear, tx.getUTCMonth(), tx.getUTCDate())).toISOString().slice(0, 10);
  // Still flag for review when the row's own year disagreed with both the period and the
  // recency heuristic — the amount/description are likely fine, but the date was a genuine
  // guess and should not be silently trusted in a financial record.
  const needsReview = tx.getUTCFullYear() !== inferredYear;
  return { date: corrected, needsReview };
}

export interface ExtractedReceipt {
  vendor: string | null;
  date: string | null;
  amount: number | null;
  note: string | null;
}

// Keyword -> chart-of-accounts code, matched against SA_STANDARD_ACCOUNTS seeded by
// src/app/actions/chartOfAccounts.ts. Deliberately simple substring matching, not AI —
// tax-relevance is a fixed, auditable rule set, not something worth spending an AI call on,
// and PRD Section 4.3 frames this as "surfacing candidates", not a judgment call.
const TAX_DEDUCTION_KEYWORDS: Array<{ pattern: RegExp; accountCode: string }> = [
  { pattern: /software|subscription|saas|microsoft|adobe|google workspace/i, accountCode: '5500' },
  { pattern: /rent\b/i, accountCode: '5200' },
  { pattern: /electricity|water|utilities|eskom/i, accountCode: '5300' },
  { pattern: /advertis|marketing|facebook ads|google ads/i, accountCode: '5400' },
  { pattern: /flight|hotel|travel|uber|bolt|mileage/i, accountCode: '5600' },
  { pattern: /accounting|legal|attorney|consultant fee|professional fee/i, accountCode: '5700' },
  { pattern: /bank charge|bank fee|transaction fee/i, accountCode: '5900' },
  { pattern: /insurance/i, accountCode: '5900' },
  { pattern: /office supplies|stationery|printer|toner/i, accountCode: '5500' },
];

export function suggestTaxDeductionAccountCode(description: string): string | null {
  const match = TAX_DEDUCTION_KEYWORDS.find(k => k.pattern.test(description));
  return match?.accountCode ?? null;
}

/**
 * Uses GPT-4o-mini to turn raw text-layer PDF text into structured transaction rows AND
 * suggest which of the workspace's REAL chart-of-accounts entries each row belongs to (the
 * model picks from a supplied list of real {code, name, type} — it never invents an account,
 * so a suggestion always maps to a row that actually exists for this workspace).
 */
export async function structureTransactionsFromText(
  rawText: string,
  accounts: Array<{ code: string; name: string; type: string }>
): Promise<{ transactions: (ExtractedTransaction & { suggestedAccountCode: string | null; dateNeedsReview?: boolean })[]; periodStart: string | null; periodEnd: string | null }> {
  const accountList = accounts.map(a => `${a.code} — ${a.name} (${a.type})`).join('\n');

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'You convert raw, messily-extracted bank statement text into structured transaction rows. ' +
          'Return JSON: {"periodStart": "YYYY-MM-DD" | null, "periodEnd": "YYYY-MM-DD" | null, "transactions": [{"date": "YYYY-MM-DD", "description": string, "amount": number (negative for money out/debit, positive for money in/credit), "suggestedAccountCode": string | null}]}. ' +
          'periodStart/periodEnd are the statement\'s own stated date range, read literally from the text. ' +
          'Only include real transaction line items — never opening/closing balance lines. ' +
          'For suggestedAccountCode, pick the single closest match from this exact list of the workspace\'s real accounts (use the code exactly as given, or null if nothing fits):\n' +
          accountList,
      },
      { role: 'user', content: rawText.slice(0, 12000) },
    ],
  });

  const raw = completion.choices[0]?.message?.content || '{"transactions":[]}';
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { transactions: [], periodStart: null, periodEnd: null };
  }

  const periodStart: string | null = parsed.periodStart || null;
  const periodEnd: string | null = parsed.periodEnd || null;
  const rawTransactions = Array.isArray(parsed.transactions) ? parsed.transactions : [];

  // Same deterministic year-correction safety net as the vision path — text-layer dates are
  // usually explicit (and were correct in testing), but this costs nothing when they already
  // agree, and protects against the same class of bug for any layout that omits the year.
  const transactions = rawTransactions.map((t: any) => {
    const resolved = resolveTransactionDate(t.date, periodStart, periodEnd);
    return { ...t, date: resolved.date, dateNeedsReview: resolved.needsReview };
  });

  return { transactions, periodStart, periodEnd };
}

/** Vision extraction for a scanned/photographed statement image — reused, productionized version of the Session A spike, now with per-row account suggestion from the workspace's real chart of accounts. */
export async function structureTransactionsFromImage(
  imageBase64: string,
  mimeType: string,
  accounts: Array<{ code: string; name: string; type: string }>
): Promise<{ transactions: (ExtractedTransaction & { suggestedAccountCode: string | null; dateNeedsReview?: boolean })[]; periodStart: string | null; periodEnd: string | null }> {
  const accountList = accounts.map(a => `${a.code} — ${a.name} (${a.type})`).join('\n');

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'You extract bank statement transactions from an image. Return JSON: {"periodStart": "YYYY-MM-DD" | null, "periodEnd": "YYYY-MM-DD" | null, "transactions": [{"date": "YYYY-MM-DD", "description": string, "amount": number (negative for debit/money out, positive for credit/money in), "suggestedAccountCode": string | null}]}. ' +
          'periodStart/periodEnd are the statement\'s own stated date range from its header (read it literally, do not infer) — this is used to correct row dates that only show day/month, so get it right even if you are unsure about individual row years. ' +
          'For each transaction date, use your best guess at the year if not explicit on that row. Only include real transaction rows, never opening/closing balance lines. ' +
          'For suggestedAccountCode, pick the closest match from this exact list of the workspace\'s real accounts (use the code exactly as given, or null if nothing fits):\n' +
          accountList,
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Extract every transaction row from this bank statement image, plus the statement\'s own period (periodStart/periodEnd) from its header.' },
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
        ] as any,
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content || '{"transactions":[]}';
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { transactions: [], periodStart: null, periodEnd: null };
  }

  const periodStart: string | null = parsed.periodStart || null;
  const periodEnd: string | null = parsed.periodEnd || null;
  const rawTransactions = Array.isArray(parsed.transactions) ? parsed.transactions : [];

  // The model's own per-row year guess is unreliable when a row shows no explicit year
  // (live-confirmed: it defaults to a stale training-adjacent year like 2023 instead of the
  // real statement year) — deterministically re-derive it from the statement's own real
  // period instead of trusting that guess.
  const transactions = rawTransactions.map((t: any) => {
    const resolved = resolveTransactionDate(t.date, periodStart, periodEnd);
    return { ...t, date: resolved.date, dateNeedsReview: resolved.needsReview };
  });

  return { transactions, periodStart, periodEnd };
}

export async function extractReceiptFromImage(imageBase64: string, mimeType: string): Promise<ExtractedReceipt> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'Extract vendor, date, total amount, and a short category-relevant note from this receipt/invoice image. ' +
          'For "amount", use the final TOTAL the customer paid (the line labelled TOTAL, or the largest/final amount) — ' +
          'never a VAT-only, tax-only, or subtotal line, even if it appears near the bottom. ' +
          'Return JSON: {"vendor": string | null, "date": "YYYY-MM-DD" | null, "amount": number | null, "note": string | null}.',
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Extract the receipt details.' },
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
        ] as any,
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content || '{}';
  try {
    return JSON.parse(raw);
  } catch {
    return { vendor: null, date: null, amount: null, note: null };
  }
}

// Typed loosely on purpose — every caller passes createAdminClient()/createClient() from a
// different generated-types generic instantiation (see the worker route's `as any` passes),
// and this module's job is generic Postgres CRUD, not schema-specific typing.
type AdminClient = any;

/**
 * Inserts extracted transactions for a workspace, applying real anomaly/tax flags:
 *  - duplicate: another accounting_transactions row in this workspace within 3 days with the
 *    same amount and a similar description (case-insensitive substring match either way).
 *  - large/out-of-pattern: |amount| > 3x the median |amount| of the workspace's last 90 days
 *    of bank_feed transactions (computed BEFORE inserting the new batch, so the new batch
 *    can't skew its own baseline).
 *  - tax_deduction_candidate: keyword match against TAX_DEDUCTION_KEYWORDS.
 * Returns the inserted rows plus a coverage-gap check (any of the last 3 calendar months with
 * zero bank_feed transactions for this workspace).
 */
export async function insertTransactionsWithFlags(
  admin: AdminClient,
  workspaceId: string,
  documentId: string,
  transactions: (ExtractedTransaction & { suggestedAccountCode: string | null; dateNeedsReview?: boolean })[],
  accounts: Array<{ id: string; code: string }>
) {
  const accountByCode = new Map(accounts.map(a => [a.code, a.id]));

  // Baseline for the "unusually large" check, computed before this batch is inserted.
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const { data: recentTx } = await admin
    .from('accounting_transactions')
    .select('total_amount')
    .eq('workspace_id', workspaceId)
    .eq('source_type', 'bank_feed')
    .gte('date', ninetyDaysAgo);
  const magnitudes = (recentTx || []).map((t: any) => Math.abs(Number(t.total_amount))).sort((a, b) => a - b);
  const median = magnitudes.length ? magnitudes[Math.floor(magnitudes.length / 2)] : 0;
  const largeThreshold = median > 0 ? median * 3 : Infinity;

  const inserted: any[] = [];
  for (const tx of transactions) {
    if (!tx.date || typeof tx.amount !== 'number' || Number.isNaN(tx.amount)) continue;

    // Duplicate check — same workspace, same amount, description overlap, within 3 days.
    const dateObj = new Date(tx.date);
    const windowStart = new Date(dateObj.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const windowEnd = new Date(dateObj.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const { data: candidates } = await admin
      .from('accounting_transactions')
      .select('id, description, total_amount')
      .eq('workspace_id', workspaceId)
      .eq('total_amount', tx.amount)
      .gte('date', windowStart)
      .lte('date', windowEnd);
    const isDuplicate = (candidates || []).some((c: any) =>
      c.description?.toLowerCase().includes(tx.description.toLowerCase().slice(0, 15)) ||
      tx.description.toLowerCase().includes((c.description || '').toLowerCase().slice(0, 15))
    );

    const isLarge = Math.abs(tx.amount) > largeThreshold;
    const taxCode = suggestTaxDeductionAccountCode(tx.description);
    const accountCode = tx.suggestedAccountCode || taxCode;
    const accountId = accountCode ? accountByCode.get(accountCode) || null : null;

    // A date that couldn't be reconciled against the statement's own real period (see
    // clampDateToStatementPeriod) must never be silently trusted — surface it as an anomaly
    // so a human reviews it, rather than recording a possibly-wrong year unflagged.
    const notes: string[] = [];
    if (isLarge) notes.push(`Unusually large: ${Math.abs(tx.amount).toFixed(2)} vs typical ${median.toFixed(2)}`);
    if (tx.dateNeedsReview) notes.push(`Date "${tx.date}" could not be confirmed against the statement's own period — please verify.`);

    const { data: row, error } = await admin
      .from('accounting_transactions')
      .insert({
        workspace_id: workspaceId,
        date: tx.date,
        description: tx.description,
        reference: `doc-${documentId}-${inserted.length}`,
        source_type: 'bank_feed',
        document_id: documentId,
        total_amount: tx.amount,
        currency: 'ZAR',
        account_id: accountId,
        category_source: accountId ? 'ai_suggested' : 'manual',
        is_duplicate_flag: isDuplicate,
        is_anomaly_flag: isLarge || !!tx.dateNeedsReview,
        anomaly_note: notes.length ? notes.join(' ') : null,
        tax_deduction_candidate: !!taxCode,
      })
      .select()
      .single();
    if (!error && row) inserted.push(row);
  }

  // Coverage-gap check: any of the last 3 full calendar months with zero bank_feed rows.
  const gapMonths: string[] = [];
  const now = new Date();
  for (let i = 1; i <= 3; i++) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
    const { count } = await admin
      .from('accounting_transactions')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('source_type', 'bank_feed')
      .gte('date', monthStart.toISOString().slice(0, 10))
      .lte('date', monthEnd.toISOString().slice(0, 10));
    if (!count) gapMonths.push(monthStart.toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' }));
  }

  return { inserted, gapMonths };
}

/** Matches a receipt against an unclaimed bank_feed transaction: same workspace, amount within 2%, date within 5 days, not already matched by another receipt. */
export async function reconcileReceipt(admin: AdminClient, workspaceId: string, receipt: { id: string; amount: number | null; receipt_date: string | null }) {
  if (receipt.amount == null || !receipt.receipt_date) return null;

  const dateObj = new Date(receipt.receipt_date);
  const windowStart = new Date(dateObj.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const windowEnd = new Date(dateObj.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const amountLow = -Math.abs(receipt.amount) * 1.02;
  const amountHigh = -Math.abs(receipt.amount) * 0.98;

  const { data: candidates } = await admin
    .from('accounting_transactions')
    .select('id, total_amount, date')
    .eq('workspace_id', workspaceId)
    .eq('source_type', 'bank_feed')
    .gte('date', windowStart)
    .lte('date', windowEnd)
    .gte('total_amount', amountLow)
    .lte('total_amount', amountHigh);

  const { data: alreadyMatched } = await admin
    .from('document_receipts')
    .select('matched_transaction_id')
    .eq('workspace_id', workspaceId)
    .not('matched_transaction_id', 'is', null);
  const claimedIds = new Set((alreadyMatched || []).map((r: any) => r.matched_transaction_id));

  const match = (candidates || []).find((c: any) => !claimedIds.has(c.id));
  if (!match) return null;

  await admin.from('document_receipts').update({ matched_transaction_id: match.id }).eq('id', receipt.id);
  return match.id;
}

export { runCreditGuard, consumeAICredit };
