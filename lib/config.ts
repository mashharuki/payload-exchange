import { DEPLOYMENT_URL } from "vercel-url";

export const APP_BASE_URL = process.env.TUNNEL_URL || DEPLOYMENT_URL;
