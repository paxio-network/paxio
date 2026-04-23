import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    turbo: {},
  },
};

export default nextConfig;