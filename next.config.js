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
        serverComponentsExternalPackages: ["puppeteer-core", "@sparticuz/chromium", "cheerio", "undici", "@resvg/resvg-js", "pdfjs-dist"],
        outputFileTracingExcludes: {
            '*': [
                'node_modules/@swc/core-linux-x64-gnu',
                'node_modules/@swc/core-linux-x64-musl',
                'node_modules/@esbuild/linux-x64',
            ],
        },
        // serverComponentsExternalPackages alone keeps webpack from mangling
        // @sparticuz/chromium, but Vercel's output file tracing (@vercel/nft)
        // still decides what actually gets uploaded into each Lambda — and it
        // can't statically discover chromium's brotli binaries, since
        // chromium.executablePath() resolves them at runtime, not via a
        // traceable require(). Without this, every route calling
        // htmlToPdfBuffer() gets a deployed function missing
        // node_modules/@sparticuz/chromium/bin, even though it's present locally.
        outputFileTracingIncludes: {
            '/**/*': [
                './node_modules/@sparticuz/chromium/**/*',
                './node_modules/puppeteer-core/**/*',
                './node_modules/pdfjs-dist/**/*',
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

