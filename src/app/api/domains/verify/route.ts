import { NextRequest, NextResponse } from 'next/server'
import { verifyDns } from '@/lib/domains/verify'

export async function POST(req: NextRequest) {
  try {
    const { domainId } = await req.json()
    if (!domainId) {
      return NextResponse.json({ error: 'domainId is required' }, { status: 400 })
    }

    const result = await verifyDns(domainId)
    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
