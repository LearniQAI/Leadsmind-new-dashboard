import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSlugs() {
    const { data, error } = await supabase.from('booking_calendars').select('name, slug');
    if (error) {
        console.error('Error:', error);
        return;
    }
    console.log('Available Slugs:', JSON.stringify(data, null, 2));
}

checkSlugs();
