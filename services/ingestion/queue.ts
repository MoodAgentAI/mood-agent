/**
 * Message queue for tweet processing pipeline
 */

import Redis from "ioredis"
import { logger } from "@/lib/logger"
import type { Tweet } from "@/lib/types"

export class TweetQueue {
  private redis: Redis
  private readonly queueKey = "tweets:pending"
  private readonly processedKey = "tweets:processed"

  constructor(redisUrl?: string) {
    this.redis = new Redis(redisUrl || "redis://localhost:6379", {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000)
        return delay
      },
    })

    this.redis.on("error", (error) => {
      logger.error("Redis connection error", { error: error.message })
    })

    this.redis.on("connect", () => {
      logger.info("Connected to Redis")
    })
  }

  /**
   * Add tweet to processing queue
   */
  async enqueue(tweet: Tweet): Promise<void> {
    try {
      // Check if already processed
      const isProcessed = await this.redis.sismember(this.processedKey, tweet.id)

      if (isProcessed) {
        logger.debug("Tweet already processed, skipping", { tweetId: tweet.id })
        return
      }

      // Add to queue
      await this.redis.lpush(this.queueKey, JSON.stringify(tweet))

      logger.debug("Tweet enqueued", { tweetId: tweet.id })
    } catch (error: any) {
      logger.error("Failed to enqueue tweet", {
        error: error.message,
        tweetId: tweet.id,
      })
      throw error
    }
  }

  /**
   * Get next tweet from queue
   */
  async dequeue(): Promise<Tweet | null> {
    try {
      const result = await this.redis.brpop(this.queueKey, 5)

      if (!result) return null

      const [, tweetJson] = result
      const tweet = JSON.parse(tweetJson) as Tweet

      // Mark as processed
      await this.redis.sadd(this.processedKey, tweet.id)

      // Expire processed set after 7 days
      await this.redis.expire(this.processedKey, 7 * 24 * 60 * 60)

      return tweet
    } catch (error: any) {
      logger.error("Failed to dequeue tweet", { error: error.message })
      return null
    }
  }

  /**
   * Get queue length
   */
  async getQueueLength(): Promise<number> {
    try {
      return await this.redis.llen(this.queueKey)
    } catch (error: any) {
      logger.error("Failed to get queue length", { error: error.message })
      return 0
    }
  }

  /**
   * Clear queue (for testing)
   */
  async clear(): Promise<void> {
    try {
      await this.redis.del(this.queueKey)
      await this.redis.del(this.processedKey)
      logger.info("Queue cleared")
    } catch (error: any) {
      logger.error("Failed to clear queue", { error: error.message })
    }
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    await this.redis.quit()
  }
}
