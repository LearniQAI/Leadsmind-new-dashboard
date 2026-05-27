import { redirect } from 'next/navigation';

export default function RedirectToSettings() {
  redirect('/settings?tab=ai');
}
