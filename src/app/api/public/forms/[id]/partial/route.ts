import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

const cookieName = (formId: string) => `lm_partial_owner_${formId}`;
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const matches = (value: string | undefined, expected: string | null) => {
  if (!value || !expected) return false;
  const left = Buffer.from(hash(value)); const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
};
const ownerCookie = (response: NextResponse, formId: string, token: string) => response.cookies.set(cookieName(formId), token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: `/api/public/forms/${formId}`, maxAge: 60 * 60 * 24 * 30 });

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const formId = params.id;
  const body = await request.json();
  if (body.formId !== formId || typeof body.sessionId !== 'string' || body.sessionId.length < 20) return NextResponse.json({ error: 'Invalid partial submission request' }, { status: 400 });
  const admin = createAdminClient();
  const { data: form } = await admin.from('forms').select('id').eq('id', formId).eq('status', 'published').maybeSingle();
  if (!form) return NextResponse.json({ error: 'Form not found' }, { status: 404 });
  const { data: existing } = await admin.from('form_partial_submissions').select('id, owner_token_hash').eq('form_id', formId).eq('session_id', body.sessionId).maybeSingle();
  const supplied = request.cookies.get(cookieName(formId))?.value;
  if (existing && !matches(supplied, existing.owner_token_hash)) return NextResponse.json({ error: 'Partial session not owned by this browser' }, { status: 403 });
  const owner = supplied || randomBytes(32).toString('base64url');
  const payload = { form_id: formId, session_id: body.sessionId, field_values: body.values || {}, current_step_id: body.stepId || null, completion_percentage: Number(body.completionPercentage) || 0, email: body.email || null, metadata: body.metadata || {}, ...(existing ? {} : { owner_token_hash: hash(owner) }) };
  const { data, error } = await admin.from('form_partial_submissions').upsert(payload, { onConflict: 'form_id,session_id' }).select('id, updated_at').single();
  if (error) return NextResponse.json({ error: 'Unable to save partial submission' }, { status: 500 });
  const response = NextResponse.json({ data }); if (!supplied) ownerCookie(response, formId, owner); return response;
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const formId = params.id; const admin = createAdminClient(); const token = request.nextUrl.searchParams.get('recoveryToken'); const sessionId = request.nextUrl.searchParams.get('sessionId');
  let query = admin.from('form_partial_submissions').select('*').eq('form_id', formId);
  if (token) query = query.eq('recovery_token', token).gt('recovery_token_expires_at', new Date().toISOString());
  else if (sessionId) query = query.eq('session_id', sessionId);
  else return NextResponse.json({ error: 'Missing session reference' }, { status: 400 });
  const { data, error } = await query.maybeSingle(); if (error || !data) return NextResponse.json({ error: 'Partial submission not found' }, { status: 404 });
  const supplied = request.cookies.get(cookieName(formId))?.value;
  if (!token && !matches(supplied, data.owner_token_hash)) return NextResponse.json({ error: 'Partial session not owned by this browser' }, { status: 403 });
  const response = NextResponse.json({ data });
  if (token) { const owner = randomBytes(32).toString('base64url'); await admin.from('form_partial_submissions').update({ owner_token_hash: hash(owner) }).eq('id', data.id); ownerCookie(response, formId, owner); }
  return response;
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const formId = params.id; const sessionId = request.nextUrl.searchParams.get('sessionId'); if (!sessionId) return NextResponse.json({ error: 'Missing session id' }, { status: 400 });
  const admin = createAdminClient(); const { data } = await admin.from('form_partial_submissions').select('id, owner_token_hash').eq('form_id', formId).eq('session_id', sessionId).maybeSingle();
  if (!data || !matches(request.cookies.get(cookieName(formId))?.value, data.owner_token_hash)) return NextResponse.json({ error: 'Partial session not owned by this browser' }, { status: 403 });
  await admin.from('form_partial_submissions').delete().eq('id', data.id); return NextResponse.json({ success: true });
}
