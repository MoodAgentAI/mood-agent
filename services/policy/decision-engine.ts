/**
 * Policy decision engine - implements trading rules
 */

import { RiskManager } from "./risk-manager"
import { detectCrossover } from "@/lib/utils/math"
import { config } from "@/lib/config"
import { logger } from "@/lib/logger"
import type { AggregatedMood, MarketSignal, PolicyDecision } from "@/lib/types"
import Redis from "ioredis"

export class DecisionEngine {
  private riskManager: RiskManager
  private redis: Redis
  private ema15History: number[] = []
  private ema60History: number[] = []

  constructor() {
    this.riskManager = new RiskManager()
    this.redis = new Redis()
  }

  /**
   * Make trading decision based on mood and market signals
   */
  async makeDecision(mood: AggregatedMood, market: MarketSignal): Promise<PolicyDecision> {
    try {
      // Update EMA history for crossover detection
      this.ema15History.push(mood.ema15)
      this.ema60History.push(mood.ema60)

      if (this.ema15History.length > 100) {
        this.ema15History.shift()
        this.ema60History.shift()
      }

      // Check liquidity
      const liquidityOk = market.liquidity > 10000 // Minimum $10k liquidity

      // Decision logic (V0 - Rule-based)
      let action: PolicyDecision["action"] = "NOOP"
      let reason = ""
      let executionParams: PolicyDecision["executionParams"] | undefined

      // Rule 1: HODL during hype
      if (mood.zScore >= config.policy.hypeThreshold && market.momentum >= config.policy.momentumPositive) {
        action = "HODL_TREASURY"
        reason = `High sentiment (z=${mood.zScore.toFixed(2)}) and positive momentum - waiting`
      }
      // Rule 2: BUYBACK during FUD dips
      else if (mood.zScore <= config.policy.fudThreshold && market.momentum <= config.policy.momentumNegative) {
        action = "BUYBACK"
        reason = `Low sentiment (z=${mood.zScore.toFixed(2)}) and negative momentum - buying opportunity`

        // Calculate buyback size
        const treasuryBalance = await this.riskManager.getRiskMetrics().then((m) => m.treasuryBalance)
        const k1 = 0.01 // Scaling factor
        const dcaFactor = 0.5 // DCA to reduce risk
        const size = k1 * Math.abs(mood.zScore) * treasuryBalance * dcaFactor

        executionParams = {
          size,
          maxSlippage: config.policy.maxSlippagePercent,
          dcaFactor,
        }

        // Check if execution is allowed
        const riskCheck = await this.riskManager.canExecute(size)
        if (!riskCheck.allowed) {
          action = "NOOP"
          reason = `Buyback blocked: ${riskCheck.reason}`
          executionParams = undefined
        }
      }
      // Rule 3: BURN after bearish crossover
      else if (this.detectBearishCrossover() && liquidityOk) {
        action = "BURN"
        reason = "Bearish EMA crossover detected - burning tokens"
      }
      // Default: No action
      else {
        action = "NOOP"
        reason = "No clear signal - waiting"
      }

      const decision: PolicyDecision = {
        timestamp: new Date(),
        action,
        reason,
        signals: {
          moodZScore: mood.zScore,
          priceMomentum: market.momentum,
          liquidityOk,
        },
        executionParams,
      }

      // Store decision
      await this.storeDecision(decision)

      logger.info("Decision made", {
        action,
        reason,
        zScore: mood.zScore.toFixed(2),
        momentum: market.momentum.toFixed(3),
      })

      return decision
    } catch (error: any) {
      logger.error("Decision making failed", { error: error.message })
      return this.getNoopDecision("Error in decision making")
    }
  }

  /**
   * Detect bearish crossover (EMA15 crosses below EMA60)
   */
  private detectBearishCrossover(): boolean {
    if (this.ema15History.length < 2 || this.ema60History.length < 2) {
      return false
    }

    const crossover = detectCrossover(this.ema15History, this.ema60History)
    return crossover === "down"
  }

  /**
   * Store decision in Redis
   */
  private async storeDecision(decision: PolicyDecision): Promise<void> {
    try {
      // Store latest decision
      await this.redis.set("policy:latest", JSON.stringify(decision))

      // Store in time series
      const key = `policy:history:${decision.timestamp.getTime()}`
      await this.redis.set(key, JSON.stringify(decision), "EX", 7 * 24 * 60 * 60)

      // Add to sorted set
      await this.redis.zadd("policy:timeline", decision.timestamp.getTime(), key)
    } catch (error: any) {
      logger.error("Failed to store decision", { error: error.message })
    }
  }

  /**
   * Get historical decisions
   */
  async getHistoricalDecisions(startTime: Date, endTime: Date): Promise<PolicyDecision[]> {
    try {
      const keys = await this.redis.zrangebyscore("policy:timeline", startTime.getTime(), endTime.getTime())

      const decisions: PolicyDecision[] = []

      for (const key of keys) {
        const data = await this.redis.get(key)
        if (data) {
          decisions.push(JSON.parse(data))
        }
      }

      return decisions
    } catch (error: any) {
      logger.error("Failed to get historical decisions", { error: error.message })
      return []
    }
  }

  /**
   * Get latest decision
   */
  async getLatestDecision(): Promise<PolicyDecision | null> {
    try {
      const data = await this.redis.get("policy:latest")
      return data ? JSON.parse(data) : null
    } catch (error: any) {
      logger.error("Failed to get latest decision", { error: error.message })
      return null
    }
  }

  private getNoopDecision(reason: string): PolicyDecision {
    return {
      timestamp: new Date(),
      action: "NOOP",
      reason,
      signals: {
        moodZScore: 0,
        priceMomentum: 0,
        liquidityOk: false,
      },
    }
  }
}
