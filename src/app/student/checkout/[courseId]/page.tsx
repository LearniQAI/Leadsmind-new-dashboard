import React from 'react';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { createServerClient } from '@/lib/supabase/server';
import { requireAuth, getCurrentWorkspaceId } from '@/lib/auth';
import { getOrCreateStudentContact } from '@/app/actions/studentEnrollments';
import CheckoutClient from './CheckoutClient';
interface CheckoutPageProps {
  params: {
    courseId: string;
  };
}

export default async function CheckoutPage({ params }: CheckoutPageProps) {
  const { courseId } = params;
  const user = await requireAuth();

  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) {
    redirect('/student/marketplace');
  }

  const supabase = await createServerClient();

  // Fetch course details
  const { data: course } = await supabase
    .from('courses')
    .select('*')
    .eq('id', courseId)
    .single();

  if (!course) {
    notFound();
  }

  // Resolve student contact details
  const contactId = await getOrCreateStudentContact(workspaceId);
  if (!contactId) {
    redirect('/student/marketplace');
  }

  // Double check if already enrolled
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id')
    .eq('course_id', courseId)
    .eq('contact_id', contactId)
    .maybeSingle();

  if (enrollment) {
    redirect(`/student/courses/${courseId}`);
  }

  // Count active enrollments to check cap constraint
  let isCapped = false;
  if (course.enrolment_cap !== null && course.enrolment_cap > 0) {
    const { count } = await supabase
      .from('enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', courseId);
    
    if (count !== null && count >= course.enrolment_cap) {
      isCapped = true;
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back button */}
      <div className="flex items-center gap-1.5 text-xs text-white/40 font-mono uppercase tracking-widest">
        <Link href="/student/marketplace" className="hover:text-white transition-all flex items-center gap-0.5">
          <ChevronLeft size={12} /> Back to Catalog
        </Link>
        <span>/</span>
        <span className="text-white/60">Secure Checkout</span>
      </div>

      <CheckoutClient
        course={course}
        user={user}
        workspaceId={workspaceId}
        contactId={contactId}
        isCapped={isCapped}
      />
    </div>
  );
}
