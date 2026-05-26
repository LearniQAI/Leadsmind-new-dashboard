/** @type {import('next').NextConfig} */
const nextConfig = {
    transpilePackages: ["date-fns", "lucide-react"],
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'iejtgefkoiyrnyeedigr.supabase.co',
            },
        ],
    },
    experimental: {
        serverComponentsExternalPackages: ["puppeteer", "cheerio", "undici", "@resvg/resvg-js"],
    },
};

module.exports = nextConfig;

