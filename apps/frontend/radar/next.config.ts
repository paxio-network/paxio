import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: [
    '@paxio/types',
    '@paxio/ui',
    '@paxio/hooks',
    '@paxio/api-client',
    '@paxio/auth',
  ],
  output: 'standalone',
  experimental: {
    turbo: {},
  },
};

export default nextConfig;