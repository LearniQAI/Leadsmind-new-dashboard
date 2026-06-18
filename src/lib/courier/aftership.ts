const BASE = 'https://api.aftership.com/tracking/2026-01'
const key = () => process.env.AFTERSHIP_API_KEY || ''

async function call(path: string, init?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'as-api-key': key(), 'Content-Type': 'application/json', ...(init?.headers || {}) },
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json?.meta?.message || `AfterShip ${res.status}`)
  return json.data
}

export async function createTracking(trackingNumber: string, slug?: string) {
  const data = await call('/trackings', { method: 'POST', body: JSON.stringify({ tracking: { tracking_number: trackingNumber, ...(slug ? { slug } : {}) } }) })
  return data?.tracking || data
}

export async function getTracking(slug: string, trackingNumber: string) {
  const data = await call(`/trackings/${slug}/${trackingNumber}`)
  return data?.tracking || data
}
