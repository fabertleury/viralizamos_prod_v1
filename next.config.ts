/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['www.viralizai.com', 'cnquhqmqxibpnioullsm.supabase.co'],
  },
  experimental: {
    serverActions: {
      allowedOrigins: ['www.viralizai.com', 'localhost:3000'],
    },
  },
};

module.exports = nextConfig;
