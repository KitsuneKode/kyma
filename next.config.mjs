/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ik.imagekit.io',
      },
    ],
  },
  allowedDevOrigins: ['127.0.0.1', 'localhost', '192.168.0.104'],
}

export default nextConfig
