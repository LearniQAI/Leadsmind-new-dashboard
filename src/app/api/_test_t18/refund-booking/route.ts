// TEMPORARY Task 18 Phase 3 test-only route. See refund-invoice/route.ts for rationale.
import { NextRequest, NextResponse } from 'next/server';
import { refundBookingLease } from '@/app/actions/refunds';

export async function POST(req: NextRequest) {
  try {
    const { leaseId, reason } = await req.json();
    const result = await refundBookingLease(leaseId, reason);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'error' }, { status: err.httpStatus || 500 });
  }
}
