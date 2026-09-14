/** @type {import('next').NextConfig} */
const supabaseHostname = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : '';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.warn('[WARN] NEXT_PUBLIC_SUPABASE_URL is not set — Supabase image domains will not be configured');
}

const nextConfig = {
    transpilePackages: ["date-fns", "lucide-react"],
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: supabaseHostname,
            },
            {
                protocol: 'https',
                hostname: 'lh3.googleusercontent.com',
            },
            {
                protocol: 'https',
                hostname: 'avatars.githubusercontent.com',
            },
        ],
    },
    experimental: {
        // pdfjs-dist added here after a real, live-confirmed bug (AI Bookkeeping Session A):
        // webpack-bundled pdfjs-dist can't resolve its own pdf.worker.mjs from inside
        // .next/server/vendor-chunks at runtime ("Setting up fake worker failed: Cannot find
        // module ... pdf.worker.mjs"), because the worker is loaded via a relative dynamic
        // import that only resolves correctly against the real node_modules layout — same
        // class of problem @sparticuz/chromium solves below. Marking it external skips
        // webpack's rewrite so Node's native resolution (which works) handles it instead.
        //
        // isomorphic-dompurify + jsdom added for the same reason, suspected cause of the
        // /blog/[slug] production-only 500 (leadsmind.io) that produces zero function-
        // invocation logs — i.e. a cold-start/module-init crash, not a per-request render
        // error. jsdom (v29) does internal `require()`s for optional native/WASM pieces
        // (e.g. canvas) that webpack's bundling can rewrite into paths that don't exist in
        // the deployed Lambda, exactly like pdf.worker.mjs did. sanitizeRichTextHtml() is
        // the only blog-adjacent SERVER Component code path that touches this package
        // (src/app/blog/[slug]/page.tsx) — the /blog listing page doesn't call it and was
        // confirmed still working live, which is consistent with this being the crash site.
        serverComponentsExternalPackages: ["puppeteer-core", "@sparticuz/chromium", "cheerio", "undici", "@resvg/resvg-js", "pdfjs-dist", "isomorphic-dompurify", "jsdom"],
        outputFileTracingExcludes: {
            '*': [
                'node_modules/@swc/core-linux-x64-gnu',
                'node_modules/@swc/core-linux-x64-musl',
                'node_modules/@esbuild/linux-x64',
            ],
        },
        // serverComponentsExternalPackages alone keeps webpack from mangling these packages,
        // but Vercel's output file tracing (@vercel/nft) still decides what actually gets
        // uploaded into each Lambda — and it can't statically discover things resolved at
        // runtime rather than via a traceable require() (chromium.executablePath(), pdfjs's
        // worker, jsdom's optional native pieces).
        //
        // Scoped to the SPECIFIC routes that actually import each package — NOT a blanket
        // '/**/*' (which is what this block originally used). Real, live-confirmed regression
        // from that: @sparticuz/chromium (67MB) + pdfjs-dist (36MB) + jsdom (15MB) force-
        // bundled into EVERY function in the app pushed /blog/[slug]'s deployed function over
        // whatever limit Vercel enforces — live request headers showed its X-Vercel-Id never
        // gained the edge→origin (iad1) hop that every other route's did, meaning Vercel's
        // edge was short-circuiting to its own static /500 fallback WITHOUT ever invoking the
        // function at all — a deploy/bundle-level failure, not a runtime crash. Route keys
        // below use the exact real callers (grepped, not guessed) — add a new key rather than
        // widening an existing one if a new caller is added later.
        outputFileTracingIncludes: {
            '/api/student/courses/[id]/certificate': [
                './node_modules/@sparticuz/chromium/**/*',
                './node_modules/puppeteer-core/**/*',
            ],
            '/api/finance/documents/[id]/export': [
                './node_modules/@sparticuz/chromium/**/*',
                './node_modules/puppeteer-core/**/*',
            ],
            '/api/cron/workers/document-processing': [
                './node_modules/pdfjs-dist/**/*',
            ],
            '/api/finance/documents/[id]/unlock': [
                './node_modules/pdfjs-dist/**/*',
            ],
            '/blog/[slug]': [
                './node_modules/jsdom/**/*',
                './node_modules/isomorphic-dompurify/**/*',
            ],
        },
    },
    async rewrites() {
        return [
            {
                source: '/widget/ticket.js',
                destination: '/api/widget/ticket',
            },
        ];
    },
};

module.exports = nextConfig;

