/**
 * Sentiment analysis worker - processes tweets from queue
 */

import { TweetQueue } from "../ingestion/queue"
import { CryptoLexicon } from "./lexicon"
import { SentimentModelClient } from "./model-client"
import { SentimentAggregator } from "./aggregator"
import { TweetPreprocessor } from "../ingestion/preprocessor"
import { logger } from "@/lib/logger"
import type { ProcessedTweet, AggregatedMood } from "@/lib/types"
import Redis from "ioredis"

class SentimentWorker {
  private queue: TweetQueue
  private lexicon: CryptoLexicon
  private modelClient: SentimentModelClient
  private aggregator: SentimentAggregator
  private preprocessor: TweetPreprocessor
  private redis: Redis
  private isRunning = false
  private batchBuffer: ProcessedTweet[] = []
  private batchSize = 50
  private batchTimeoutMs = 30000 // 30 seconds

  constructor() {
    this.queue = new TweetQueue()
    this.lexicon = new CryptoLexicon()
    this.modelClient = new SentimentModelClient()
    this.aggregator = new SentimentAggregator()
    this.preprocessor = new TweetPreprocessor()
    this.redis = new Redis()
  }

  /**
   * Start the sentiment worker
   */
  async start(): Promise<void> {
    logger.info("Starting sentiment worker")
    this.isRunning = true

    // Check model health
    const modelHealthy = await this.modelClient.healthCheck()
    logger.info("Model health check", { healthy: modelHealthy })

    // Start batch aggregation timer
    this.startBatchTimer()

    // Main processing loop
    while (this.isRunning) {
      try {
        const tweet = await this.queue.dequeue()

        if (tweet) {
          await this.processTweet(tweet)
        }
      } catch (error: any) {
        logger.error("Processing error", { error: error.message })
        await this.sleep(1000)
      }
    }
  }

  /**
   * Stop the worker
   */
  stop(): void {
    logger.info("Stopping sentiment worker")
    this.isRunning = false
  }

  /**
   * Process a single tweet
   */
  private async processTweet(tweet: any): Promise<void> {
    const startTime = Date.now()

    try {
      // Lexicon-based analysis
      const lexiconResult = this.lexicon.analyze(tweet.text)

      // Model-based analysis (if available)
      const modelResult = await this.modelClient.predict(tweet.text)

      // Combine lexicon and model results
      const combinedSentiment = {
        value: lexiconResult.sentiment * 0.3 + modelResult.value * 0.7,
        confidence: Math.max(lexiconResult.confidence, modelResult.confidence),
        volatility: modelResult.volatility,
        labels: {
          fomo: (lexiconResult.fomo + modelResult.labels.fomo) / 2,
          fud: (lexiconResult.fud + modelResult.labels.fud) / 2,
          neutral: (lexiconResult.neutral + modelResult.labels.neutral) / 2,
        },
        timestamp: new Date(),
      }

      // Calculate author weight
      const authorWeight = this.preprocessor.calculateAuthorWeight(tweet)

      const processedTweet: ProcessedTweet = {
        ...tweet,
        sentiment: combinedSentiment,
        language: this.preprocessor.detectLanguage(tweet.text),
        isBot: this.preprocessor.detectBot(tweet),
        authorWeight,
      }

      // Add to batch buffer
      this.batchBuffer.push(processedTweet)

      // Process batch if full
      if (this.batchBuffer.length >= this.batchSize) {
        await this.processBatch()
      }

      const duration = Date.now() - startTime
      logger.debug("Tweet processed", {
        tweetId: tweet.id,
        sentiment: combinedSentiment.value.toFixed(3),
        duration,
      })
    } catch (error: any) {
      logger.error("Failed to process tweet", {
        error: error.message,
        tweetId: tweet.id,
      })
    }
  }

  /**
   * Process batch of tweets and aggregate
   */
  private async processBatch(): Promise<void> {
    if (this.batchBuffer.length === 0) return

    try {
      // Aggregate sentiment
      const mood = this.aggregator.aggregate(this.batchBuffer)

      // Store aggregated mood
      await this.storeMood(mood)

      logger.info("Batch processed", {
        tweets: this.batchBuffer.length,
        rawScore: mood.rawScore.toFixed(3),
        zScore: mood.zScore.toFixed(3),
      })

      // Clear buffer
      this.batchBuffer = []
    } catch (error: any) {
      logger.error("Batch processing failed", { error: error.message })
    }
  }

  /**
   * Store aggregated mood in Redis
   */
  private async storeMood(mood: AggregatedMood): Promise<void> {
    try {
      // Store latest mood
      await this.redis.set("mood:latest", JSON.stringify(mood))

      // Store in time series (for historical analysis)
      const key = `mood:history:${mood.timestamp.getTime()}`
      await this.redis.set(key, JSON.stringify(mood), "EX", 7 * 24 * 60 * 60) // 7 days

      // Add to sorted set for time-based queries
      await this.redis.zadd("mood:timeline", mood.timestamp.getTime(), key)
    } catch (error: any) {
      logger.error("Failed to store mood", { error: error.message })
    }
  }

  /**
   * Start timer for batch processing
   */
  private startBatchTimer(): void {
    setInterval(() => {
      if (this.batchBuffer.length > 0) {
        this.processBatch()
      }
    }, this.batchTimeoutMs)
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

// Run worker if executed directly
if (require.main === module) {
  const worker = new SentimentWorker()

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

export { SentimentWorker }
