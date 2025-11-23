import { DEPLOYMENT_URL } from "vercel-url";

export const APP_BASE_URL = process.env.TUNNEL_URL || DEPLOYMENT_URL;

export const DATABASE_URL = process.env.DATABASE_URL || "";

export const X402_ENDPOINT = process.env.X402_ENDPOINT || "";
