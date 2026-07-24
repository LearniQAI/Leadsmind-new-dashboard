// TEMPORARY Task 18 Phase 3 test-only route. Thin pass-through to the real refundInvoice()
// server action so it can be exercised over real HTTP with a real session cookie (Server
// Actions can't be invoked directly from a plain script/curl without the Next.js action-id
// protocol). Deleted at the end of Phase 3 verification — not part of the shipped feature.
import { NextRequest, NextResponse } from 'next/server';
import { refundInvoice } from '@/app/actions/refunds';

export async function POST(req: NextRequest) {
  try {
    const { invoiceId, reason, amount } = await req.json();
    const result = await refundInvoice(invoiceId, reason, amount);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'error' }, { status: err.httpStatus || 500 });
  }
}
