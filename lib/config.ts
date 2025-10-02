/**
 * MoodAgent Configuration
 * Central configuration for the sentiment analysis and treasury management system
 */

export const branding = {
  name: "MoodAgent",
  website: "https://moodagent.dev",
  twitter: "https://x.com/MoonAgentAI",
  twitterHandle: "@MoonAgentAI",
  description: "Autonomous Crypto Sentiment Trading System",
} as const

export const config = {
  // Twitter/X API Configuration
  twitter: {
    apiKey: process.env.TWITTER_API_KEY || "",
    apiSecret: process.env.TWITTER_API_SECRET || "",
    bearerToken: process.env.TWITTER_BEARER_TOKEN || "",
    webhookUrl: process.env.TWITTER_WEBHOOK_URL || "",
    // Rate limiting
    maxRequestsPerMinute: 450,
    maxRequestsPerDay: 500000,
  },

  // Sentiment Analysis Configuration
  sentiment: {
    modelEndpoint: process.env.SENTIMENT_MODEL_ENDPOINT || "",
    batchSize: 32,
    confidenceThreshold: 0.7,
    // Crypto-specific keywords
    cryptoLexicon: [
      "pump",
      "dump",
      "dip",
      "burn",
      "ape",
      "exit liquidity",
      "ngmi",
      "wagmi",
      "rekt",
      "moon",
      "fud",
      "fomo",
      "hodl",
      "bullish",
      "bearish",
      "whale",
      "rug",
      "gem",
      "alpha",
    ],
  },

  // Market Signal Configuration
  market: {
    pythPriceEndpoint: process.env.PYTH_PRICE_ENDPOINT || "",
    jupiterApiUrl: "https://quote-api.jup.ag/v6",
    raydiumApiUrl: "https://api.raydium.io/v2",
    updateIntervalMs: 60000, // 1 minute
  },

  // Decision Engine Configuration
  policy: {
    // Z-score thresholds
    hypeThreshold: 1.5,
    fudThreshold: -1.0,
    // Momentum thresholds
    momentumPositive: 0,
    momentumNegative: 0,
    // EMA windows (in minutes)
    emaShort: 5,
    emaMedium: 15,
    emaLong: 60,
    // Risk limits
    maxDailySpendPercent: 5, // 5% of treasury per day
    maxSlippagePercent: 2,
    minTreasuryThreshold: 0.1, // 10% minimum reserve
    maxConsecutiveLosses: 3,
  },

  // Solana Configuration
  solana: {
    rpcUrl: process.env.SOLANA_RPC_URL || "",
    wsUrl: process.env.SOLANA_WS_URL || "",
    treasuryAddress: process.env.TREASURY_ADDRESS || "",
    programId: process.env.PROGRAM_ID || "",
    guardianMultisig: process.env.GUARDIAN_MULTISIG || "",
    timelockMinutes: 30,
  },

  // Database Configuration
  database: {
    url: process.env.DATABASE_URL || "",
    maxConnections: 20,
  },

  // Monitoring Configuration
  monitoring: {
    prometheusPort: 9090,
    sentryDsn: process.env.SENTRY_DSN || "",
    logLevel: process.env.LOG_LEVEL || "info",
  },

  // Feature Flags
  features: {
    enableAutoExecution: process.env.ENABLE_AUTO_EXECUTION === "true",
    enableBurn: process.env.ENABLE_BURN === "true",
    enableKillSwitch: true,
  },
} as const

export type Config = typeof config
