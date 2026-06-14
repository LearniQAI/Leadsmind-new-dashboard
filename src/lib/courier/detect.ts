// Lightweight tracking-number → likely courier. AfterShip also auto-detects server-side,
// so this is a fast local hint; AfterShip's detection is authoritative on createTracking.
export function detectCourier(tn: string): string | null {
  const t = tn.trim().toUpperCase()
  if (/^1Z[0-9A-Z]{16}$/.test(t)) return 'ups'
  if (/^(\d{12}|\d{15}|\d{20,22})$/.test(t)) return 'fedex'
  if (/^[A-Z]{2}\d{9}[A-Z]{2}$/.test(t)) return 'postnet-or-universal' // S10 (intl + SAPO)
  if (/^TG\d+/.test(t)) return 'the-courier-guy'
  if (/^RAM/i.test(t)) return 'ram'
  if (/^\d{10}$/.test(t)) return 'dhl'
  return null // let AfterShip decide
}
