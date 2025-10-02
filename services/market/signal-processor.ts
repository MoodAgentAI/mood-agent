/**
 * Market signal processor - combines price, volume, and on-chain data
 */

import { PriceFeedClient } from "./price-feed"
import { MovingAverage } from "@/lib/utils/math"
import { logger } from "@/lib/logger"
import type { MarketSignal } from "@/lib/types"
import Redis from "ioredis"

export class MarketSignalProcessor {
  private priceFeed: PriceFeedClient
  private redis: Redis
  private priceHistory: number[] = []
  private volumeMA: MovingAverage
  private maxHistorySize = 100

  constructor() {
    this.priceFeed = new PriceFeedClient()
    this.redis = new Redis()
    this.volumeMA = new MovingAverage(24) // 24-hour moving average
  }

  /**
   * Collect and process market signals
   */
  async processSignals(tokenMint: string, usdcMint: string): Promise<MarketSignal> {
    try {
      // Get current price
      const quote = await this.priceFeed.getJupiterQuote(tokenMint, usdcMint, 1)

      if (!quote) {
        return this.getEmptySignal()
      }

      const currentPrice = quote.price

      // Update price history
      this.priceHistory.push(currentPrice)
      if (this.priceHistory.length > this.maxHistorySize) {
        this.priceHistory.shift()
      }

      // Calculate price change
      const priceChange24h = this.calculatePriceChange()

      // Calculate momentum
      const momentum = this.calculateMomentum()

      // Get volume (simplified - would need actual DEX data)
      const volume24h = await this.estimateVolume(tokenMint)

      // Get liquidity
      const liquidity = quote.liquidity

      // Detect large transfers (simplified)
      const largeTransfers = await this.detectLargeTransfers(tokenMint)

      const signal: MarketSignal = {
        timestamp: new Date(),
        price: currentPrice,
        priceChange24h,
        volume24h,
        liquidity,
        momentum,
        largeTransfers,
      }

      // Store signal
      await this.storeSignal(signal)

      logger.debug("Market signal processed", {
        price: currentPrice.toFixed(6),
        momentum: momentum.toFixed(3),
        liquidity: liquidity.toFixed(2),
      })

      return signal
    } catch (error: any) {
      logger.error("Failed to process market signals", { error: error.message })
      return this.getEmptySignal()
    }
  }

  /**
   * Calculate price change over 24 hours
   */
  private calculatePriceChange(): number {
    if (this.priceHistory.length < 2) return 0

    const current = this.priceHistory[this.priceHistory.length - 1]
    const past = this.priceHistory[0]

    return ((current - past) / past) * 100
  }

  /**
   * Calculate price momentum using rate of change
   */
  private calculateMomentum(): number {
    if (this.priceHistory.length < 10) return 0

    const recent = this.priceHistory.slice(-10)
    let momentum = 0

    for (let i = 1; i < recent.length; i++) {
      const change = (recent[i] - recent[i - 1]) / recent[i - 1]
      momentum += change
    }

    return momentum / (recent.length - 1)
  }

  /**
   * Estimate 24h volume
   */
  private async estimateVolume(tokenMint: string): Promise<number> {
    try {
      // In production, fetch from DEX APIs or on-chain data
      // This is a simplified placeholder
      const volumeKey = `volume:${tokenMint}`
      const storedVolume = await this.redis.get(volumeKey)

      if (storedVolume) {
        return Number.parseFloat(storedVolume)
      }

      return 0
    } catch (error: any) {
      logger.error("Failed to estimate volume", { error: error.message })
      return 0
    }
  }

  /**
   * Detect large transfers (whale movements)
   */
  private async detectLargeTransfers(tokenMint: string): Promise<number> {
    try {
      // In production, monitor on-chain transactions
      // This is a simplified placeholder
      const transferKey = `transfers:${tokenMint}:large`
      const count = await this.redis.get(transferKey)

      return count ? Number.parseInt(count) : 0
    } catch (error: any) {
      logger.error("Failed to detect large transfers", { error: error.message })
      return 0
    }
  }

  /**
   * Store market signal in Redis
   */
  private async storeSignal(signal: MarketSignal): Promise<void> {
    try {
      // Store latest signal
      await this.redis.set("market:latest", JSON.stringify(signal))

      // Store in time series
      const key = `market:history:${signal.timestamp.getTime()}`
      await this.redis.set(key, JSON.stringify(signal), "EX", 7 * 24 * 60 * 60)

      // Add to sorted set
      await this.redis.zadd("market:timeline", signal.timestamp.getTime(), key)
    } catch (error: any) {
      logger.error("Failed to store market signal", { error: error.message })
    }
  }

  /**
   * Get historical signals
   */
  async getHistoricalSignals(startTime: Date, endTime: Date): Promise<MarketSignal[]> {
    try {
      const keys = await this.redis.zrangebyscore("market:timeline", startTime.getTime(), endTime.getTime())

      const signals: MarketSignal[] = []

      for (const key of keys) {
        const data = await this.redis.get(key)
        if (data) {
          signals.push(JSON.parse(data))
        }
      }

      return signals
    } catch (error: any) {
      logger.error("Failed to get historical signals", { error: error.message })
      return []
    }
  }

  /**
   * Check if liquidity is sufficient for trading
   */
  isLiquidityOk(signal: MarketSignal, minLiquidity = 10000): boolean {
    return signal.liquidity >= minLiquidity
  }

  private getEmptySignal(): MarketSignal {
    return {
      timestamp: new Date(),
      price: 0,
      priceChange24h: 0,
      volume24h: 0,
      liquidity: 0,
      momentum: 0,
      largeTransfers: 0,
    }
  }
}
