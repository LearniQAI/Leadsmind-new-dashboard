import { createServerClient } from '@/lib/supabase/server';

/**
 * Checks if a specific date is a public holiday in South Africa for the user's province.
 */
export async function isPublicHoliday(
  userId: string,
  date: Date
): Promise<boolean> {
  try {
    const supabase = await createServerClient();

    // 1. Fetch user's province configuration
    const { data: userProfile } = await supabase
      .from('users')
      .select('province')
      .eq('id', userId)
      .maybeSingle();

    const province = userProfile?.province || 'GP';

    // Format date to YYYY-MM-DD
    const dateString = date.toISOString().split('T')[0];

    // 2. Query public holidays for that date, matching province 'ALL' or specific province
    const { data: holiday } = await supabase
      .from('sa_public_holidays')
      .select('id')
      .eq('holiday_date', dateString)
      .or(`province.eq.ALL,province.eq.${province}`)
      .maybeSingle();

    return !!holiday;
  } catch (error) {
    console.error('[sa-holidays] Error checking holiday:', error);
    return false;
  }
}

/**
 * Fetches all South African public holidays for the user's province in a date range.
 */
export async function getHolidaysInRange(
  userId: string,
  startDateStr: string,
  endDateStr: string
): Promise<string[]> {
  try {
    const supabase = await createServerClient();

    // 1. Fetch user's province
    const { data: userProfile } = await supabase
      .from('users')
      .select('province')
      .eq('id', userId)
      .maybeSingle();

    const province = userProfile?.province || 'GP';

    // 2. Query holidays in range
    const { data: holidays } = await supabase
      .from('sa_public_holidays')
      .select('holiday_date')
      .gte('holiday_date', startDateStr)
      .lte('holiday_date', endDateStr)
      .or(`province.eq.ALL,province.eq.${province}`);

    return (holidays || []).map(h => h.holiday_date);
  } catch (error) {
    console.error('[sa-holidays] Error fetching holidays in range:', error);
    return [];
  }
}
