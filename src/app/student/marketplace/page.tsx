import React from 'react';
import Link from 'next/link';
import { ChevronLeft, ShoppingBag } from 'lucide-react';
import { getMarketplaceCourses, getMyEnrollments } from '@/app/actions/studentEnrollments';
import { getUserRole } from '@/lib/auth';
import MarketplaceClient from './MarketplaceClient';

export default async function MarketplacePage() {
  const [coursesRes, enrolledRes, userRole] = await Promise.all([
    getMarketplaceCourses(),
    getMyEnrollments(),
    getUserRole()
  ]);

  const courses = coursesRes.data || [];
  const enrolledCourses = enrolledRes.data || [];
  const enrolledCourseIds = enrolledCourses.map((e: any) => e.id);

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-white/5 pb-6">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-white/40 font-mono uppercase tracking-widest mb-1.5">
            <Link href="/student" className="hover:text-white transition-all flex items-center gap-0.5">
              <ChevronLeft size={12} /> Dashboard
            </Link>
            <span>/</span>
            <span className="text-white/60">Catalog</span>
          </div>
          <h1 className="text-3xl font-space-grotesk font-black uppercase text-white tracking-tight flex items-center gap-2">
            Course <span className="text-primary">Marketplace</span>
          </h1>
        </div>
      </div>

      {/* Catalog items grid */}
      {courses.length > 0 ? (
        <MarketplaceClient 
          courses={courses} 
          enrolledCourseIds={enrolledCourseIds} 
          userRole={userRole}
        />
      ) : (
        <div className="text-center py-20 bg-[#080f28] rounded-2xl border border-dashed border-white/5 space-y-4">
          <div className="w-16 h-16 bg-white/[0.02] border border-white/5 rounded-full flex items-center justify-center mx-auto text-white/30">
            <ShoppingBag size={24} />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">No Courses Available</h4>
            <p className="text-xs text-white/40 max-w-sm mx-auto leading-relaxed">
              There are no courses published in the catalog at this time. Please check back later.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
