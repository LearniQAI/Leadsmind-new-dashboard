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
        // "puppeteer" (full, devDependency-only) is the local-dev-only fallback
        // used by src/lib/pdf/htmlToPdf.ts when NODE_ENV !== 'production' — it's
        // never installed in the production bundle and that code path never runs
        // there, but marking it external keeps webpack from trying to statically
        // bundle it at build time regardless.
        serverComponentsExternalPackages: ["puppeteer-core", "puppeteer", "@sparticuz/chromium", "cheerio", "undici", "@resvg/resvg-js", "pdfjs-dist", "isomorphic-dompurify", "jsdom"],
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
            // src/lib/pdf/htmlToPdf.ts (htmlToPdfBuffer) is a SEPARATE chromium
            // consumer from the certificate/bookkeeping-export generators above —
            // it's the one shared by /api/pdf, the payslip download route, and
            // (via sendQuoteEmail.ts / sendInvoiceEmail.ts) every quote/invoice
            // "send" path. It was never added to this list when the pattern above
            // was established, which is exactly why quotes' "Save & Send" failed
            // in production with "@sparticuz/chromium/bin does not exist" — the
            // same latent bug also affects every invoice "Save & Send"/auto-notify
            // send below, not just quotes; it just hadn't been triggered yet.
            // Every entry below was grepped as a real, direct call site of
            // htmlToPdfBuffer (via sendQuoteEmail/sendInvoiceEmail), not guessed —
            // same convention as the rest of this block.
            '/api/pdf': [
                './node_modules/@sparticuz/chromium/**/*',
                './node_modules/puppeteer-core/**/*',
            ],
            '/api/hr/payslips/[id]/download': [
                './node_modules/@sparticuz/chromium/**/*',
                './node_modules/puppeteer-core/**/*',
            ],
            '/quotes': [
                './node_modules/@sparticuz/chromium/**/*',
                './node_modules/puppeteer-core/**/*',
            ],
            '/quotes/new': [
                './node_modules/@sparticuz/chromium/**/*',
                './node_modules/puppeteer-core/**/*',
            ],
            '/quotes/[id]/edit': [
                './node_modules/@sparticuz/chromium/**/*',
                './node_modules/puppeteer-core/**/*',
            ],
            '/invoices/new': [
                './node_modules/@sparticuz/chromium/**/*',
                './node_modules/puppeteer-core/**/*',
            ],
            '/invoices/[id]/edit': [
                './node_modules/@sparticuz/chromium/**/*',
                './node_modules/puppeteer-core/**/*',
            ],
            '/api/v1/invoices': [
                './node_modules/@sparticuz/chromium/**/*',
                './node_modules/puppeteer-core/**/*',
            ],
            '/api/webhooks/payfast': [
                './node_modules/@sparticuz/chromium/**/*',
                './node_modules/puppeteer-core/**/*',
            ],
            '/api/payfast/webhook': [
                './node_modules/@sparticuz/chromium/**/*',
                './node_modules/puppeteer-core/**/*',
            ],
            '/api/webhooks/paystack-gateway': [
                './node_modules/@sparticuz/chromium/**/*',
                './node_modules/puppeteer-core/**/*',
            ],
            '/api/webhooks/paypal': [
                './node_modules/@sparticuz/chromium/**/*',
                './node_modules/puppeteer-core/**/*',
            ],
            '/api/webhooks/ozow': [
                './node_modules/@sparticuz/chromium/**/*',
                './node_modules/puppeteer-core/**/*',
            ],
            '/api/webhooks/flutterwave': [
                './node_modules/@sparticuz/chromium/**/*',
                './node_modules/puppeteer-core/**/*',
            ],
            // Automation engine's "send_invoice" step, executed for deferred/
            // multi-step workflows by the workflow-resume cron worker. NOTE: the
            // SAME action can also fire synchronously inline from ANY route that
            // calls EventBus.publishEvent() and happens to trigger a workflow
            // whose first step is send_invoice (triggerWorkflows() -> processNextStep()
            // runs the first step in the caller's own request, not just via this
            // cron worker) — that fan-out is not statically enumerable, so this
            // entry covers the deferred-step case only. See the architectural note
            // left in the audit for this task: the durable fix is dispatching
            // send_invoice through an Inngest event (like webhookDispatch.ts
            // already does) instead of enumerating every possible trigger route.
            '/api/cron/workers/workflow-resume': [
                './node_modules/@sparticuz/chromium/**/*',
                './node_modules/puppeteer-core/**/*',
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

