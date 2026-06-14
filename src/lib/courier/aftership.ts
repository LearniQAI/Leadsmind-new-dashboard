const BASE = 'https://api.aftership.com/v4'
const key = () => process.env.AFTERSHIP_API_KEY || ''

async function call(path: string, init?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'aftership-api-key': key(), 'Content-Type': 'application/json', ...(init?.headers || {}) },
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json?.meta?.message || `AfterShip ${res.status}`)
  return json.data
}

export async function createTracking(trackingNumber: string, slug?: string) {
  return call('/trackings', { method: 'POST', body: JSON.stringify({ tracking: { tracking_number: trackingNumber, ...(slug ? { slug } : {}) } }) })
}

export async function getTracking(slug: string, trackingNumber: string) {
  return call(`/trackings/${slug}/${trackingNumber}`)
}
