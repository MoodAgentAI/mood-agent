/**
 * Policy worker - makes trading decisions based on mood and market signals
 */

import { DecisionEngine } from "./decision-engine"
import { logger } from "@/lib/logger"
import type { AggregatedMood, MarketSignal } from "@/lib/types"
import Redis from "ioredis"

class PolicyWorker {
  private engine: DecisionEngine
  private redis: Redis
  private isRunning = false
  private checkIntervalMs = 60000 // 1 minute

  constructor() {
    this.engine = new DecisionEngine()
    this.redis = new Redis()
  }

  /**
   * Start the policy worker
   */
  async start(): Promise<void> {
    logger.info("Starting policy worker")
    this.isRunning = true

    while (this.isRunning) {
      try {
        // Get latest mood and market signals
        const [moodData, marketData] = await Promise.all([
          this.redis.get("mood:latest"),
          this.redis.get("market:latest"),
        ])

        if (!moodData || !marketData) {
          logger.warn("Missing mood or market data, skipping decision")
          await this.sleep(this.checkIntervalMs)
          continue
        }

        const mood: AggregatedMood = JSON.parse(moodData)
        const market: MarketSignal = JSON.parse(marketData)

        // Make decision
        const decision = await this.engine.makeDecision(mood, market)

        // Log decision
        logger.info("Policy decision", {
          action: decision.action,
          reason: decision.reason,
        })

        // Wait for next check
        await this.sleep(this.checkIntervalMs)
      } catch (error: any) {
        logger.error("Policy processing error", { error: error.message })
        await this.sleep(5000) // Wait 5 seconds on error
      }
    }
  }

  /**
   * Stop the worker
   */
  stop(): void {
    logger.info("Stopping policy worker")
    this.isRunning = false
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

// Run worker if executed directly
if (require.main === module) {
  const worker = new PolicyWorker()

  process.on("SIGINT", () => {
    worker.stop()
    process.exit(0)
  })

  process.on("SIGTERM", () => {
    worker.stop()
    process.exit(0)
  })

  worker.start().catch((error) => {
    logger.error("Worker crashed", { error: error.message })
    process.exit(1)
  })
}

export { PolicyWorker }
