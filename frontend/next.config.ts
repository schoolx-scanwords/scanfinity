import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV === 'development';

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  // This tells Next.js to prefix asset paths with the base path
  assetPrefix: '/',
  // Or if you want to be explicit:
  // basePath: '',

  ...(isDev
    ? {
        // In development, proxy API calls to the FastAPI backend.
        // This keeps frontend code using relative URLs like `/api/auth/login`.
        async rewrites() {
          const backendUrl =
            process.env.BACKEND_URL ||
            process.env.NEXT_PUBLIC_BACKEND_URL ||
            'http://127.0.0.1:8000';
          return [
            {
              source: '/api/:path*',
              destination: `${backendUrl}/api/:path*`,
            },
          ];
        },
      }
    : {}),
};

export default nextConfig;