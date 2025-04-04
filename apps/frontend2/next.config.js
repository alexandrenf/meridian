/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  transpilePackages: ["@meridian/database"],
  experimental: {
    appDir: true,
  },
};

module.exports = nextConfig; 