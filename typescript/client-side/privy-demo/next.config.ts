import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Ignore TypeScript errors from third-party ethereum packages
    // (@ethersproject/*, @ethereumjs/*) that expose .ts source files
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
