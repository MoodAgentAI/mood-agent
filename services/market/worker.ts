/**
 * Market signal worker - continuously monitors market conditions
 */

import { MarketSignalProcessor } from "./signal-processor"
import { config } from "@/lib/config"
import { logger } from "@/lib/logger"

class MarketWorker {
  private processor: MarketSignalProcessor
  private isRunning = false
  private updateInterval: number

  constructor() {
    this.processor = new MarketSignalProcessor()
    this.updateInterval = config.market.updateIntervalMs
  }

  /**
   * Start the market worker
   */
  async start(tokenMint: string, usdcMint: string): Promise<void> {
    logger.info("Starting market worker", { tokenMint, usdcMint })
    this.isRunning = true

    while (this.isRunning) {
      try {
        await this.processor.processSignals(tokenMint, usdcMint)

        // Wait for next update
        await this.sleep(this.updateInterval)
      } catch (error: any) {
        logger.error("Market processing error", { error: error.message })
        await this.sleep(5000) // Wait 5 seconds on error
      }
    }
  }

  /**
   * Stop the worker
   */
  stop(): void {
    logger.info("Stopping market worker")
    this.isRunning = false
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

// Run worker if executed directly
if (require.main === module) {
  const worker = new MarketWorker()

  // Get token mints from environment
  const tokenMint = process.env.TOKEN_MINT || ""
  const usdcMint = process.env.USDC_MINT || "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"

  if (!tokenMint) {
    logger.error("TOKEN_MINT environment variable not set")
    process.exit(1)
  }

  process.on("SIGINT", () => {
    worker.stop()
    process.exit(0)
  })

  process.on("SIGTERM", () => {
    worker.stop()
    process.exit(0)
  })

  worker.start(tokenMint, usdcMint).catch((error) => {
    logger.error("Worker crashed", { error: error.message })
    process.exit(1)
  })
}

export { MarketWorker }
