import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
  output: 'standalone',
  experimental: {
    turbo: {},
  },
};

export default nextConfig;