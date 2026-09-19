import { createAdminClient } from '@/lib/supabase/server';
import { courseLandingUrl, courseOrigin, platformOriginFromEnv } from './coursePublicUrl';

export interface CoursePublicBase {
  /** https://{custom domain} when the course is bound to an active domain, else the platform origin. */
  origin: string;
  /** Live landing-page URL, or null if the course has neither a bound url_path nor a slug. */
  landingUrl: string | null;
  /** The bound domain's hostname, or null on the platform domain. */
  hostname: string | null;
}

/**
 * Resolves where a course really lives. Fail-soft by design: any lookup problem falls back to
 * the platform origin, so an email or checkout redirect is never blocked by this helper.
 */
export async function getCoursePublicBase(courseId: string): Promise<CoursePublicBase> {
  const platformOrigin = platformOriginFromEnv();
  try {
    const admin = createAdminClient();
    const { data: course } = await admin
      .from('courses')
      .select('slug, url_path, domain_id')
      .eq('id', courseId)
      .maybeSingle();

    let hostname: string | null = null;
    if (course?.domain_id) {
      const { data: domain } = await admin
        .from('domain_configurations')
        .select('hostname, status')
        .eq('id', course.domain_id)
        .maybeSingle();
      if (domain?.status === 'active') hostname = domain.hostname;
    }

    return {
      origin: courseOrigin({ hostname, platformOrigin }),
      landingUrl: courseLandingUrl({ hostname, urlPath: course?.url_path, slug: course?.slug, platformOrigin }),
      hostname,
    };
  } catch {
    return { origin: platformOrigin, landingUrl: null, hostname: null };
  }
}
