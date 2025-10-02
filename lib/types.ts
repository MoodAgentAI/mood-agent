/**
 * Core type definitions for MoodAgent
 */

export interface Tweet {
  id: string
  text: string
  authorId: string
  createdAt: Date
  metrics: {
    likes: number
    retweets: number
    replies: number
    impressions: number
  }
  entities?: {
    hashtags?: string[]
    cashtags?: string[]
    mentions?: string[]
  }
}

export interface SentimentScore {
  value: number // -1 to +1
  confidence: number // 0 to 1
  volatility: number
  labels: {
    fomo: number
    fud: number
    neutral: number
  }
  timestamp: Date
}

export interface ProcessedTweet extends Tweet {
  sentiment: SentimentScore
  language: string
  isBot: boolean
  authorWeight: number
}

export interface AggregatedMood {
  timestamp: Date
  rawScore: number
  zScore: number
  ema5: number
  ema15: number
  ema60: number
  volume: number
  topicBreakdown: {
    ourCoin: number
    generalMarket: number
  }
}

export interface MarketSignal {
  timestamp: Date
  price: number
  priceChange24h: number
  volume24h: number
  liquidity: number
  momentum: number
  largeTransfers: number
}

export interface PolicyDecision {
  timestamp: Date
  action: "HODL_TREASURY" | "BUYBACK" | "BURN" | "NOOP"
  reason: string
  signals: {
    moodZScore: number
    priceMomentum: number
    liquidityOk: boolean
  }
  executionParams?: {
    size?: number
    maxSlippage?: number
    dcaFactor?: number
  }
}

export interface ExecutionResult {
  timestamp: Date
  decision: PolicyDecision
  txSignature?: string
  success: boolean
  amountProcessed?: number
  error?: string
}

export interface SystemMetrics {
  timestamp: Date
  tweetsProcessed: number
  sentimentLatencyMs: number
  decisionLatencyMs: number
  treasuryBalance: number
  dailySpent: number
  consecutiveLosses: number
  killSwitchActive: boolean
}
