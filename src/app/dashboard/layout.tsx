import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import React from 'react';

export default async function DashboardLayout({
 children,
}: {
 children: React.ReactNode;
}) {
 const supabase = await createServerClient();
 const { data: { user: authUser } } = await supabase.auth.getUser();
 
 if (!authUser) redirect('/auth/signin-basic');

 return (
  <>
   {children}
  </>
 );
}
