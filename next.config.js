/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    // Ensure static export works with next/image across versions
    unoptimized: true,
  },
}

module.exports = nextConfig
