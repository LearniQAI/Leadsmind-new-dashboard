import { redirect } from 'next/navigation';

export default function RedirectToBillingTab() {
 redirect('/settings?tab=pricing');
}
