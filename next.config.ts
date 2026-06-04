import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  turbopack: {
    root: '/home/z/my-project/ai-draft',
  },
  images: {
    unoptimized: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: [
    "*.space-z.ai",
  ],
  experimental: {
    workerThreads: false,
    cpus: 1,
  },
};

export default nextConfig;
