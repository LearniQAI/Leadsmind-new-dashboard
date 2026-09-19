import type { MetadataRoute } from "next";
import { resolvePublicSiteContext } from "@/lib/blog/publicWorkspace";

const baseUrl = "https://www.leadsmind.io";

// This app is ~95% authenticated business software (CRM, HR, finance, admin, etc.)
// behind a single shared root layout, with a handful of genuinely public routes.
// An allow-list is safer here than trying to enumerate every private segment:
// disallow everything by default, then explicitly allow the known public surface.
export default async function robots(): Promise<MetadataRoute.Robots> {
 // A tenant's connected custom domain gets its OWN robots.txt: its own origin and sitemap (never
 // the platform's), and public by default — the domain only serves customer-facing surfaces
 // (see lib/domains/customDomainRoutes.ts), so only the private/transactional ones are blocked.
 const { workspaceId, origin } = await resolvePublicSiteContext();
 if (workspaceId) {
  return {
   rules: {
    userAgent: "*",
    allow: "/",
    disallow: ["/api/", "/auth/", "/student", "/portal", "/checkout/", "/meet/", "/preview/", "/book/manage/", "/book/waitlist/"],
   },
   sitemap: [`${origin}/sitemap.xml`],
   host: origin,
  };
 }

 return {
  rules: {
   userAgent: "*",
   disallow: "/",
   allow: [
    "/$",
    "/blog",
    "/articles",
    "/solutions",
    "/terms",
    "/privacy-policy",
    "/p/",
    "/join/",
    "/book/",
    "/track/",
    "/r/",
    "/widget/",
    "/embed/",
    "/public/",
   ],
  },
  sitemap: [
   `${baseUrl}/sitemap.xml`,
   `${baseUrl}/sitemap-articles.xml`,
   `${baseUrl}/sitemap-marketing.xml`,
  ],
  host: baseUrl,
 };
}
