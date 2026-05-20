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
};

module.exports = nextConfig;

