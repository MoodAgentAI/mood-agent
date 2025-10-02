/**
 * Price feed client for Pyth and DEX data
 */

import axios, { type AxiosInstance } from "axios"
import { Connection, PublicKey } from "@solana/web3.js"
import { config } from "@/lib/config"
import { logger } from "@/lib/logger"

export interface PriceData {
  price: number
  confidence: number
  timestamp: Date
  source: string
}

export class PriceFeedClient {
  private pythClient: AxiosInstance | null = null
  private jupiterClient: AxiosInstance
  private connection: Connection | null = null

  constructor() {
    if (config.market.pythPriceEndpoint) {
      this.pythClient = axios.create({
        baseURL: config.market.pythPriceEndpoint,
        timeout: 10000,
      })
    }

    this.jupiterClient = axios.create({
      baseURL: config.market.jupiterApiUrl,
      timeout: 10000,
    })

    if (config.solana.rpcUrl) {
      this.connection = new Connection(config.solana.rpcUrl, "confirmed")
    }
  }

  /**
   * Get current price from Pyth
   */
  async getPythPrice(priceId: string): Promise<PriceData | null> {
    if (!this.pythClient) {
      logger.warn("Pyth client not configured")
      return null
    }

    try {
      const response = await this.pythClient.get(`/price/${priceId}`)
      const data = response.data

      return {
        price: Number.parseFloat(data.price),
        confidence: Number.parseFloat(data.confidence),
        timestamp: new Date(data.timestamp * 1000),
        source: "pyth",
      }
    } catch (error: any) {
      logger.error("Failed to fetch Pyth price", { error: error.message })
      return null
    }
  }

  /**
   * Get price quote from Jupiter
   */
  async getJupiterQuote(
    inputMint: string,
    outputMint: string,
    amount: number,
  ): Promise<{
    price: number
    priceImpact: number
    liquidity: number
  } | null> {
    try {
      const response = await this.jupiterClient.get("/quote", {
        params: {
          inputMint,
          outputMint,
          amount: Math.floor(amount * 1e9), // Convert to lamports
          slippageBps: 50, // 0.5%
        },
      })

      const data = response.data

      return {
        price: Number.parseFloat(data.outAmount) / Number.parseFloat(data.inAmount),
        priceImpact: Number.parseFloat(data.priceImpactPct || "0"),
        liquidity: Number.parseFloat(data.otherAmountThreshold || "0"),
      }
    } catch (error: any) {
      logger.error("Failed to fetch Jupiter quote", { error: error.message })
      return null
    }
  }

  /**
   * Get DEX liquidity data
   */
  async getDexLiquidity(poolAddress: string): Promise<number> {
    if (!this.connection) {
      logger.warn("Solana connection not configured")
      return 0
    }

    try {
      const poolPubkey = new PublicKey(poolAddress)
      const accountInfo = await this.connection.getAccountInfo(poolPubkey)

      if (!accountInfo) {
        return 0
      }

      // Parse pool data (implementation depends on DEX)
      // This is a simplified version
      const lamports = accountInfo.lamports
      return lamports / 1e9 // Convert to SOL
    } catch (error: any) {
      logger.error("Failed to fetch DEX liquidity", { error: error.message })
      return 0
    }
  }

  /**
   * Get 24h volume from Raydium
   */
  async getRaydiumVolume(poolId: string): Promise<number> {
    try {
      const response = await axios.get(`${config.market.raydiumApiUrl}/main/pairs`, {
        timeout: 10000,
      })

      const pool = response.data.find((p: any) => p.ammId === poolId)

      if (!pool) {
        return 0
      }

      return Number.parseFloat(pool.volume24h || "0")
    } catch (error: any) {
      logger.error("Failed to fetch Raydium volume", { error: error.message })
      return 0
    }
  }
}
