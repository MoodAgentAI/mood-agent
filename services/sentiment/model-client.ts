/**
 * Client for sentiment analysis model inference
 * Supports both local and remote model endpoints
 */

import axios, { type AxiosInstance } from "axios"
import { config } from "@/lib/config"
import { logger } from "@/lib/logger"
import type { SentimentScore } from "@/lib/types"

export class SentimentModelClient {
  private client: AxiosInstance | null = null
  private batchSize: number

  constructor() {
    this.batchSize = config.sentiment.batchSize

    if (config.sentiment.modelEndpoint) {
      this.client = axios.create({
        baseURL: config.sentiment.modelEndpoint,
        timeout: 30000,
        headers: {
          "Content-Type": "application/json",
        },
      })
    }
  }

  /**
   * Predict sentiment for a single text
   */
  async predict(text: string): Promise<SentimentScore> {
    if (!this.client) {
      logger.warn("Model endpoint not configured, using fallback")
      return this.fallbackPredict(text)
    }

    try {
      const response = await this.client.post("/predict", {
        text,
      })

      return {
        value: response.data.sentiment,
        confidence: response.data.confidence,
        volatility: response.data.volatility || 0,
        labels: {
          fomo: response.data.labels?.fomo || 0,
          fud: response.data.labels?.fud || 0,
          neutral: response.data.labels?.neutral || 0,
        },
        timestamp: new Date(),
      }
    } catch (error: any) {
      logger.error("Model prediction failed", { error: error.message })
      return this.fallbackPredict(text)
    }
  }

  /**
   * Batch prediction for multiple texts
   */
  async predictBatch(texts: string[]): Promise<SentimentScore[]> {
    if (!this.client) {
      return texts.map((text) => this.fallbackPredict(text))
    }

    try {
      const response = await this.client.post("/predict_batch", {
        texts,
      })

      return response.data.predictions.map((pred: any) => ({
        value: pred.sentiment,
        confidence: pred.confidence,
        volatility: pred.volatility || 0,
        labels: {
          fomo: pred.labels?.fomo || 0,
          fud: pred.labels?.fud || 0,
          neutral: pred.labels?.neutral || 0,
        },
        timestamp: new Date(),
      }))
    } catch (error: any) {
      logger.error("Batch prediction failed", { error: error.message })
      return texts.map((text) => this.fallbackPredict(text))
    }
  }

  /**
   * Fallback prediction using simple heuristics
   */
  private fallbackPredict(text: string): SentimentScore {
    const lowerText = text.toLowerCase()

    // Simple keyword-based sentiment
    const positiveWords = ["good", "great", "bullish", "moon", "pump", "gem", "alpha"]
    const negativeWords = ["bad", "bearish", "dump", "crash", "rekt", "scam", "rug"]

    let score = 0
    for (const word of positiveWords) {
      if (lowerText.includes(word)) score += 0.2
    }
    for (const word of negativeWords) {
      if (lowerText.includes(word)) score -= 0.2
    }

    score = Math.max(-1, Math.min(1, score))

    return {
      value: score,
      confidence: 0.5, // Low confidence for fallback
      volatility: 0.3,
      labels: {
        fomo: score > 0.3 ? 0.6 : 0.2,
        fud: score < -0.3 ? 0.6 : 0.2,
        neutral: Math.abs(score) < 0.3 ? 0.6 : 0.2,
      },
      timestamp: new Date(),
    }
  }

  /**
   * Health check for model endpoint
   */
  async healthCheck(): Promise<boolean> {
    if (!this.client) return false

    try {
      const response = await this.client.get("/health")
      return response.status === 200
    } catch {
      return false
    }
  }
}
