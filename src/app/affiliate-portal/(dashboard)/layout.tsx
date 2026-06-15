import { getAuthenticatedAffiliate } from '@/app/actions/affiliates';
import { redirect } from 'next/navigation';

export default async function AffiliateDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const affiliate = await getAuthenticatedAffiliate();
  if (!affiliate) {
    redirect('/affiliate-portal/login');
  }

  return (
    <div className="min-h-screen bg-[#04091a] text-white">
      {children}
    </div>
  );
}
