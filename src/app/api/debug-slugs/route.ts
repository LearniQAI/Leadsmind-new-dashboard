import { createServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const supabase = await createServerClient();
    const { data, error } = await supabase.from('booking_calendars').select('name, slug');
    return NextResponse.json({ data, error });
}
