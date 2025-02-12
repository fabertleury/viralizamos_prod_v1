/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SUPABASE_SERVICE_KEY: process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY,
  },
  images: {
    domains: [
      'instagram.fmci2-1.fna.fbcdn.net',
      'instagram.fcgh2-1.fna.fbcdn.net',
      'instagram.fpoa1-1.fna.fbcdn.net',
      'instagram.fbsb1-1.fna.fbcdn.net',
      'scontent.cdninstagram.com',
      'scontent-gru1-1.cdninstagram.com',
      'scontent-gru2-1.cdninstagram.com',
      'scontent-atl3-2.cdninstagram.com',
      'scontent-atl3-1.cdninstagram.com',
      'scontent-atl3-3.cdninstagram.com'
    ],
  },
}

module.exports = nextConfig
