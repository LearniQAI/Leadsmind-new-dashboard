// LeadsMind 8-status model (PRD Part 10). Maps AfterShip + raw courier tags to one of these.
export type NormalStatus =
  | 'PENDING' | 'INFO_RECEIVED' | 'IN_TRANSIT' | 'OUT_FOR_DELIVERY'
  | 'DELIVERED' | 'EXCEPTION' | 'FAILED_ATTEMPT' | 'RETURNED'

const AFTERSHIP_MAP: Record<string, NormalStatus> = {
  Pending: 'PENDING',
  InfoReceived: 'INFO_RECEIVED',
  InTransit: 'IN_TRANSIT',
  OutForDelivery: 'OUT_FOR_DELIVERY',
  AttemptFail: 'FAILED_ATTEMPT',
  Delivered: 'DELIVERED',
  Exception: 'EXCEPTION',
  Expired: 'EXCEPTION',
}

export function normaliseStatus(raw: string | null | undefined): NormalStatus {
  if (!raw) return 'PENDING'
  if (AFTERSHIP_MAP[raw]) return AFTERSHIP_MAP[raw]
  const s = raw.toLowerCase()
  if (s.includes('out for delivery')) return 'OUT_FOR_DELIVERY'
  if (s.includes('deliver')) return 'DELIVERED'
  if (s.includes('return')) return 'RETURNED'
  if (s.includes('fail') || s.includes('attempt')) return 'FAILED_ATTEMPT'
  if (s.includes('except') || s.includes('held') || s.includes('customs')) return 'EXCEPTION'
  if (s.includes('transit') || s.includes('depart') || s.includes('arriv')) return 'IN_TRANSIT'
  if (s.includes('label') || s.includes('info')) return 'INFO_RECEIVED'
  return 'IN_TRANSIT'
}

export function isUrgent(s: NormalStatus) {
  return s === 'OUT_FOR_DELIVERY' || s === 'EXCEPTION' || s === 'FAILED_ATTEMPT' || s === 'DELIVERED'
}
