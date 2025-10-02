/**
 * Risk management and safety checks
 */

import { config } from "@/lib/config"
import { logger } from "@/lib/logger"
import Redis from "ioredis"

export interface RiskMetrics {
  dailySpent: number
  consecutiveLosses: number
  lastExecutionTime: Date | null
  treasuryBalance: number
  killSwitchActive: boolean
}

export class RiskManager {
  private redis: Redis

  constructor() {
    this.redis = new Redis()
  }

  /**
   * Check if execution is allowed based on risk limits
   */
  async canExecute(amount: number): Promise<{ allowed: boolean; reason?: string }> {
    try {
      // Check kill switch
      const killSwitch = await this.isKillSwitchActive()
      if (killSwitch) {
        return { allowed: false, reason: "Kill switch is active" }
      }

      // Check treasury balance
      const treasuryBalance = await this.getTreasuryBalance()
      const minReserve = treasuryBalance * config.policy.minTreasuryThreshold

      if (treasuryBalance - amount < minReserve) {
        return {
          allowed: false,
          reason: `Insufficient treasury balance (min reserve: ${minReserve})`,
        }
      }

      // Check daily spend limit
      const dailySpent = await this.getDailySpent()
      const maxDailySpend = treasuryBalance * (config.policy.maxDailySpendPercent / 100)

      if (dailySpent + amount > maxDailySpend) {
        return {
          allowed: false,
          reason: `Daily spend limit exceeded (${dailySpent.toFixed(2)}/${maxDailySpend.toFixed(2)})`,
        }
      }

      // Check consecutive losses
      const consecutiveLosses = await this.getConsecutiveLosses()
      if (consecutiveLosses >= config.policy.maxConsecutiveLosses) {
        return {
          allowed: false,
          reason: `Too many consecutive losses (${consecutiveLosses})`,
        }
      }

      return { allowed: true }
    } catch (error: any) {
      logger.error("Risk check failed", { error: error.message })
      return { allowed: false, reason: "Risk check error" }
    }
  }

  /**
   * Record execution for risk tracking
   */
  async recordExecution(amount: number, success: boolean): Promise<void> {
    try {
      // Update daily spent
      const today = new Date().toISOString().split("T")[0]
      const key = `risk:daily_spent:${today}`
      await this.redis.incrbyfloat(key, amount)
      await this.redis.expire(key, 24 * 60 * 60) // Expire after 24 hours

      // Update consecutive losses
      if (success) {
        await this.redis.set("risk:consecutive_losses", 0)
      } else {
        await this.redis.incr("risk:consecutive_losses")
      }

      // Update last execution time
      await this.redis.set("risk:last_execution", new Date().toISOString())

      logger.info("Execution recorded", { amount, success })
    } catch (error: any) {
      logger.error("Failed to record execution", { error: error.message })
    }
  }

  /**
   * Get current risk metrics
   */
  async getRiskMetrics(): Promise<RiskMetrics> {
    try {
      const [dailySpent, consecutiveLosses, lastExecution, treasuryBalance, killSwitch] = await Promise.all([
        this.getDailySpent(),
        this.getConsecutiveLosses(),
        this.getLastExecutionTime(),
        this.getTreasuryBalance(),
        this.isKillSwitchActive(),
      ])

      return {
        dailySpent,
        consecutiveLosses,
        lastExecutionTime: lastExecution,
        treasuryBalance,
        killSwitchActive: killSwitch,
      }
    } catch (error: any) {
      logger.error("Failed to get risk metrics", { error: error.message })
      throw error
    }
  }

  /**
   * Activate kill switch
   */
  async activateKillSwitch(reason: string): Promise<void> {
    await this.redis.set("risk:kill_switch", "active")
    await this.redis.set("risk:kill_switch_reason", reason)
    logger.warn("Kill switch activated", { reason })
  }

  /**
   * Deactivate kill switch
   */
  async deactivateKillSwitch(): Promise<void> {
    await this.redis.del("risk:kill_switch")
    await this.redis.del("risk:kill_switch_reason")
    logger.info("Kill switch deactivated")
  }

  /**
   * Check if kill switch is active
   */
  private async isKillSwitchActive(): Promise<boolean> {
    const status = await this.redis.get("risk:kill_switch")
    return status === "active"
  }

  /**
   * Get daily spent amount
   */
  private async getDailySpent(): Promise<number> {
    const today = new Date().toISOString().split("T")[0]
    const key = `risk:daily_spent:${today}`
    const spent = await this.redis.get(key)
    return spent ? Number.parseFloat(spent) : 0
  }

  /**
   * Get consecutive losses count
   */
  private async getConsecutiveLosses(): Promise<number> {
    const losses = await this.redis.get("risk:consecutive_losses")
    return losses ? Number.parseInt(losses) : 0
  }

  /**
   * Get last execution time
   */
  private async getLastExecutionTime(): Promise<Date | null> {
    const time = await this.redis.get("risk:last_execution")
    return time ? new Date(time) : null
  }

  /**
   * Get treasury balance (placeholder - should fetch from Solana)
   */
  private async getTreasuryBalance(): Promise<number> {
    const balance = await this.redis.get("treasury:balance")
    return balance ? Number.parseFloat(balance) : 0
  }

  /**
   * Update treasury balance
   */
  async updateTreasuryBalance(balance: number): Promise<void> {
    await this.redis.set("treasury:balance", balance.toString())
  }
}
