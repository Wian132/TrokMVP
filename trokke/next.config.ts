/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '4mb',
    },
  },

  // The 'ignoreBuildErrors' and 'output' properties have been removed.
  // This ensures we catch all type errors and build the app for a server environment.

  images: {
    unoptimized: true,
  },
};

export default nextConfig;