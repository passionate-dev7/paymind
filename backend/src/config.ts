import dotenv from "dotenv";
dotenv.config();

export const config = {
  // BSC Network
  bsc: {
    rpcUrl: process.env.BSC_RPC_URL || "https://bsc-dataseed.binance.org/",
    chainId: 56,
    chainName: "BNB Smart Chain",
    nativeCurrency: {
      name: "BNB",
      symbol: "BNB",
      decimals: 18,
    },
    blockExplorer: "https://bscscan.com",
  },

  // Contract Addresses
  contracts: {
    paymentLedger: process.env.PAYMENT_LEDGER_ADDRESS || "",
    agentRegistry: process.env.AGENT_REGISTRY_ADDRESS || "",
    usdt: "0x55d398326f99059fF775485246999027B3197955", // BSC USDT
  },

  // API Endpoints
  apis: {
    goplus: "https://api.gopluslabs.io/api/v1",
    dexscreener: "https://api.dexscreener.com/latest/dex",
    bscscan: "https://api.bscscan.com/api",
    bscscanApiKey: process.env.BSCSCAN_API_KEY || "",
  },

  // Agent wallet
  wallet: {
    privateKey: process.env.PRIVATE_KEY || "",
  },

  // Claude AI
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || "",
  },

  // Server
  server: {
    port: parseInt(process.env.PORT || "4021", 10),
  },

  // x402 Payment Config
  x402: {
    // Cost per data query in USDT (wei units, 18 decimals)
    securityQueryCost: "100000000000000", // 0.0001 USDT
    priceQueryCost: "50000000000000", // 0.00005 USDT
    whaleQueryCost: "200000000000000", // 0.0002 USDT
    sentimentQueryCost: "50000000000000", // 0.00005 USDT
  },
} as const;

export type Config = typeof config;
