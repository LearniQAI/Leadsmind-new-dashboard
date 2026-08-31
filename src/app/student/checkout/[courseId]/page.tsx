import { redirect } from 'next/navigation';

interface CheckoutPageProps {
  params: { courseId: string };
  searchParams: { [k: string]: string | string[] | undefined };
}

/**
 * The checkout flow now lives at the PUBLIC route /checkout/[courseId] so logged-out visitors
 * arriving from a course landing page can convert without being bounced to sign-in (this route
 * is under src/app/student/, whose layout.tsx enforces requireAuth()).
 *
 * This stub keeps every existing deep link and the authenticated marketplace's
 * router.push('/student/checkout/...') working by forwarding to the new route, which handles
 * both the authenticated and guest cases.
 */
export default function LegacyCheckoutRedirect({ params, searchParams }: CheckoutPageProps) {
  const status = typeof searchParams?.status === 'string' ? `?status=${searchParams.status}` : '';
  redirect(`/checkout/${params.courseId}${status}`);
}
