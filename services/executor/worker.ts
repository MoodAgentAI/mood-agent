/**
 * Executor worker - monitors decisions and executes trades
 */

import { Executor } from "./executor"
import { SolanaClient } from "./solana-client"
import { RiskManager } from "../policy/risk-manager"
import { logger } from "@/lib/logger"
import type { PolicyDecision } from "@/lib/types"
import Redis from "ioredis"

class ExecutorWorker {
  private executor: Executor
  private solana: SolanaClient
  private riskManager: RiskManager
  private redis: Redis
  private isRunning = false
  private checkIntervalMs = 30000 // 30 seconds
  private lastProcessedTimestamp = 0

  constructor() {
    this.executor = new Executor()
    this.solana = new SolanaClient()
    this.riskManager = new RiskManager()
    this.redis = new Redis()
  }

  /**
   * Start the executor worker
   */
  async start(): Promise<void> {
    logger.info("Starting executor worker")
    this.isRunning = true

    // Start treasury balance monitoring
    this.startTreasuryMonitoring()

    // Start transaction monitoring
    this.startTransactionMonitoring()

    // Main execution loop
    while (this.isRunning) {
      try {
        // Get latest policy decision
        const decisionData = await this.redis.get("policy:latest")

        if (!decisionData) {
          logger.debug("No policy decision available")
          await this.sleep(this.checkIntervalMs)
          continue
        }

        const decision: PolicyDecision = JSON.parse(decisionData)

        // Check if we've already processed this decision
        const decisionTimestamp = new Date(decision.timestamp).getTime()
        if (decisionTimestamp <= this.lastProcessedTimestamp) {
          await this.sleep(this.checkIntervalMs)
          continue
        }

        // Execute decision
        if (decision.action !== "NOOP" && decision.action !== "HODL_TREASURY") {
          logger.info("Executing decision", { action: decision.action })
          await this.executor.execute(decision)
        }

        // Update last processed timestamp
        this.lastProcessedTimestamp = decisionTimestamp

        // Wait for next check
        await this.sleep(this.checkIntervalMs)
      } catch (error: any) {
        logger.error("Executor processing error", { error: error.message })
        await this.sleep(5000) // Wait 5 seconds on error
      }
    }
  }

  /**
   * Stop the worker
   */
  stop(): void {
    logger.info("Stopping executor worker")
    this.isRunning = false
  }

  /**
   * Monitor treasury balance
   */
  private startTreasuryMonitoring(): void {
    setInterval(async () => {
      try {
        const balance = await this.solana.getTreasuryBalance()
        await this.riskManager.updateTreasuryBalance(balance)

        logger.debug("Treasury balance updated", { balance })
      } catch (error: any) {
        logger.error("Failed to update treasury balance", { error: error.message })
      }
    }, 60000) // Every minute
  }

  /**
   * Monitor pending transactions
   */
  private startTransactionMonitoring(): void {
    setInterval(async () => {
      try {
        await this.executor.monitorPendingTransactions()
      } catch (error: any) {
        logger.error("Transaction monitoring error", { error: error.message })
      }
    }, 10000) // Every 10 seconds
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

// Run worker if executed directly
if (require.main === module) {
  const worker = new ExecutorWorker()

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

export { ExecutorWorker }
