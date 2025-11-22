import type { NextConfig } from "next";
import { APP_BASE_URL } from "@/lib/config";

const nextConfig: NextConfig = {
  assetPrefix: APP_BASE_URL,
  turbopack: {
    resolveAlias: {
      "zod/v3": "zod",
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "zod/v3": "zod",
    };
    return config;
  },
};

export default nextConfig;
