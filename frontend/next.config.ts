import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  output: 'export', // This generates static files in the 'out' folder
  basePath: '/game', // This makes all assets load from /games/*
  images: {
    unoptimized: true, // Required for static export
  },
};

export default nextConfig;