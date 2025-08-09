import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '4mb', // Increase the limit to 4mb (or higher if needed)
    },
  },
  /* other config options can go here */
};

export default nextConfig;
