/**
 * Sentiment aggregator with z-score calculation and EMA smoothing
 */

import { ExponentialMovingAverage, calculateZScore, calculateMean, calculateStdDev } from "@/lib/utils/math"
import { config } from "@/lib/config"
import { logger } from "@/lib/logger"
import type { ProcessedTweet, AggregatedMood } from "@/lib/types"

export class SentimentAggregator {
  private ema5: ExponentialMovingAverage
  private ema15: ExponentialMovingAverage
  private ema60: ExponentialMovingAverage
  private historicalScores: number[] = []
  private maxHistorySize = 1000

  constructor() {
    this.ema5 = new ExponentialMovingAverage(config.policy.emaShort)
    this.ema15 = new ExponentialMovingAverage(config.policy.emaMedium)
    this.ema60 = new ExponentialMovingAverage(config.policy.emaLong)
  }

  /**
   * Aggregate sentiment from multiple tweets
   */
  aggregate(tweets: ProcessedTweet[]): AggregatedMood {
    if (tweets.length === 0) {
      return this.getEmptyMood()
    }

    // Calculate weighted average sentiment
    let totalSentiment = 0
    let totalWeight = 0

    for (const tweet of tweets) {
      const weight = tweet.authorWeight * tweet.sentiment.confidence
      totalSentiment += tweet.sentiment.value * weight
      totalWeight += weight
    }

    const rawScore = totalWeight > 0 ? totalSentiment / totalWeight : 0

    // Update EMAs
    const ema5 = this.ema5.add(rawScore)
    const ema15 = this.ema15.add(rawScore)
    const ema60 = this.ema60.add(rawScore)

    // Store in history for z-score calculation
    this.historicalScores.push(rawScore)
    if (this.historicalScores.length > this.maxHistorySize) {
      this.historicalScores.shift()
    }

    // Calculate z-score
    const mean = calculateMean(this.historicalScores)
    const stdDev = calculateStdDev(this.historicalScores)
    const zScore = calculateZScore(rawScore, mean, stdDev)

    // Topic breakdown (simplified)
    const topicBreakdown = this.analyzeTopics(tweets)

    const mood: AggregatedMood = {
      timestamp: new Date(),
      rawScore,
      zScore,
      ema5,
      ema15,
      ema60,
      volume: tweets.length,
      topicBreakdown,
    }

    logger.debug("Aggregated mood", {
      rawScore: rawScore.toFixed(3),
      zScore: zScore.toFixed(3),
      volume: tweets.length,
    })

    return mood
  }

  /**
   * Analyze topic distribution
   */
  private analyzeTopics(tweets: ProcessedTweet[]): {
    ourCoin: number
    generalMarket: number
  } {
    // Simple heuristic: check for specific cashtags/mentions
    // In production, use topic modeling or NER
    let ourCoinCount = 0
    let generalCount = 0

    for (const tweet of tweets) {
      const text = tweet.text.toLowerCase()

      // Check if tweet mentions our specific coin
      // This should be configured based on your token
      if (text.includes("$yourcoin") || text.includes("yourcoin")) {
        ourCoinCount++
      } else {
        generalCount++
      }
    }

    const total = ourCoinCount + generalCount
    return {
      ourCoin: total > 0 ? ourCoinCount / total : 0,
      generalMarket: total > 0 ? generalCount / total : 0,
    }
  }

  /**
   * Get current EMA values
   */
  getCurrentEMAs(): { ema5: number; ema15: number; ema60: number } {
    return {
      ema5: this.ema5.value,
      ema15: this.ema15.value,
      ema60: this.ema60.value,
    }
  }

  /**
   * Reset aggregator state
   */
  reset(): void {
    this.ema5.reset()
    this.ema15.reset()
    this.ema60.reset()
    this.historicalScores = []
  }

  private getEmptyMood(): AggregatedMood {
    return {
      timestamp: new Date(),
      rawScore: 0,
      zScore: 0,
      ema5: 0,
      ema15: 0,
      ema60: 0,
      volume: 0,
      topicBreakdown: {
        ourCoin: 0,
        generalMarket: 0,
      },
    }
  }
}
