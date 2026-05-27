import { redirect } from 'next/navigation';

export default function RedirectToSettingsCredits() {
  redirect('/settings?tab=ai-credits');
}
