/**
 * Core Invoicing Calculations Logic
 * Handles precision rounding and total compilations for invoices and quotes.
 */

export interface LineItem {
  quantity: number;
  rate: number;
  taxRate: number;
  discount?: number;
}

export interface InvoiceTotals {
  subtotal: number;
  taxTotal: number;
  grandTotal: number;
}

/**
 * Rounds a number to a specific decimal precision
 */
export const round = (value: number, decimals: number = 2): number => {
  const multiplier = Math.pow(10, decimals);
  return Math.round((value + Number.EPSILON) * multiplier) / multiplier;
};

/**
 * Calculates line tax based on quantity, rate, and tax rate percentage
 * Formula: round(Qty * Rate * (Tax Rate / 100), 2)
 */
export const calculateLineTax = (item: LineItem): number => {
  return round(item.quantity * item.rate * (item.taxRate / 100));
};

/**
 * Calculates the totals for an entire invoice/quote
 * Formula:
 * Subtotal = Sum(Qty * Rate) - Discounts
 * Grand Total = Subtotal + Line Tax + Shipping Charges + Adjustment
 */
export function calculateInvoiceTotals(
  items: LineItem[],
  shipping: number = 0,
  adjustment: number = 0
): InvoiceTotals {
  const safeItems = items || [];
  const subtotal = safeItems.reduce((acc, item) => {
    const rate = Number(item.rate) || 0;
    const qty = Number(item.quantity) || 0;
    return acc + (rate * qty);
  }, 0);

  const taxTotal = safeItems.reduce((acc, item) => {
    return acc + calculateLineTax(item);
  }, 0);

  const grandTotal = subtotal + taxTotal + (Number(shipping) || 0) + (Number(adjustment) || 0);

  return {
    subtotal: Number(subtotal.toFixed(2)),
    taxTotal: Number(taxTotal.toFixed(2)),
    grandTotal: Number(grandTotal.toFixed(2)),
  };
};

/**
 * Splits an already-collected gross amount (e.g. a payment-gateway/webhook invoice, where the
 * customer has already been charged a fixed total and that total must not change) into a
 * VAT-exclusive subtotal + tax_total, rather than adding tax on top the way calculateInvoiceTotals
 * does for a manually-built line-item invoice. The gross amount is always preserved exactly as
 * paid; only its subtotal/tax_total breakdown changes based on the workspace's vat_rate.
 * Formula: subtotal = grossAmount / (1 + taxRate/100), taxTotal = grossAmount - subtotal.
 */
export function calculateInclusiveTax(
  grossAmount: number,
  taxRatePercent: number
): { subtotal: number; taxTotal: number } {
  const gross = Number(grossAmount) || 0;
  const rate = Number(taxRatePercent) || 0;
  if (!rate) {
    return { subtotal: round(gross), taxTotal: 0 };
  }
  const subtotal = round(gross / (1 + rate / 100));
  const taxTotal = round(gross - subtotal);
  return { subtotal, taxTotal };
}
