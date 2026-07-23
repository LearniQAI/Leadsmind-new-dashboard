import { createServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
    // Default-deny: only NODE_ENV === 'development' explicitly allows this debug endpoint.
    // The previous guard denied only the single string 'production' and allowed everything
    // else through — including an unset/misconfigured NODE_ENV in a real deployed environment,
    // which would leave this leaking real booking_calendars data with zero auth.
    if (process.env.NODE_ENV !== 'development') {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const supabase = await createServerClient();
    const { data, error } = await supabase.from('booking_calendars').select('name, slug');
    return NextResponse.json({ data, error });
}
