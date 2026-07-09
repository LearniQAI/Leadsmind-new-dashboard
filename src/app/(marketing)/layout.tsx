import type { Metadata } from "next";

// Overrides the root layout's sitewide `noindex` default — this route group
// is the only part of the app that should actually be indexed by search engines.
export const metadata: Metadata = {
 title: {
  default: "LeadsMind — All-in-One Business Platform for South African SMEs",
  template: "%s | LeadsMind",
 },
 description:
  "CRM, LMS, invoicing, HR, automation, and courier tracking — all in one platform built for South African small and medium businesses. ZAR pricing, no developer jargon, one login for everything.",
 keywords: [
  "CRM software South Africa",
  "business management software South Africa",
  "all-in-one business platform",
  "SME software South Africa",
  "invoicing software ZAR",
  "small business CRM",
 ],
 alternates: {
  canonical: "/",
 },
 openGraph: {
  type: "website",
  locale: "en_ZA",
  url: "/",
  siteName: "LeadsMind",
  title: "LeadsMind — All-in-One Business Platform for South African SMEs",
  description:
   "CRM, LMS, invoicing, HR, automation, and courier tracking — all in one platform built for South African small and medium businesses.",
  images: [
   {
    url: "/og-image.png",
    width: 1200,
    height: 630,
    alt: "LeadsMind — Business Operating System for SA SMEs",
   },
  ],
 },
 twitter: {
  card: "summary_large_image",
  title: "LeadsMind — All-in-One Business Platform for South African SMEs",
  description: "CRM, LMS, invoicing, HR, automation, and courier tracking — all in one platform.",
  images: ["/og-image.png"],
 },
 robots: {
  index: true,
  follow: true,
  googleBot: {
   index: true,
   follow: true,
   "max-image-preview": "large",
  },
 },
};

const softwareApplicationJsonLd = {
 "@context": "https://schema.org",
 "@type": "SoftwareApplication",
 name: "LeadsMind",
 applicationCategory: "BusinessApplication",
 operatingSystem: "Web",
 offers: {
  "@type": "Offer",
  priceCurrency: "ZAR",
  price: "199",
 },
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
 return (
  <>
   <script
    type="application/ld+json"
    dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationJsonLd) }}
   />
   {children}
  </>
 );
}
