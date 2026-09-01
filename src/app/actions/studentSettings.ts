'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/server';
import { getUser } from '@/lib/auth';
import { logger } from '@/shared/logger';

/**
 * Student profile / settings.
 *
 * Identity model (confirmed against the live schema):
 *  - The Supabase auth user is keyed by `user.email`.
 *  - `public.users` holds ONE per-user profile row (first_name/last_name) — this is what
 *    getCurrentProfile() / the dashboard "Welcome back, …" reads.
 *  - `public.contacts` holds ONE row PER WORKSPACE the student has ever been a contact in
 *    (this test account has 2), each with its own first_name/last_name — this is what the
 *    course player sidebar and the certificate PDF read.
 *
 * Decision: "my profile" is ONE identity. A name change writes to the users row AND to
 * EVERY contacts row matching the email, so every denormalised copy stays in sync. The page
 * never exposes per-workspace name editing — that split is an implementation detail, not a
 * feature.
 *
 * Email is read-only here: it's the cross-workspace identity key (users + all contacts +
 * enrolments resolve by it), so a real change has to propagate to all of those. Supabase's
 * built-in updateUser({email}) confirmation flow only changes the auth record — wiring the
 * downstream propagation is its own task, so email change is deferred (see the page copy).
 * Password change reuses the app's existing account.ts `updatePassword` (in-session
 * supabase.auth.updateUser) and auth.ts `forgotPassword` (branded reset email).
 */

const NAME_MAX = 80;

export async function getStudentSettings(): Promise<{
  data: {
    email: string;
    firstName: string;
    lastName: string;
    workspaceContactCount: number;
    courseUpdatesEmail: boolean;
  } | null;
}> {
  try {
    const user = await getUser();
    if (!user?.email) return { data: null };

    const db = createAdminClient();
    const [{ data: userRow }, { data: contactRows }] = await Promise.all([
      db.from('users').select('first_name, last_name').eq('id', user.id).maybeSingle(),
      db.from('contacts').select('first_name, last_name, notification_preferences').eq('email', user.email),
    ]);

    const firstContact = (contactRows || [])[0];
    const np = (firstContact?.notification_preferences || {}) as Record<string, any>;

    return {
      data: {
        email: user.email,
        firstName: userRow?.first_name || firstContact?.first_name || '',
        lastName: userRow?.last_name || firstContact?.last_name || '',
        workspaceContactCount: (contactRows || []).length,
        // opt-out model: absent key => on, matching the existing notification_preferences keys
        courseUpdatesEmail: np.course_updates_email !== false,
      },
    };
  } catch (err) {
    logger.error({ err }, 'student_settings.get.failed');
    return { data: null };
  }
}

export async function updateStudentName(input: { firstName: string; lastName: string }) {
  try {
    const user = await getUser();
    if (!user?.email) return { error: 'Not authenticated' };

    const firstName = String(input.firstName || '').trim();
    const lastName = String(input.lastName || '').trim();
    if (!firstName) return { error: 'First name is required.' };
    if (firstName.length > NAME_MAX || lastName.length > NAME_MAX) {
      return { error: `Name must be ${NAME_MAX} characters or fewer.` };
    }

    const db = createAdminClient();

    // 1. per-user profile row (dashboard / getCurrentProfile)
    const { error: uErr } = await db
      .from('users')
      .update({ first_name: firstName, last_name: lastName })
      .eq('id', user.id);
    if (uErr) throw uErr;

    // 2. every contact row for this identity (course player sidebar, certificate PDF)
    const { error: cErr } = await db
      .from('contacts')
      .update({ first_name: firstName, last_name: lastName })
      .eq('email', user.email);
    if (cErr) throw cErr;

    revalidatePath('/', 'layout');
    return { success: true };
  } catch (err) {
    logger.error({ err }, 'student_settings.update_name.failed');
    return { error: 'Could not save your name. Please try again.' };
  }
}

export async function updateStudentNotificationPref(input: { courseUpdatesEmail: boolean }) {
  try {
    const user = await getUser();
    if (!user?.email) return { error: 'Not authenticated' };

    const db = createAdminClient();
    const { data: rows, error: readErr } = await db
      .from('contacts')
      .select('id, notification_preferences')
      .eq('email', user.email);
    if (readErr) throw readErr;

    for (const r of rows || []) {
      const merged = {
        ...((r.notification_preferences as Record<string, any>) || {}),
        course_updates_email: !!input.courseUpdatesEmail,
      };
      const { error } = await db
        .from('contacts')
        .update({ notification_preferences: merged })
        .eq('id', r.id);
      if (error) throw error;
    }

    return { success: true };
  } catch (err) {
    logger.error({ err }, 'student_settings.update_notif_pref.failed');
    return { error: 'Could not save your preference. Please try again.' };
  }
}
