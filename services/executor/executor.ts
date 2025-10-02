/**
 * Execution engine - executes trading decisions on Solana
 */

import { SolanaClient } from "./solana-client"
import { RiskManager } from "../policy/risk-manager"
import { config } from "@/lib/config"
import { logger } from "@/lib/logger"
import type { PolicyDecision, ExecutionResult } from "@/lib/types"
import Redis from "ioredis"

export class Executor {
  private solana: SolanaClient
  private riskManager: RiskManager
  private redis: Redis
  private pendingExecutions: Map<string, PolicyDecision> = new Map()

  constructor() {
    this.solana = new SolanaClient()
    this.riskManager = new RiskManager()
    this.redis = new Redis()
  }

  /**
   * Execute a policy decision
   */
  async execute(decision: PolicyDecision): Promise<ExecutionResult> {
    const startTime = Date.now()

    try {
      // Check if auto-execution is enabled
      if (!config.features.enableAutoExecution) {
        logger.info("Auto-execution disabled, skipping", { action: decision.action })
        return this.createResult(decision, false, "Auto-execution disabled")
      }

      // Execute based on action type
      let result: ExecutionResult

      switch (decision.action) {
        case "BUYBACK":
          result = await this.executeBuyback(decision)
          break

        case "BURN":
          result = await this.executeBurn(decision)
          break

        case "HODL_TREASURY":
        case "NOOP":
          result = this.createResult(decision, true, "No action required")
          break

        default:
          result = this.createResult(decision, false, "Unknown action")
      }

      // Record execution for risk tracking
      await this.riskManager.recordExecution(decision.executionParams?.size || 0, result.success)

      // Store result
      await this.storeResult(result)

      const duration = Date.now() - startTime
      logger.info("Execution complete", {
        action: decision.action,
        success: result.success,
        duration,
      })

      return result
    } catch (error: any) {
      logger.error("Execution failed", { error: error.message })
      return this.createResult(decision, false, error.message)
    }
  }

  /**
   * Execute buyback operation
   */
  private async executeBuyback(decision: PolicyDecision): Promise<ExecutionResult> {
    if (!decision.executionParams?.size) {
      return this.createResult(decision, false, "Missing execution parameters")
    }

    try {
      const { size, maxSlippage } = decision.executionParams

      // Check risk limits
      const riskCheck = await this.riskManager.canExecute(size)
      if (!riskCheck.allowed) {
        return this.createResult(decision, false, riskCheck.reason || "Risk check failed")
      }

      // Get token mints from environment
      const usdcMint = process.env.USDC_MINT || "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
      const tokenMint = process.env.TOKEN_MINT || ""

      if (!tokenMint) {
        return this.createResult(decision, false, "Token mint not configured")
      }

      // Execute swap via Jupiter
      const slippageBps = (maxSlippage || 2) * 100 // Convert to basis points
      const txSignature = await this.solana.executeSwap(usdcMint, tokenMint, size, slippageBps)

      // Add to pending executions for monitoring
      this.pendingExecutions.set(txSignature, decision)

      logger.info("Buyback executed", {
        size,
        txSignature,
      })

      return this.createResult(decision, true, "Buyback executed", txSignature, size)
    } catch (error: any) {
      logger.error("Buyback failed", { error: error.message })
      return this.createResult(decision, false, error.message)
    }
  }

  /**
   * Execute burn operation
   */
  private async executeBurn(decision: PolicyDecision): Promise<ExecutionResult> {
    if (!config.features.enableBurn) {
      return this.createResult(decision, false, "Burn feature disabled")
    }

    try {
      const tokenMint = process.env.TOKEN_MINT || ""

      if (!tokenMint) {
        return this.createResult(decision, false, "Token mint not configured")
      }

      // Get current token balance
      const balance = await this.solana.getTokenBalance(tokenMint)

      // Burn 10% of holdings (configurable)
      const burnAmount = balance * 0.1

      if (burnAmount === 0) {
        return this.createResult(decision, false, "No tokens to burn")
      }

      // Execute burn
      const txSignature = await this.solana.burnTokens(tokenMint, burnAmount)

      logger.info("Burn executed", {
        amount: burnAmount,
        txSignature,
      })

      return this.createResult(decision, true, "Burn executed", txSignature, burnAmount)
    } catch (error: any) {
      logger.error("Burn failed", { error: error.message })
      return this.createResult(decision, false, error.message)
    }
  }

  /**
   * Monitor pending transactions
   */
  async monitorPendingTransactions(): Promise<void> {
    for (const [txSignature, decision] of this.pendingExecutions) {
      try {
        const status = await this.solana.getTransactionStatus(txSignature)

        if (status === "confirmed") {
          logger.info("Transaction confirmed", { txSignature })
          this.pendingExecutions.delete(txSignature)
        } else if (status === "failed") {
          logger.error("Transaction failed", { txSignature })
          this.pendingExecutions.delete(txSignature)

          // Record as failed execution
          await this.riskManager.recordExecution(decision.executionParams?.size || 0, false)
        }
      } catch (error: any) {
        logger.error("Failed to check transaction status", {
          error: error.message,
          txSignature,
        })
      }
    }
  }

  /**
   * Create execution result
   */
  private createResult(
    decision: PolicyDecision,
    success: boolean,
    error?: string,
    txSignature?: string,
    amountProcessed?: number,
  ): ExecutionResult {
    return {
      timestamp: new Date(),
      decision,
      success,
      error,
      txSignature,
      amountProcessed,
    }
  }

  /**
   * Store execution result
   */
  private async storeResult(result: ExecutionResult): Promise<void> {
    try {
      // Store latest result
      await this.redis.set("execution:latest", JSON.stringify(result))

      // Store in time series
      const key = `execution:history:${result.timestamp.getTime()}`
      await this.redis.set(key, JSON.stringify(result), "EX", 30 * 24 * 60 * 60) // 30 days

      // Add to sorted set
      await this.redis.zadd("execution:timeline", result.timestamp.getTime(), key)
    } catch (error: any) {
      logger.error("Failed to store execution result", { error: error.message })
    }
  }

  /**
   * Get execution history
   */
  async getExecutionHistory(startTime: Date, endTime: Date): Promise<ExecutionResult[]> {
    try {
      const keys = await this.redis.zrangebyscore("execution:timeline", startTime.getTime(), endTime.getTime())

      const results: ExecutionResult[] = []

      for (const key of keys) {
        const data = await this.redis.get(key)
        if (data) {
          results.push(JSON.parse(data))
        }
      }

      return results
    } catch (error: any) {
      logger.error("Failed to get execution history", { error: error.message })
      return []
    }
  }
}
