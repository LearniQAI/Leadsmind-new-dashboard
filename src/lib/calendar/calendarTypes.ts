// Single source of truth for booking_calendars.calendar_type — every place
// that lists, labels, or branches on calendar type should import from here
// rather than repeating the raw string list (this replaces several previously
// independent copies in CalendarSettingsModal, CalendarToolbar, CalendarPagesView).
//
// Webinar (2026-09-13): added as a real, first-class type — a PEER of
// class_booking, not a rename of it. Both flow through the exact same
// group-session machinery (capacity cap, fn_secure_booking_or_waitlist,
// per-attendee booking_waitlists records, waitlist offer/accept/cancel,
// video-conferencing modes). See docs/calendar-webinar-feature.md for the
// full Step 1 audit and the reasoning for NOT giving Webinar an uncapped/
// view-only mode — the connected video providers' APIs this project
// integrates (Google Meet conferenceData, Zoom's regular /users/me/meetings,
// Teams' regular /me/onlineMeetings) are standard meeting links, not the
// providers' separate large-scale webinar/broadcast products, so an
// artificially uncapped Webinar type would be a false promise.

export type CalendarType =
  | 'personal'
  | 'round_robin'
  | 'collective'
  | 'class_booking'
  | 'service_menu'
  | 'event'
  | 'webinar';

export interface CalendarTypeOption {
  value: CalendarType;
  /** Shown in the Engine Type selector + filter tabs. */
  label: string;
  /** Group-session types share capacity/waitlist/per-attendee behavior. */
  isGroupSession: boolean;
}

export const CALENDAR_TYPE_OPTIONS: CalendarTypeOption[] = [
  { value: 'personal', label: 'Personal Booking', isGroupSession: false },
  { value: 'round_robin', label: 'Round Robin (Team)', isGroupSession: false },
  { value: 'collective', label: 'Collective Booking', isGroupSession: false },
  { value: 'class_booking', label: 'Class/Group', isGroupSession: true },
  { value: 'webinar', label: 'Webinar', isGroupSession: true },
];

/** class_booking and webinar both use the capacity/waitlist/per-attendee model. */
export const GROUP_SESSION_TYPES: readonly CalendarType[] = ['class_booking', 'webinar'];

export function isGroupSessionType(type: string | null | undefined): boolean {
  return !!type && (GROUP_SESSION_TYPES as readonly string[]).includes(type);
}

/** Human label for a raw calendar_type value — never render the raw enum string. */
export function getCalendarTypeLabel(type: string | null | undefined): string {
  const known = CALENDAR_TYPE_OPTIONS.find((o) => o.value === type);
  if (known) return known.label;
  if (!type) return 'Booking';
  // service_menu / event / any future value we haven't labeled yet.
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * The noun used for "how many people" copy on the public page / confirmation
 * flow — real, distinct wording per type rather than a generic "Group session"
 * leaking onto a webinar (or vice versa).
 */
export function getGroupSessionNoun(type: string | null | undefined): string {
  return type === 'webinar' ? 'Webinar' : 'Group session';
}

/**
 * Sensible default capacity per type when an admin first switches a calendar
 * to a group-session type — reflects the real difference in framing (Step
 * 1.2): a Class is typically small/participatory, a Webinar is one host
 * presenting to many. Both are still real, enforced hard caps — see the
 * capacity-ceiling warning below for why "unlimited" isn't offered.
 */
export const DEFAULT_GROUP_CAPACITY: Partial<Record<CalendarType, number>> = {
  class_booking: 12,
  webinar: 100,
};

/**
 * Step 1.3 finding, surfaced honestly: this project's Google Meet / Zoom /
 * Teams integrations (Task 70) all create REGULAR meeting links via each
 * provider's standard meeting API — not the providers' separate, separately
 * licensed large-scale webinar/broadcast products (Zoom Webinars, Teams live
 * events, Meet's streaming add-on). A regular meeting's real participant
 * ceiling depends entirely on the connected account's plan — commonly in the
 * 100-300 range, occasionally higher on enterprise tiers — and is NOT
 * something this app can query or guarantee. Setting a Webinar's capacity
 * well above that with one of these modes selected risks the booking page
 * promising more seats than the actual video call can hold.
 *
 * This is a courtesy warning, not a hard block — the workspace may have a
 * verified enterprise plan that supports more, or may be using in_person/
 * custom_link/internal_meet (LeadsMind's own room, which has no such vendor
 * ceiling). Returns null when there's nothing to warn about.
 */
export const VIDEO_MEETING_CAPACITY_CEILING = 100;
const PROVIDER_LABEL: Record<string, string> = {
  google_meet: 'Google Meet',
  zoom: 'Zoom',
  teams: 'Microsoft Teams',
};

export function getCapacityCeilingWarning(
  calendarType: string | null | undefined,
  meetingMode: string | null | undefined,
  capacity: number | null | undefined
): string | null {
  if (!isGroupSessionType(calendarType)) return null;
  if (!meetingMode || !(meetingMode in PROVIDER_LABEL)) return null;
  if (!capacity || capacity <= VIDEO_MEETING_CAPACITY_CEILING) return null;

  const provider = PROVIDER_LABEL[meetingMode];
  return (
    `${capacity} attendees may exceed what a standard ${provider} meeting link can actually hold — ` +
    `this connects to a regular ${provider} meeting (not ${provider}'s separate large-scale webinar/broadcast product), ` +
    `and real capacity depends on the connected account's plan (commonly ${VIDEO_MEETING_CAPACITY_CEILING}-300). ` +
    `Verify your plan supports this many, or lower capacity / use LeadsMind's built-in video room.`
  );
}
