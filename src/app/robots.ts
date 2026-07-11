import type { MetadataRoute } from "next";

const baseUrl = "https://www.leadsmind.io";

// This app is ~95% authenticated business software (CRM, HR, finance, admin, etc.)
// behind a single shared root layout, with a handful of genuinely public routes.
// An allow-list is safer here than trying to enumerate every private segment:
// disallow everything by default, then explicitly allow the known public surface.
export default function robots(): MetadataRoute.Robots {
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
