import { addHours, parseISO } from 'date-fns';
import { logger } from '@/shared/logger';

export interface OutagePeriod {
  start: string; // ISO string
  end: string;   // ISO string
}

/**
 * Fetches load-shedding blackout slots for a specific South Africa suburb.
 * Integrates a simulated schedule if the API key is not configured.
 */
export async function getEskomOutages(
  suburbId: string,
  startDate: Date,
  endDate: Date
): Promise<OutagePeriod[]> {
  const apiKey = process.env.ESKOMSEPUSH_API_KEY;

  if (!apiKey) {
    logger.info({}, 'eskomsepush.sandbox_simulator.active');
    return generateMockOutages(startDate, endDate, suburbId);
  }

  try {
    const response = await fetch(`https://api.sepush.co.za/business/2.0/area?id=${suburbId}`, {
      headers: {
        Authorization: apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`EskomSePush API returned status ${response.status}`);
    }

    const data = await response.json();
    const events = data?.events || [];
    const outages: OutagePeriod[] = [];

    events.forEach((event: any) => {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);

      // Check if event overlaps with request window
      if (eventEnd > startDate && eventStart < endDate) {
        outages.push({
          start: eventStart.toISOString(),
          end: eventEnd.toISOString(),
        });
      }
    });

    return outages;
  } catch (err) {
    logger.error({ err }, 'eskomsepush.fetch_outages.failed_using_mock');
    return generateMockOutages(startDate, endDate, suburbId);
  }
}

/**
 * Generates mock outage periods for local development and testing.
 * Blackout period: 14:00 - 16:30 and 20:00 - 22:30 SAST every day.
 */
function generateMockOutages(
  startDate: Date,
  endDate: Date,
  suburbId: string
): OutagePeriod[] {
  const outages: OutagePeriod[] = [];
  const current = new Date(startDate);

  // Loop through days in interval
  while (current <= endDate) {
    const yyyy = current.getFullYear();
    const mm = String(current.getMonth() + 1).padStart(2, '0');
    const dd = String(current.getDate()).padStart(2, '0');

    // Slot 1: 14:00 to 16:30 SAST (UTC+2) -> 12:00 to 14:30 UTC
    outages.push({
      start: `${yyyy}-${mm}-${dd}T12:00:00.000Z`,
      end: `${yyyy}-${mm}-${dd}T14:30:00.000Z`,
    });

    // Slot 2: 20:00 to 22:30 SAST (UTC+2) -> 18:00 to 20:30 UTC
    outages.push({
      start: `${yyyy}-${mm}-${dd}T18:00:00.000Z`,
      end: `${yyyy}-${mm}-${dd}T20:30:00.000Z`,
    });

    current.setDate(current.getDate() + 1);
  }

  return outages;
}
