/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  // This tells Next.js to prefix asset paths with the base path
  assetPrefix: '/',
  // Or if you want to be explicit:
  // basePath: '',
}

module.exports = nextConfig
