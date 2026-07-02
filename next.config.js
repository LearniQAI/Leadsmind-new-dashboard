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
        ],
    },
    experimental: {
        serverComponentsExternalPackages: ["puppeteer", "cheerio", "undici", "@resvg/resvg-js"],
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

