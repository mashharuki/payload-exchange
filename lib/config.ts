import { DEPLOYMENT_URL } from "vercel-url";

export const APP_BASE_URL = process.env.TUNNEL_URL || DEPLOYMENT_URL;

export const DATABASE_URL = process.env.DATABASE_URL || "";

export const X402_ENDPOINT = process.env.X402_ENDPOINT || "";

export const TREASURY_WALLET_ADDRESS =
  process.env.TREASURY_WALLET_ADDRESS ||
  "0x0000000000000000000000000000000000000000";

// USDC contract address on Base Sepolia
export const USDC_CONTRACT_ADDRESS =
  process.env.USDC_CONTRACT_ADDRESS ||
  "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
