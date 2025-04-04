/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  transpilePackages: ["@meridian/database"],
  // Remove experimental appDir as it's now stable in Next.js 14
  // experimental: {
  //   appDir: true,
  // },
};

module.exports = nextConfig; 