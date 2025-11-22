import type { NextConfig } from "next";
import { DEPLOYMENT_URL } from "vercel-url";

const nextConfig: NextConfig = {
	assetPrefix: DEPLOYMENT_URL,
};

export default nextConfig;
