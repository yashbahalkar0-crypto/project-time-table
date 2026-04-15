/** @type {import('next').NextConfig} */
const isStaticExport = process.env.STATIC_EXPORT === 'true';

const nextConfig = {
  output: isStaticExport ? 'export' : undefined,
  images: {
    unoptimized: true,
  },
  async rewrites() {
    if (isStaticExport) {
      return [];
    }

    const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';

    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
