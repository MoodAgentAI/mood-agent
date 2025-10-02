/**
 * Twitter API client with rate limiting and error handling
 */

import axios, { type AxiosInstance } from "axios"
import { config } from "@/lib/config"
import { logger } from "@/lib/logger"
import { RateLimiter } from "@/lib/utils/rate-limiter"
import type { Tweet } from "@/lib/types"

export class TwitterClient {
  private client: AxiosInstance
  private rateLimiter: RateLimiter

  constructor() {
    this.client = axios.create({
      baseURL: "https://api.twitter.com/2",
      headers: {
        Authorization: `Bearer ${config.twitter.bearerToken}`,
        "Content-Type": "application/json",
      },
    })

    // Rate limiter: 450 requests per 15 minutes = 0.5 requests per second
    this.rateLimiter = new RateLimiter(450, 0.5)
  }

  /**
   * Search recent tweets with crypto-related keywords
   */
  async searchTweets(query: string, maxResults = 100): Promise<Tweet[]> {
    await this.rateLimiter.waitForToken()

    try {
      const response = await this.client.get("/tweets/search/recent", {
        params: {
          query,
          max_results: Math.min(maxResults, 100),
          "tweet.fields": "created_at,public_metrics,entities,lang",
          "user.fields": "verified,public_metrics",
          expansions: "author_id",
        },
      })

      const tweets = response.data.data || []
      const users = response.data.includes?.users || []

      return tweets.map((tweet: any) => this.transformTweet(tweet, users))
    } catch (error: any) {
      logger.error("Failed to search tweets", {
        error: error.message,
        query,
      })
      throw error
    }
  }

  /**
   * Stream tweets in real-time using filtered stream
   */
  async setupFilteredStream(rules: string[]): Promise<void> {
    // First, delete existing rules
    await this.deleteStreamRules()

    // Add new rules
    await this.addStreamRules(rules)

    logger.info("Filtered stream rules configured", { rules })
  }

  private async deleteStreamRules(): Promise<void> {
    try {
      const response = await this.client.get("/tweets/search/stream/rules")
      const rules = response.data.data || []

      if (rules.length > 0) {
        const ids = rules.map((rule: any) => rule.id)
        await this.client.post("/tweets/search/stream/rules", {
          delete: { ids },
        })
      }
    } catch (error: any) {
      logger.error("Failed to delete stream rules", { error: error.message })
    }
  }

  private async addStreamRules(rules: string[]): Promise<void> {
    try {
      await this.client.post("/tweets/search/stream/rules", {
        add: rules.map((rule, index) => ({
          value: rule,
          tag: `rule_${index}`,
        })),
      })
    } catch (error: any) {
      logger.error("Failed to add stream rules", { error: error.message })
      throw error
    }
  }

  /**
   * Get user information for weight calculation
   */
  async getUserInfo(userId: string): Promise<any> {
    await this.rateLimiter.waitForToken()

    try {
      const response = await this.client.get(`/users/${userId}`, {
        params: {
          "user.fields": "verified,public_metrics,created_at",
        },
      })

      return response.data.data
    } catch (error: any) {
      logger.error("Failed to get user info", {
        error: error.message,
        userId,
      })
      return null
    }
  }

  private transformTweet(tweet: any, users: any[]): Tweet {
    const author = users.find((u: any) => u.id === tweet.author_id)

    return {
      id: tweet.id,
      text: tweet.text,
      authorId: tweet.author_id,
      createdAt: new Date(tweet.created_at),
      metrics: {
        likes: tweet.public_metrics?.like_count || 0,
        retweets: tweet.public_metrics?.retweet_count || 0,
        replies: tweet.public_metrics?.reply_count || 0,
        impressions: tweet.public_metrics?.impression_count || 0,
      },
      entities: {
        hashtags: tweet.entities?.hashtags?.map((h: any) => h.tag) || [],
        cashtags: tweet.entities?.cashtags?.map((c: any) => c.tag) || [],
        mentions: tweet.entities?.mentions?.map((m: any) => m.username) || [],
      },
    }
  }
}
