/**
 * Ingestion worker - collects tweets and feeds them to the pipeline
 */

import { TwitterClient } from "./twitter-client"
import { TweetPreprocessor } from "./preprocessor"
import { TweetQueue } from "./queue"
import { config } from "@/lib/config"
import { logger } from "@/lib/logger"

class IngestionWorker {
  private twitterClient: TwitterClient
  private preprocessor: TweetPreprocessor
  private queue: TweetQueue
  private isRunning = false

  constructor() {
    this.twitterClient = new TwitterClient()
    this.preprocessor = new TweetPreprocessor()
    this.queue = new TweetQueue()
  }

  /**
   * Start the ingestion worker
   */
  async start(): Promise<void> {
    logger.info("Starting ingestion worker")
    this.isRunning = true

    // Build search query for crypto-related tweets
    const cryptoQuery = this.buildSearchQuery()

    // Main ingestion loop
    while (this.isRunning) {
      try {
        await this.ingestBatch(cryptoQuery)

        // Wait before next batch
        await this.sleep(60000) // 1 minute
      } catch (error: any) {
        logger.error("Ingestion error", { error: error.message })
        await this.sleep(5000) // Wait 5 seconds on error
      }
    }
  }

  /**
   * Stop the worker
   */
  stop(): void {
    logger.info("Stopping ingestion worker")
    this.isRunning = false
  }

  /**
   * Ingest a batch of tweets
   */
  private async ingestBatch(query: string): Promise<void> {
    const startTime = Date.now()

    try {
      // Search for recent tweets
      const tweets = await this.twitterClient.searchTweets(query, 100)

      logger.info("Fetched tweets", { count: tweets.length })

      // Process and enqueue each tweet
      for (const tweet of tweets) {
        try {
          // Preprocess
          const cleanedText = this.preprocessor.cleanText(tweet.text)
          const language = this.preprocessor.detectLanguage(cleanedText)
          const isBot = this.preprocessor.detectBot(tweet)

          // Skip non-English/Turkish or bot tweets
          if (!["en", "tr"].includes(language) || isBot) {
            logger.debug("Skipping tweet", {
              tweetId: tweet.id,
              language,
              isBot,
            })
            continue
          }

          // Extract crypto features
          const cryptoFeatures = this.preprocessor.extractCryptoFeatures(cleanedText)

          // Only process tweets with crypto keywords
          if (!cryptoFeatures.hasCryptoKeywords) {
            continue
          }

          // Enqueue for sentiment analysis
          await this.queue.enqueue({
            ...tweet,
            text: cleanedText,
          })
        } catch (error: any) {
          logger.error("Failed to process tweet", {
            error: error.message,
            tweetId: tweet.id,
          })
        }
      }

      const duration = Date.now() - startTime
      logger.info("Batch ingestion complete", {
        duration,
        tweetsProcessed: tweets.length,
      })
    } catch (error: any) {
      logger.error("Batch ingestion failed", { error: error.message })
      throw error
    }
  }

  /**
   * Build search query for crypto tweets
   */
  private buildSearchQuery(): string {
    const keywords = config.sentiment.cryptoLexicon.slice(0, 10) // Use top keywords
    const query = keywords.join(" OR ")

    // Add filters
    return `(${query}) -is:retweet -is:reply lang:en OR lang:tr`
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

// Run worker if executed directly
if (require.main === module) {
  const worker = new IngestionWorker()

  // Graceful shutdown
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

export { IngestionWorker }
