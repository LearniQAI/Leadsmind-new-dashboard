import React from 'react';
import { getPortalSession } from '@/lib/portal/session';
import { createAdminClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import MetaData from '@/hooks/useMetaData';
import { BookOpen, GraduationCap, Play, Award, User, Clock } from 'lucide-react';
import LiveClassCountdown from '@/components/portal/LiveClassCountdown';
import BuyCourseButton from '@/components/portal/BuyCourseButton';

export const dynamic = 'force-dynamic';

export default async function PortalCoursesPage() {
  const session = await getPortalSession();
  if (!session) {
    redirect('/auth/portal/login');
  }

  const { contact, workspace } = session;
  const supabase = createAdminClient();

  // Fetch course enrollments
  const { data: dbEnrollments } = await supabase
    .from('enrollments')
    .select('*, courses(*)')
    .eq('contact_id', contact.id)
    .eq('workspace_id', workspace.id);

  const enrollments = dbEnrollments || [];

  // Fetch total lesson count for each course
  const { data: dbLessonsCount } = await supabase
    .from('course_lessons')
    .select('id, course_id');

  const lessonsCountMap = new Map<string, number>();
  (dbLessonsCount || []).forEach((l: any) => {
    lessonsCountMap.set(l.course_id, (lessonsCountMap.get(l.course_id) || 0) + 1);
  });

  // Fetch completed lessons for the contact
  const completedCountMap = new Map<string, number>();
  if (enrollments.length > 0) {
    const { data: completedRecords } = await supabase
      .from('course_progress')
      .select('id, course_id, lesson_id')
      .eq('contact_id', contact.id);
    
    (completedRecords || []).forEach((r: any) => {
      completedCountMap.set(r.course_id, (completedCountMap.get(r.course_id) || 0) + 1);
    });
  }

  // Fetch expert sessions with instructor details
  const courseIds = enrollments.map(e => e.course_id);
  let sessions: any[] = [];
  if (courseIds.length > 0) {
    const { data: dbSessions } = await supabase
      .from('lms_expert_sessions')
      .select('*, expert:lms_expert_profiles(*)')
      .in('course_id', courseIds)
      .order('start_time', { ascending: true });
    sessions = dbSessions || [];
  }

  // Fetch non-enrolled public courses for upsell (pricing_model !== 'free')
  const enrolledCourseIds = enrollments.map(e => e.course_id);
  let upsellQuery = supabase
    .from('courses')
    .select('*')
    .eq('workspace_id', workspace.id)
    .eq('published', true)
    .neq('pricing_model', 'free');

  if (enrolledCourseIds.length > 0) {
    upsellQuery = upsellQuery.not('id', 'in', `(${enrolledCourseIds.join(',')})`);
  }

  const { data: dbUpsellCourses } = await upsellQuery;
  const upsellCourses = dbUpsellCourses || [];

  return (
    <MetaData pageTitle="My Courses">
      <div className="max-w-6xl mx-auto space-y-8 p-8 md:p-12">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold uppercase tracking-tight font-space">
            Learning <span className="text-[var(--accent2)]">Courses</span>
          </h1>
          <p className="text-[11.5px] text-[var(--t3)] uppercase tracking-[0.2em] mt-2 font-medium">
            Access your enrolled courses, view progress, and join live classes
          </p>
        </div>

        {/* Content grid */}
        {enrollments.length === 0 ? (
          <div className="bg-[var(--n800)] border border-[var(--bdr)] p-16 rounded-3xl flex flex-col items-center justify-center text-center space-y-4 shadow-xl">
            <div className="w-14 h-14 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-center text-[#4a5a82] opacity-55">
              <GraduationCap size={28} />
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--t2)]">No Active Courses</h3>
              <p className="text-xs text-[var(--t3)] mt-1.5 max-w-xs leading-relaxed">
                You are not enrolled in any training courses in this workspace. Contact support to purchase or request enrollment.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in">
            {enrollments.map((e, idx) => {
              const course = e.courses;
              if (!course) return null;

              const totalLessons = lessonsCountMap.get(course.id) || 0;
              const completedLessons = completedCountMap.get(course.id) || 0;
              const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
              const isCompleted = progress === 100;

              const now = new Date();

              // Calculate active countdown banner
              let expiryCountdown = '';
              if (e.expires_at) {
                const expireTime = new Date(e.expires_at).getTime();
                const diffMs = expireTime - now.getTime();
                if (diffMs > 0) {
                  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                  if (diffDays <= 30) {
                    expiryCountdown = `Access expires in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
                  }
                }
              }

              // Find primary expert/instructor
              const courseSessions = sessions.filter(s => s.course_id === course.id);
              const primaryExpert = courseSessions[0]?.expert;

              // Find next upcoming live class
              const upcomingSession = courseSessions.find(s => 
                s.is_live && new Date(s.end_time || s.start_time).getTime() > now.getTime()
              );

              // Position restore path
              const playLink = e.last_lesson_id
                ? `/student/courses/${course.id}?restore=true&lessonId=${e.last_lesson_id}&t=${e.last_position_seconds || 0}`
                : `/student/courses/${course.id}`;

              return (
                <div 
                  key={idx} 
                  className="bg-[var(--n800)] border border-[var(--bdr)] rounded-[24px] overflow-hidden shadow-2xl flex flex-col justify-between hover:border-white/10 hover:translate-y-[-2px] transition-all duration-300 group relative"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#8b5cf6]/5 rounded-full blur-3xl pointer-events-none" />

                  <div>
                    {/* Course Art/Cover image or Gradient Placeholder */}
                    <div className="h-48 w-full relative overflow-hidden bg-gradient-to-br from-[#0b1329] to-[#050914] border-b border-white/5 flex items-center justify-center">
                      {course.thumbnail_url ? (
                        <img 
                          src={course.thumbnail_url} 
                          alt={course.title}
                          className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 flex flex-col items-center justify-center p-6 text-center">
                          <BookOpen size={48} className="text-purple-400/50 mb-2 group-hover:scale-110 transition-transform duration-300" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-[#4a5a82]">LeadsMind LMS Node</span>
                        </div>
                      )}
                      
                      <div className="absolute top-4 left-4">
                        <span className="text-[9px] font-black uppercase px-2.5 py-1 rounded bg-[#080f28]/80 text-[#8b5cf6] border border-[#8b5cf6]/30 backdrop-blur-md">
                          {e.access_type || 'Full Access'}
                        </span>
                      </div>

                      {isCompleted && (
                        <div className="absolute top-4 right-4">
                          <span className="text-[9px] font-black uppercase px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 backdrop-blur-md flex items-center gap-1">
                            <Award size={10} /> Completed
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="p-6 space-y-5">
                      {/* Access Expiry Banner */}
                      {expiryCountdown && (
                        <div className="bg-rose-500/10 text-rose-400 text-xs font-semibold px-3.5 py-2 rounded-xl border border-rose-500/20 flex items-center gap-2">
                          <Clock size={14} className="shrink-0" />
                          <span>{expiryCountdown}</span>
                        </div>
                      )}

                      {/* Title & Description */}
                      <div>
                        <h3 className="text-md font-bold text-[#eef2ff] line-clamp-1 font-space uppercase tracking-wide">
                          {course.title}
                        </h3>
                        <p className="text-xs text-[#94a3c8] line-clamp-2 mt-2 leading-relaxed font-sans">
                          {course.description || 'Access educational content, videos, assessments, and study materials.'}
                        </p>
                      </div>

                      {/* Instructor lookup bio details */}
                      {primaryExpert && (
                        <div className="p-3.5 bg-white/[0.02] rounded-xl border border-white/5 flex gap-3 items-start">
                          <div className="w-8 h-8 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0 mt-0.5">
                            <User size={14} />
                          </div>
                          <div className="space-y-0.5">
                            <p className="text-[10px] font-bold text-[#4a5a82] uppercase tracking-wider">Instructor</p>
                            <p className="text-xs font-bold text-[#eef2ff]">{primaryExpert.name}</p>
                            {primaryExpert.bio && (
                              <p className="text-[10px] text-[#94a3c8] line-clamp-1 italic">{primaryExpert.bio}</p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Live Class Countdown */}
                      {upcomingSession && (
                        <LiveClassCountdown 
                          startTime={upcomingSession.start_time} 
                          meetingUrl={upcomingSession.meeting_url}
                          endTime={upcomingSession.end_time}
                        />
                      )}

                      {/* Progress Metrics */}
                      <div className="space-y-2 pt-1">
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-wider text-[#4a5a82]">
                          <span>Academic Progress</span>
                          <span className="text-[#8b5cf6]">{completedLessons} / {totalLessons} Lectures ({progress}%)</span>
                        </div>
                        <div className="h-1.5 w-full bg-[#111d47] rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-purple-500 to-[#8b5cf6] rounded-full transition-all duration-500" 
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="p-6 border-t border-white/5 bg-[#080f28]/25 flex items-center justify-between gap-3">
                    {isCompleted ? (
                      <a
                        href={`/api/student/courses/${course.id}/certificate`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-4 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-wider transition-all"
                      >
                        <Award size={12} /> Get Certificate
                      </a>
                    ) : (
                      <div />
                    )}

                    <Link
                      href={playLink}
                      className="inline-flex items-center gap-1.5 px-5 h-10 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-black uppercase tracking-wider transition-all shadow-lg shadow-purple-600/10 hover:shadow-purple-600/20 active:scale-95 ml-auto"
                    >
                      {e.last_lesson_id ? 'Resume Learning' : 'Start Learning'} <Play size={10} fill="white" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Upsell Course Grid */}
        {upsellCourses.length > 0 && (
          <div className="space-y-6 pt-8 border-t border-[var(--bdr)]">
            <div>
              <h2 className="text-xl font-bold uppercase tracking-tight font-space">
                Available <span className="text-[var(--accent2)]">Courses</span>
              </h2>
              <p className="text-[11px] text-[var(--t3)] uppercase tracking-[0.2em] mt-1.5 font-medium">
                Enhance your skillset with additional training courses
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {upsellCourses.map((course, idx) => {
                const totalLessons = lessonsCountMap.get(course.id) || 0;

                return (
                  <div 
                    key={idx} 
                    className="bg-[var(--n800)] border border-[var(--bdr)] rounded-[24px] overflow-hidden shadow-2xl flex flex-col justify-between hover:border-white/10 hover:translate-y-[-2px] transition-all duration-300 group relative"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#8b5cf6]/5 rounded-full blur-3xl pointer-events-none" />

                    <div>
                      {/* Course Art/Cover image or Gradient Placeholder */}
                      <div className="h-48 w-full relative overflow-hidden bg-gradient-to-br from-[#0b1329] to-[#050914] border-b border-white/5 flex items-center justify-center">
                        {course.thumbnail_url ? (
                          <img 
                            src={course.thumbnail_url} 
                            alt={course.title}
                            className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 flex flex-col items-center justify-center p-6 text-center">
                            <BookOpen size={48} className="text-purple-400/50 mb-2 group-hover:scale-110 transition-transform duration-300" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-[#4a5a82]">LeadsMind LMS Node</span>
                          </div>
                        )}
                        
                        <div className="absolute top-4 left-4">
                          <span className="text-[9px] font-black uppercase px-2.5 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 backdrop-blur-md">
                            {course.pricing_model === 'subscription' ? 'Subscription' : 'One-time Buy'}
                          </span>
                        </div>
                      </div>

                      <div className="p-6 space-y-4">
                        {/* Title & Description */}
                        <div>
                          <h3 className="text-md font-bold text-[#eef2ff] line-clamp-1 font-space uppercase tracking-wide">
                            {course.title}
                          </h3>
                          <p className="text-xs text-[#94a3c8] line-clamp-2 mt-2 leading-relaxed font-sans">
                            {course.description || 'Access educational content, videos, assessments, and study materials.'}
                          </p>
                        </div>

                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider text-[#4a5a82]">
                          <span>Academic Lectures</span>
                          <span className="text-purple-400">{totalLessons} Lectures available</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions footer */}
                    <div className="p-6 border-t border-white/5 bg-[#080f28]/25 flex items-center justify-between gap-3">
                      <div className="text-sm font-bold text-[#eef2ff] font-space">
                        R {Number(course.price || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                      </div>
                      <BuyCourseButton courseId={course.id} price={course.price || 0} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </MetaData>
  );
}
